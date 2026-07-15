import { Router } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { authMiddleware, requireRoles, type AuthRequest } from '../middleware/auth.js';
import { toManagedUserDto } from '../serializers.js';
import { config } from '../config.js';
import type { UserRole } from '../types.js';
import {
  createSecureToken,
  generateTemporaryPassword,
  hashPassword,
  hoursFromNow,
} from '../utils/password.js';
import { inviteEmail, sendEmail, verificationEmail } from '../utils/mail.js';

const COMPANY_ROLES: UserRole[] = ['company_submitter', 'company_approver'];
const ALL_ROLES: UserRole[] = [
  'company_submitter',
  'company_approver',
  'portfolio_analyst',
  'department_head',
  'leadership',
];

const router = Router();
router.use(authMiddleware);
router.use(requireRoles('portfolio_analyst', 'department_head', 'leadership'));

router.get('/', async (_req, res) => {
  const rows = await User.find().sort({ createdAt: -1 });
  const companyIds = [
    ...new Set(rows.filter((u) => u.companyId).map((u) => u.companyId!.toString())),
  ];
  const companies = await Company.find({ _id: { $in: companyIds } }).select('name');
  const companyMap = new Map(companies.map((c) => [c._id.toString(), c.name]));

  return res.json({
    data: rows.map((u) =>
      toManagedUserDto(u, u.companyId ? companyMap.get(u.companyId.toString()) ?? null : null),
    ),
  });
});

/**
 * Provision an authorised account — no public self-signup.
 * Sends invite + verification email (SMTP or console in local/dev).
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { email, fullName, role, title, companyId } = req.body as {
      email?: string;
      fullName?: string;
      role?: UserRole;
      title?: string;
      companyId?: string | null;
    };

    if (!email?.trim() || !fullName?.trim() || !role) {
      return res.status(400).json({ error: 'Email, full name and role are required' });
    }

    if (!ALL_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Only leadership / HoD may create other ministry leadership accounts
    if (
      (role === 'leadership' || role === 'department_head') &&
      req.user!.role === 'portfolio_analyst'
    ) {
      return res.status(403).json({
        error: 'Only Head of Department or Leadership can create senior ministry accounts',
      });
    }

    let resolvedCompanyId: Types.ObjectId | null = null;
    if (COMPANY_ROLES.includes(role)) {
      if (!companyId || !Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ error: 'Company is required for company roles' });
      }
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      resolvedCompanyId = company._id;
    } else if (companyId) {
      return res.status(400).json({ error: 'Ministry roles must not be tied to a company' });
    }

    const normalisedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalisedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const { token, tokenHash } = createSecureToken();

    const user = await User.create({
      email: normalisedEmail,
      passwordHash: await hashPassword(temporaryPassword),
      fullName: fullName.trim(),
      role,
      title: title?.trim() || '',
      companyId: resolvedCompanyId,
      isActive: true,
      emailVerified: false,
      mustChangePassword: true,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: hoursFromNow(48),
    });

    const verifyUrl = `${config.appUrl}/?auth=verify&token=${token}`;
    const body = inviteEmail(user.fullName, user.email, temporaryPassword, verifyUrl);
    const delivery = await sendEmail({ to: user.email, ...body });

    const companyName = resolvedCompanyId
      ? (await Company.findById(resolvedCompanyId).select('name'))?.name ?? null
      : null;

    return res.status(201).json({
      data: toManagedUserDto(user, companyName),
      invite: {
        emailDelivery: delivery.mode,
        // Temporary password only returned in console-mode local installs for operator convenience
        temporaryPassword: delivery.mode === 'console' ? temporaryPassword : undefined,
      },
      message:
        delivery.mode === 'console'
          ? 'User created. Invite logged to API console (SMTP not configured).'
          : 'User created. Invite email sent.',
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to create user',
    });
  }
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user._id.toString() === req.user!.id && req.body.isActive === false) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  const { fullName, title, isActive, role, companyId } = req.body as {
    fullName?: string;
    title?: string;
    isActive?: boolean;
    role?: UserRole;
    companyId?: string | null;
  };

  if (typeof fullName === 'string' && fullName.trim()) user.fullName = fullName.trim();
  if (typeof title === 'string') user.title = title.trim();
  if (typeof isActive === 'boolean') user.isActive = isActive;

  if (role && ALL_ROLES.includes(role)) {
    if (
      (role === 'leadership' || role === 'department_head') &&
      req.user!.role === 'portfolio_analyst'
    ) {
      return res.status(403).json({ error: 'Insufficient permissions to assign this role' });
    }
    user.role = role;
    if (COMPANY_ROLES.includes(role)) {
      if (!companyId || !Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ error: 'Company is required for company roles' });
      }
      user.companyId = new Types.ObjectId(companyId);
    } else {
      user.companyId = null;
    }
  }

  await user.save();

  const companyName = user.companyId
    ? (await Company.findById(user.companyId).select('name'))?.name ?? null
    : null;

  return res.json({ data: toManagedUserDto(user, companyName) });
});

router.post('/:id/resend-invite', async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const user = await User.findById(id);
  if (!user || !user.isActive) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { token, tokenHash } = createSecureToken();
  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = hoursFromNow(48);
  await user.save();

  const verifyUrl = `${config.appUrl}/?auth=verify&token=${token}`;
  const body = verificationEmail(user.fullName, verifyUrl);
  const delivery = await sendEmail({ to: user.email, ...body });

  return res.json({
    success: true,
    emailDelivery: delivery.mode,
    message:
      delivery.mode === 'console'
        ? 'Verification link logged to API console'
        : 'Verification email sent',
  });
});

export default router;
