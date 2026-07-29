import { api, getToken } from './api';
import type {
  ActionPoint,
  ActionPointAssignee,
  AuthUser,
  Company,
  DashboardSummary,
  StoredDocument,
  StoredDocumentCategory,
  Submission,
  SubmissionType,
  UserRole,
  WorkflowEvent,
  ManagedUser,
} from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<{ user: AuthUser }>('/auth/me'),
  verifyEmail: (token: string) =>
    api<{ success: boolean; message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  resendVerification: (email: string) =>
    api<{ success: boolean; message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  forgotPassword: (email: string) =>
    api<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    api<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ success: boolean; message: string; user: AuthUser }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export const companiesApi = {
  list: () => api<{ data: Company[] }>('/companies'),
  get: (id: string) => api<{ data: Company }>(`/companies/${id}`),
};

export const submissionsApi = {
  list: () => api<{ data: Submission[] }>('/submissions'),
  create: (body: {
    companyId?: string;
    type: SubmissionType;
    title: string;
    period?: string;
    payload?: Record<string, unknown>;
  }) =>
    api<{ data: Submission }>('/submissions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: {
      title?: string;
      period?: string;
      payload?: Record<string, unknown>;
    },
  ) =>
    api<{ data: Submission }>(`/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  submit: (id: string) =>
    api<{ data: Submission }>(`/submissions/${id}/submit`, { method: 'POST' }),
  approve: (id: string) =>
    api<{ data: Submission }>(`/submissions/${id}/approve`, { method: 'POST' }),
  return: (id: string, comment: string) =>
    api<{ data: Submission }>(`/submissions/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  events: (id: string) => api<{ data: WorkflowEvent[] }>(`/submissions/${id}/events`),
  updateEventComment: (submissionId: string, eventId: string, comment: string) =>
    api<{ data: WorkflowEvent }>(`/submissions/${submissionId}/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ comment }),
    }),
  addFeedback: (id: string, comment: string) =>
    api<{ data: WorkflowEvent }>(`/submissions/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  updateActiveComment: (id: string, comment: string) =>
    api<{ data: Submission }>(`/submissions/${id}/comments`, {
      method: 'PATCH',
      body: JSON.stringify({ comment }),
    }),
};

export const dashboardApi = {
  summary: () => api<{ data: DashboardSummary }>('/dashboard/summary'),
};

export const actionPointsApi = {
  list: () => api<{ data: ActionPoint[] }>('/action-points'),
  assignees: () => api<{ data: ActionPointAssignee[] }>('/action-points/assignees'),
  create: (body: {
    companyId: string;
    submissionId?: string;
    title: string;
    description?: string;
    category?: ActionPoint['category'];
    priority?: ActionPoint['priority'];
    dueDate?: string;
    assignmentType: ActionPoint['assignmentType'];
    assignedAnalystId?: string;
  }) =>
    api<{ data: ActionPoint }>('/action-points', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<ActionPoint>) =>
    api<{ data: ActionPoint }>(`/action-points/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export const documentsApi = {
  list: (companyId?: string) =>
    api<{ data: StoredDocument[]; storage?: { driver: string } }>(
      `/documents${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`,
    ),
  listForSubmission: (submissionId: string) =>
    api<{ data: StoredDocument[]; storage?: { driver: string } }>(
      `/documents?submissionId=${encodeURIComponent(submissionId)}`,
    ),
  upload: async (form: FormData) => {
    const token = getToken();
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Upload failed');
    }
    return response.json() as Promise<{ data: StoredDocument }>;
  },
  downloadUrl: (id: string) => `/api/documents/${id}/download`,
  previewUrl: (id: string) => `/api/documents/${id}/preview`,
  remove: (id: string) => api<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
};

export const reportsApi = {
  companySummary: (companyId: string) =>
    api<{ data: Record<string, unknown> }>(`/reports/company/${companyId}`),
  portfolioSummary: () => api<{ data: Record<string, unknown> }>('/reports/portfolio-summary'),
  companyCsvUrl: (companyId: string) => `/api/reports/company/${companyId}?format=csv`,
  portfolioCsvUrl: () => '/api/reports/portfolio-summary?format=csv',
};

export interface ImportedContractObjective {
  id: string;
  objective: string;
  description: string;
}

export interface ImportedContractKpi {
  kpi: string;
  baseline: string;
  target: string;
  actual: string;
  score: string;
  narrative: string;
}

export interface ImportedPerformanceContract {
  companyName: string;
  financialYear: string;
  contractDate: string;
  mandateStatement: string;
  strategicObjectives: ImportedContractObjective[];
  financialKpis: ImportedContractKpi[];
  operationalKpis: ImportedContractKpi[];
  governanceKpis: ImportedContractKpi[];
  overallPerformanceRating:
    | ''
    | 'below_expectations'
    | 'meets_expectations'
    | 'exceeds_expectations';
  chairmanNarrative: {
    keyAchievements: string;
    keyChallengesRisks: string;
    forwardLookingPriorities: string;
  };
}

export type FinancialPackMode = 'annual' | 'quarterly';

export interface ParsedPackTrialBalanceRow {
  glCode: string;
  accountDescription: string;
  noteRef: string;
  mapsTo: string;
  statementRow: string;
  source: string;
  amounts: Record<string, number>;
}

export interface ParsedPackKpiRow {
  key: string;
  label: string;
  priorYear: string;
  current: string;
  ytd: string;
  target: string;
  notes: string;
}

export interface ParsedFinancialPack {
  packType: FinancialPackMode;
  amountKeys: string[];
  cover: {
    companyName: string;
    sector: string;
    financialYear: string;
    reportingPeriod: string;
    preparedByName: string;
    authorizedByName: string;
  };
  trialBalance: ParsedPackTrialBalanceRow[];
  balanceSheet: Record<string, Record<string, number>>;
  incomeStatement: Record<string, Record<string, number>>;
  cashFlow: Record<string, Record<string, number>>;
  changesInEquity: Record<string, Record<string, number>>;
  operationalKpis: ParsedPackKpiRow[];
  governanceKpis: ParsedPackKpiRow[];
  mappedLines: number;
  sheetsFound: string[];
  warnings: string[];
}

export const importsApi = {
  financialTemplateUrl: () => '/api/imports/financial-template',
  annualTemplateUrl: () => '/api/imports/annual-template',
  quarterlyTemplateUrl: () => '/api/imports/quarterly-template',
  parseFinancialPack: async (file: File, mode: FinancialPackMode) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    const response = await fetch(`/api/imports/financial-pack?mode=${mode}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Workbook import failed');
    }
    return response.json() as Promise<{ data: ParsedFinancialPack }>;
  },
  parseFinancialStatements: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/imports/financial-statements', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Spreadsheet import failed');
    }
    return response.json() as Promise<{
      data: {
        financialStatements: Record<string, number>;
        mappedFields: string[];
        unmappedHeaders: string[];
      };
    }>;
  },
  parsePerformanceContract: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/imports/performance-contract', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Performance contract import failed');
    }
    return response.json() as Promise<{ data: ImportedPerformanceContract }>;
  },
};

export const usersApi = {
  list: () => api<{ data: ManagedUser[] }>('/users'),
  create: (body: {
    email: string;
    fullName: string;
    role: UserRole;
    title?: string;
    companyId?: string | null;
  }) =>
    api<{
      data: ManagedUser;
      message: string;
      invite?: { emailDelivery: string; temporaryPassword?: string };
    }>('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<{ fullName: string; title: string; isActive: boolean; role: UserRole; companyId: string | null }>) =>
    api<{ data: ManagedUser }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  resendInvite: (id: string) =>
    api<{ success: boolean; message: string; emailDelivery: string }>(`/users/${id}/resend-invite`, {
      method: 'POST',
    }),
};

export type { StoredDocumentCategory };
