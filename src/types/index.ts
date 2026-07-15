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

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  title?: string;
  companyId: string | null;
  companyName?: string | null;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
}

export interface ManagedUser extends AuthUser {
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  code: string;
  name: string;
  sector: string;
  status: string;
  location: string | null;
  province: string | null;
  ministry: string | null;
  description: string | null;
  investmentAmount: number | null;
  ownershipPct: number | null;
  ceoName: string | null;
  cfoName: string | null;
  boardChair: string | null;
  createdDate: string | null;
}

export interface Submission {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  type: SubmissionType;
  title: string;
  period: string | null;
  status: SubmissionStatus;
  workflowStage: string;
  payload: Record<string, unknown>;
  submittedBy: string | null;
  submittedByName: string | null;
  reviewedBy: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowEvent {
  id: string;
  submissionId: string;
  actorName: string;
  action: string;
  comment: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalCompanies: number;
  activeCompanies: number;
  pendingSubmissions: number;
  approvedThisQuarter: number;
  portfolioValue: number;
  submissionsByStatus: Record<string, number>;
  sectorAllocation: Array<{ name: string; value: number }>;
  companies: Array<{
    id: string;
    code: string;
    name: string;
    sector: string;
    investmentAmount: number;
    status: string;
  }>;
  recentSubmissions: Submission[];
}

export type PipelineStatus =
  | 'proposed'
  | 'review'
  | 'hod_approval'
  | 'ministerial_approval'
  | 'approved'
  | 'active';

export type InvestmentType =
  | 'new_investment'
  | 'existing_soe'
  | 'equity_injection'
  | 'acquisition';

export type ApprovalLevel = 'analyst' | 'hod' | 'minister';

export interface PipelineItem {
  id: string;
  companyName: string;
  sector: string;
  investmentAmount: number;
  status: PipelineStatus;
  investmentType: InvestmentType;
  stage: string;
  projectManager: string;
  nextActivity: string;
  nextActivityDate: string;
  approvalLevel: ApprovalLevel;
  approvedBy?: string;
  ownership?: number;
  documentCount?: number;
  ministry?: string;
  province?: string;
}

export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface Activity {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  relatedCompany: string;
  priority: ActivityPriority;
  status: ActivityStatus;
  category:
    | 'meeting'
    | 'board_appointment'
    | 'strategy_development'
    | 'board_charter'
    | 'funding_decision'
    | 'approval_process'
    | 'review'
    | 'follow_up';
  completedDate?: string;
}

export type DocumentStatus = 'not_started' | 'in_progress' | 'review' | 'completed';
export type DocumentType =
  | 'strategic_plan'
  | 'board_charter'
  | 'investment_memo'
  | 'valuation'
  | 'due_diligence'
  | 'term_sheet';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  progress: number;
  relatedDeal: string;
  assignedTo: string;
  dueDate: string;
  lastUpdated: string;
  version: string;
  approvalRequired: boolean;
  approvedBy?: string;
  fileSize?: string;
}

export type AppView =
  | 'dashboard'
  | 'portfolio'
  | 'submissions'
  | 'processes'
  | 'action-points'
  | 'documents'
  | 'reports'
  | 'users'
  | 'consolidated'
  | 'operations'
  | 'executive'
  | 'inter-ministerial';

export interface MinistryPartner {
  id: string;
  name: string;
  acronym: string;
  activeCollaborations: number;
  pendingApprovals: number;
  lastSync: string;
  status: 'connected' | 'pending' | 'offline';
}

export interface ActionPoint {
  id: string;
  companyId: string;
  companyName: string;
  submissionId: string | null;
  title: string;
  description: string;
  category: 'financial' | 'operational' | 'governance' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'overdue';
  dueDate: string | null;
  raisedBy: string;
  raisedByName: string;
  assignedTo: string;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StoredDocumentCategory =
  | 'business_case'
  | 'business_plan'
  | 'registration_certificate'
  | 'shareholder_agreement'
  | 'articles_of_association'
  | 'performance_contract'
  | 'budget_action_plan'
  | 'strategic_plan'
  | 'signed_financial_statements'
  | 'board_minutes'
  | 'investment_memo'
  | 'other';

export interface StoredDocument {
  id: string;
  companyId: string;
  companyName: string;
  submissionId: string | null;
  name: string;
  category: StoredDocumentCategory;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageDriver?: 'local' | 's3';
  notes: string | null;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}


