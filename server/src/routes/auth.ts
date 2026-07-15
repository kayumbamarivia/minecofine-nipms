import { Router } from 'express';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { authMiddleware, signToken, type AuthRequest } from '../middleware/auth.js';
import { toPublicUser } from '../serializers.js';
import { config } from '../config.js';
import {
  createSecureToken,
  hashPassword,
  hashToken,
  hoursFromNow,
  validatePasswordStrength,
  verifyPassword,
} from '../utils/password.js';
import {
  passwordResetEmail,
  sendEmail,
  verificationEmail,
} from '../utils/mail.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true });
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      error: 'Email address not verified. Check your inbox or request a new verification link.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  let companyName: string | null = null;
  if (user.companyId) {
    const company = await Company.findById(user.companyId).select('name');
    companyName = company?.name ?? null;
  }

  user.lastLoginAt = new Date();
  await user.save();

  const publicUser = toPublicUser(user, companyName);
  const token = signToken(publicUser);
  return res.json({ token, user: publicUser });
});

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

router.post('/verify-email', async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token?.trim()) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const tokenHash = hashToken(token.trim());
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: 'Verification link is invalid or has expired' });
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  return res.json({
    success: true,
    message: 'Email verified successfully. You may now sign in.',
  });
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true });
  // Always return the same message to avoid account enumeration
  const generic = {
    success: true,
    message: 'If that account exists and still needs verification, a link has been sent.',
  };

  if (!user || user.emailVerified) {
    return res.json(generic);
  }

  const { token, tokenHash } = createSecureToken();
  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = hoursFromNow(48);
  await user.save();

  const verifyUrl = `${config.appUrl}/?auth=verify&token=${token}`;
  const body = verificationEmail(user.fullName, verifyUrl);
  await sendEmail({ to: user.email, ...body });

  return res.json(generic);
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const generic = {
    success: true,
    message: 'If that account exists, password reset instructions have been sent.',
  };

  const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true });
  if (!user) {
    return res.json(generic);
  }

  const { token, tokenHash } = createSecureToken();
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpires = hoursFromNow(1);
  await user.save();

  const resetUrl = `${config.appUrl}/?auth=reset&token=${token}`;
  const body = passwordResetEmail(user.fullName, resetUrl);
  await sendEmail({ to: user.email, ...body });

  return res.json(generic);
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token?.trim() || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    return res.status(400).json({ error: strengthError });
  }

  const tokenHash = hashToken(token.trim());
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired' });
  }

  user.passwordHash = await hashPassword(password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.mustChangePassword = false;
  // Completing a reset proves mailbox access
  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  return res.json({
    success: true,
    message: 'Password updated. You may now sign in with your new password.',
  });
});

router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return res.status(400).json({ error: strengthError });
  }

  const user = await User.findById(req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  let companyName: string | null = null;
  if (user.companyId) {
    const company = await Company.findById(user.companyId).select('name');
    companyName = company?.name ?? null;
  }

  return res.json({
    success: true,
    user: toPublicUser(user, companyName),
    message: 'Password changed successfully',
  });
});

export default router;
