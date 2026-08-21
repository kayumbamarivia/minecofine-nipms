import bcrypt from 'bcryptjs';
import './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { Company } from './models/Company.js';
import { Submission } from './models/Submission.js';
import { User } from './models/User.js';
import { WorkflowEvent } from './models/WorkflowEvent.js';
import type { UserRole } from './types.js';
import { BCRYPT_ROUNDS, validatePasswordStrength } from './utils/password.js';

/**
 * Bootstrap script for local / staging environments.
 * Loads the initial SOE registry and authorised ministry/company accounts.
 * Password comes from BOOTSTRAP_PASSWORD in server/.env — never hardcode secrets in commits.
 */
async function seed() {
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!password || password.length < 10) {
    console.error(
      'Refusing to seed: set BOOTSTRAP_PASSWORD in server/.env (minimum 10 characters).',
    );
    process.exit(1);
  }

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    console.error(`Refusing to seed: ${strengthError}`);
    process.exit(1);
  }

  await connectDatabase();

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(
      `Database already has ${existingUsers} user(s). Skipping seed so production data stays intact.`,
    );
    console.log('Set FORCE_SEED=true only if you intend to wipe and replace all NIPMS data.');
    await disconnectDatabase();
    return;
  }

  await Promise.all([
    WorkflowEvent.deleteMany({}),
    Submission.deleteMany({}),
    User.deleteMany({}),
    Company.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const companyDocs = await Company.insertMany([
    {
      code: 'REG',
      name: 'Rwanda Energy Group (REG)',
      sector: 'Energy & Power',
      status: 'active',
      location: 'Kigali',
      province: 'National',
      ministry: 'MININFRA',
      description:
        'National electricity generation, transmission and distribution utility serving the Government of Rwanda.',
      investmentAmount: 48_500_000_000,
      ownershipPct: 100,
      ceoName: 'Chief Executive Officer — REG',
      cfoName: 'Director of Finance — REG',
      boardChair: 'Chairperson of the Board — REG',
      establishedDate: '2014-07-01',
    },
    {
      code: 'RWAIR',
      name: 'RwandAir Ltd',
      sector: 'Aviation & Transport',
      status: 'active',
      location: 'Kigali',
      province: 'Kigali',
      ministry: 'MINECOFIN',
      description: 'National flag carrier providing passenger and cargo air transport services.',
      investmentAmount: 22_000_000_000,
      ownershipPct: 100,
      ceoName: 'Chief Executive Officer — RwandAir',
      cfoName: 'Director of Finance — RwandAir',
      boardChair: 'Chairperson of the Board — RwandAir',
      establishedDate: '2002-04-01',
    },
    {
      code: 'WASAC',
      name: 'Water & Sanitation Corporation (WASAC)',
      sector: 'Water & Sanitation',
      status: 'active',
      location: 'Kigali',
      province: 'Eastern Province',
      ministry: 'MININFRA',
      description: 'Water supply and sanitation services corporation for Rwanda.',
      investmentAmount: 35_200_000_000,
      ownershipPct: 100,
      ceoName: 'Chief Executive Officer — WASAC',
      cfoName: 'Director of Finance — WASAC',
      boardChair: 'Chairperson of the Board — WASAC',
      establishedDate: '2010-01-01',
    },
    {
      code: 'BRD',
      name: 'Development Bank of Rwanda (BRD)',
      sector: 'Financial Services',
      status: 'active',
      location: 'Kigali',
      province: 'Kigali',
      ministry: 'MINECOFIN',
      description: 'Development finance institution supporting SME and infrastructure financing.',
      investmentAmount: 15_800_000_000,
      ownershipPct: 100,
      ceoName: 'Chief Executive Officer — BRD',
      cfoName: 'Director of Finance — BRD',
      boardChair: 'Chairperson of the Board — BRD',
      establishedDate: '1967-01-01',
    },
    {
      code: 'RISA',
      name: 'Rwanda Information Society Authority (RISA)',
      sector: 'Digital Infrastructure',
      status: 'active',
      location: 'Kigali',
      province: 'Kigali',
      ministry: 'MINICT',
      description: 'Authority responsible for digital government and national ICT infrastructure.',
      investmentAmount: 8_400_000_000,
      ownershipPct: 100,
      ceoName: 'Chief Executive Officer — RISA',
      cfoName: 'Director of Finance — RISA',
      boardChair: 'Chairperson of the Board — RISA',
      establishedDate: '2016-01-01',
    },
    {
      code: 'RSSB',
      name: 'Rwanda Social Security Board (RSSB)',
      sector: 'Social Protection',
      status: 'active',
      location: 'Kigali',
      province: 'National',
      ministry: 'MINECOFIN',
      description: 'Social security and pension fund administration for Rwanda.',
      investmentAmount: 12_600_000_000,
      ownershipPct: 100,
      ceoName: 'Chief Executive Officer — RSSB',
      cfoName: 'Director of Finance — RSSB',
      boardChair: 'Chairperson of the Board — RSSB',
      establishedDate: '2010-01-01',
    },
  ]);

  const byCode = Object.fromEntries(companyDocs.map((c) => [c.code, c]));

  const users: Array<{
    email: string;
    fullName: string;
    role: UserRole;
    title: string;
    companyCode?: string;
  }> = [
    {
      email: 'finance.director@reg.rw',
      fullName: 'Director of Finance',
      role: 'company_submitter',
      title: 'Director of Finance',
      companyCode: 'REG',
    },
    {
      email: 'ceo@reg.rw',
      fullName: 'Chief Executive Officer',
      role: 'company_approver',
      title: 'Chief Executive Officer',
      companyCode: 'REG',
    },
    {
      email: 'portfolio.analyst@minecofin.gov.rw',
      fullName: 'Portfolio Analyst',
      role: 'portfolio_analyst',
      title: 'Portfolio Analyst — SOE Oversight',
    },
    {
      email: 'hod.portfolio@minecofin.gov.rw',
      fullName: 'Head of Department',
      role: 'department_head',
      title: 'Head of Department — Portfolio Oversight',
    },
    {
      email: 'office.minister@minecofin.gov.rw',
      fullName: 'Office of the Minister',
      role: 'leadership',
      title: 'Office of the Minister of Finance and Economic Planning',
    },
  ];

  for (const u of users) {
    await User.create({
      email: u.email,
      passwordHash,
      fullName: u.fullName,
      role: u.role,
      title: u.title,
      companyId: u.companyCode ? byCode[u.companyCode]._id : null,
      isActive: true,
      emailVerified: true,
      mustChangePassword: false,
    });
  }

  const submitter = await User.findOne({ email: 'finance.director@reg.rw' });
  const analyst = await User.findOne({ email: 'portfolio.analyst@minecofin.gov.rw' });

  // Seed a small set of in-flight workflow records so the approval chain is usable from day one.
  const samples = [
    {
      companyCode: 'REG',
      type: 'quarterly_report' as const,
      title: 'Q2 2026 Quarterly Financial Report',
      period: 'Q2 2026',
      status: 'pending_ministry_review' as const,
      workflowStage: 'ministry' as const,
      payload: {
        revenue: 9_500_000_000,
        ebitda: 2_100_000_000,
        governanceScore: 94,
        operationalMetrics: { gridReliability: 96.2, renewableMix: 68 },
      },
      submittedBy: submitter?._id,
    },
    {
      companyCode: 'WASAC',
      type: 'quarterly_report' as const,
      title: 'Q2 2026 Quarterly Report',
      period: 'Q2 2026',
      status: 'returned' as const,
      workflowStage: 'company' as const,
      payload: {
        revenue: 3_700_000_000,
        ebitda: 820_000_000,
        governanceScore: 89,
      },
      submittedBy: submitter?._id,
      comments:
        'Please attach signed board minutes for the previous quarter before resubmission.',
    },
    {
      companyCode: 'BRD',
      type: 'quarterly_report' as const,
      title: 'Q2 2026 Quarterly Financial Statements',
      period: 'Q2 2026',
      status: 'approved' as const,
      workflowStage: 'final' as const,
      payload: {
        revenue: 3_250_000_000,
        ebitda: 1_140_000_000,
        governanceScore: 96,
      },
      submittedBy: submitter?._id,
    },
    {
      companyCode: 'RISA',
      type: 'soe_creation' as const,
      title: 'SOE Registration — National Data Centre Expansion Entity',
      period: '',
      status: 'pending_company_approval' as const,
      workflowStage: 'company' as const,
      payload: {
        proposedCode: 'NDCE',
        sector: 'Digital Infrastructure',
      },
      submittedBy: analyst?._id,
    },
  ];

  for (const s of samples) {
    const submission = await Submission.create({
      companyId: byCode[s.companyCode]._id,
      type: s.type,
      title: s.title,
      period: s.period,
      status: s.status,
      workflowStage: s.workflowStage,
      payload: s.payload,
      submittedBy: s.submittedBy ?? null,
      comments: s.comments ?? '',
    });

    if (s.submittedBy) {
      await WorkflowEvent.create({
        submissionId: submission._id,
        actorId: s.submittedBy,
        action: 'created',
        fromStatus: '',
        toStatus: s.status,
        comment: '',
      });
    }
  }

  console.log('Bootstrap complete.');
  console.log('Accounts created (use BOOTSTRAP_PASSWORD from server/.env):');
  for (const u of users) {
    console.log(`  ${u.email} — ${u.role}`);
  }

  await disconnectDatabase();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
