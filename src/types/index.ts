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

export type UserRole = 'admin' | 'company';

export type AppView =
  | 'dashboard'
  | 'portfolio'
  | 'activities'
  | 'documents'
  | 'data-entry'
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
