/**
 * Official role model aligned to MINECOFIN portfolio oversight.
 *
 * Company side:
 * - company_submitter  → CFO / Director of Finance / Chief Legal Officer (enter & submit)
 * - company_approver   → CEO / Board member (review & approve for ministry)
 *
 * Ministry side:
 * - portfolio_analyst  → Analyst / Specialist (company profile, review, analysis, return)
 * - department_head    → Head of Department (final approval before reports are final)
 * - leadership         → Minister and senior leadership (view reports & dashboards)
 */
export type UserRole =
  | 'company_submitter'
  | 'company_approver'
  | 'portfolio_analyst'
  | 'department_head'
  | 'leadership';

export type SubmissionType =
  | 'soe_creation'
  | 'profile_update'
  | 'planning_budgeting'
  | 'quarterly_report'
  | 'annual_report';

export type SubmissionStatus =
  | 'draft'
  | 'pending_company_approval'
  | 'pending_ministry_review'
  | 'pending_department_approval'
  | 'approved'
  | 'returned';

export type WorkflowStage = 'company' | 'ministry' | 'department' | 'final';
