import type { ICompany } from './models/Company.js';
import type { ISubmission } from './models/Submission.js';
import type { IUser } from './models/User.js';
import type { UserRole } from './types.js';

export function toPublicUser(user: IUser, companyName?: string | null) {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role as UserRole,
    title: user.title,
    companyId: user.companyId ? user.companyId.toString() : null,
    companyName: companyName ?? null,
    emailVerified: Boolean(user.emailVerified),
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

export function toManagedUserDto(user: IUser, companyName?: string | null) {
  return {
    ...toPublicUser(user, companyName),
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toCompanyDto(company: ICompany) {
  return {
    id: company._id.toString(),
    code: company.code,
    name: company.name,
    sector: company.sector,
    status: company.status,
    location: company.location || null,
    province: company.province || null,
    ministry: company.ministry || null,
    description: company.description || null,
    investmentAmount: company.investmentAmount ?? 0,
    ownershipPct: company.ownershipPct ?? 100,
    ceoName: company.ceoName || null,
    cfoName: company.cfoName || null,
    boardChair: company.boardChair || null,
    createdDate: company.establishedDate || null,
  };
}

export function toSubmissionDto(
  submission: ISubmission & {
    companyName?: string;
    companyCode?: string;
    submittedByName?: string | null;
  },
) {
  return {
    id: submission._id.toString(),
    companyId: submission.companyId.toString(),
    companyName: submission.companyName ?? '',
    companyCode: submission.companyCode ?? '',
    type: submission.type,
    title: submission.title,
    period: submission.period || null,
    status: submission.status,
    workflowStage: submission.workflowStage,
    payload: submission.payload ?? {},
    submittedBy: submission.submittedBy ? submission.submittedBy.toString() : null,
    submittedByName: submission.submittedByName ?? null,
    reviewedBy: submission.reviewedBy ? submission.reviewedBy.toString() : null,
    comments: submission.comments || null,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}
