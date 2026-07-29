import type { AuthUser, Company, PipelineItem, SubmissionStatus, UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  company_submitter: 'Company Data Submitter',
  company_approver: 'Company Approver',
  portfolio_analyst: 'Portfolio Analyst',
  department_head: 'Head of Department',
  leadership: 'Leadership',
};

export const ROLE_SHORT: Record<UserRole, string> = {
  company_submitter: 'Data Submitter',
  company_approver: 'Company Approver',
  portfolio_analyst: 'Portfolio Analyst',
  department_head: 'Head of Department',
  leadership: 'Leadership',
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  pending_company_approval: 'Pending Company Approval',
  pending_ministry_review: 'Pending Ministry Review',
  pending_department_approval: 'Pending Department Approval',
  approved: 'Approved',
  returned: 'Returned for Revision',
};

export const STATUS_COLORS: Record<SubmissionStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  pending_company_approval: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_ministry_review: 'bg-amber-50 text-amber-700 border-amber-200',
  pending_department_approval: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  returned: 'bg-red-50 text-red-700 border-red-200',
};

export function isMinistryRole(role: UserRole) {
  return ['portfolio_analyst', 'department_head', 'leadership'].includes(role);
}

export function isCompanyRole(role: UserRole) {
  return ['company_submitter', 'company_approver'].includes(role);
}

export function canCreateSubmission(role: UserRole) {
  return role === 'company_submitter' || role === 'portfolio_analyst';
}

export function canApproveSubmission(role: UserRole, status: SubmissionStatus) {
  const map: Partial<Record<UserRole, SubmissionStatus[]>> = {
    company_approver: ['pending_company_approval'],
    portfolio_analyst: ['pending_ministry_review'],
    department_head: ['pending_department_approval'],
  };
  return map[role]?.includes(status) ?? false;
}

export function canSubmitSubmission(role: UserRole, status: SubmissionStatus, type?: string) {
  if (role === 'company_submitter' && ['draft', 'returned'].includes(status)) return true;
  if (
    role === 'portfolio_analyst' &&
    type === 'soe_creation' &&
    ['draft', 'returned'].includes(status)
  ) {
    return true;
  }
  return false;
}

export function canReturnSubmission(role: UserRole, status: SubmissionStatus) {
  return canApproveSubmission(role, status);
}

/** Reviewers who may clarify or adjust feedback comments on a package. */
export function canEditSubmissionFeedback(role: UserRole) {
  return ['company_approver', 'portfolio_analyst', 'department_head'].includes(role);
}

export function canViewLeadershipDashboards(role: UserRole) {
  return ['department_head', 'leadership', 'portfolio_analyst'].includes(role);
}

export function companyToPipelineItem(company: Company): PipelineItem {
  return {
    id: company.id,
    companyName: company.name,
    sector: company.sector,
    investmentAmount: company.investmentAmount ?? 0,
    status: company.status === 'active' ? 'active' : 'review',
    investmentType: 'existing_soe',
    stage: company.description?.slice(0, 48) ?? 'Portfolio entity',
    projectManager: company.cfoName ?? company.ceoName ?? '—',
    nextActivity: 'Review quarterly submission',
    nextActivityDate: new Date().toISOString().split('T')[0],
    approvalLevel: 'minister',
    ownership: company.ownershipPct ?? 100,
    documentCount: 0,
    ministry: company.ministry ?? undefined,
    province: company.province ?? undefined,
  };
}

export function greetingFor(user: AuthUser) {
  return `${user.fullName} — ${ROLE_SHORT[user.role]}`;
}

export function approvalLevelFor(role: UserRole): 'analyst' | 'hod' | 'minister' {
  if (role === 'department_head' || role === 'leadership') return 'minister';
  if (role === 'portfolio_analyst') return 'hod';
  return 'analyst';
}
