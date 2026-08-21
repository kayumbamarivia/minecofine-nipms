/**
 * OpenAPI 3.0 specification for the NIPMS API.
 * Served at /api/docs (Swagger UI) and /api/openapi.json (raw spec).
 */

const bearerAuth = [{ bearerAuth: [] }];

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
});

const jsonData = (schemaRef: string, description = 'Success') => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { data: { $ref: schemaRef } },
      },
    },
  },
});

const jsonDataArray = (schemaRef: string, description = 'Success') => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { data: { type: 'array', items: { $ref: schemaRef } } },
      },
    },
  },
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'MongoDB ObjectId',
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'NIPMS API',
    version: '0.1.0',
    description:
      'National Investment Portfolio Management System — Ministry of Finance and Economic Planning (MINECOFIN), Republic of Rwanda.\n\n' +
      'Government equity investment portfolio oversight: SOE registry, submission workflows (company → ministry → department), ' +
      'financial statements with automated ratios and red flags, action points, documents, and reporting.\n\n' +
      'Documents are stored in MongoDB GridFS. Email is sent via SMTP when `SMTP_*` is set; otherwise links are printed in the API console.\n\n' +
      '**Authentication:** obtain a JWT via `POST /api/auth/login`, then click **Authorize** and paste the token.',
    contact: { name: 'MINECOFIN Portfolio Oversight' },
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'Health', description: 'Service status' },
    { name: 'Auth', description: 'Login, email verification, password management' },
    { name: 'Users', description: 'Account provisioning (ministry roles only — no public signup)' },
    { name: 'Companies', description: 'SOE registry' },
    { name: 'Submissions', description: 'Business process packages and the approval workflow' },
    { name: 'Dashboard', description: 'Aggregated portfolio metrics' },
    { name: 'Action Points', description: 'Ministry follow-ups raised against companies' },
    { name: 'Documents', description: 'Company document folders stored in MongoDB GridFS' },
    { name: 'Reports', description: 'Ad hoc reporting and CSV extracts' },
    { name: 'Imports', description: 'Excel/CSV financial statement import' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /api/auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Invalid email or password' },
          code: { type: 'string', nullable: true, example: 'EMAIL_NOT_VERIFIED' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      UserRole: {
        type: 'string',
        enum: [
          'company_submitter',
          'company_approver',
          'portfolio_analyst',
          'department_head',
          'leadership',
        ],
      },
      SubmissionType: {
        type: 'string',
        enum: [
          'soe_creation',
          'profile_update',
          'planning_budgeting',
          'quarterly_report',
          'annual_report',
        ],
      },
      SubmissionStatus: {
        type: 'string',
        enum: [
          'draft',
          'pending_company_approval',
          'pending_ministry_review',
          'pending_department_approval',
          'approved',
          'returned',
        ],
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          role: { $ref: '#/components/schemas/UserRole' },
          title: { type: 'string' },
          companyId: { type: 'string', nullable: true },
          companyName: { type: 'string', nullable: true },
          emailVerified: { type: 'boolean' },
          mustChangePassword: { type: 'boolean' },
        },
      },
      ManagedUser: {
        allOf: [
          { $ref: '#/components/schemas/AuthUser' },
          {
            type: 'object',
            properties: {
              isActive: { type: 'boolean' },
              lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      Company: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string', example: 'REG' },
          name: { type: 'string', example: 'Rwanda Energy Group (REG)' },
          sector: { type: 'string', example: 'Energy & Power' },
          status: { type: 'string', example: 'active' },
          location: { type: 'string', nullable: true },
          province: { type: 'string', nullable: true },
          ministry: { type: 'string', nullable: true, example: 'MININFRA' },
          description: { type: 'string', nullable: true },
          investmentAmount: { type: 'number', description: 'RWF' },
          ownershipPct: { type: 'number', example: 100 },
          ceoName: { type: 'string', nullable: true },
          cfoName: { type: 'string', nullable: true },
          boardChair: { type: 'string', nullable: true },
          createdDate: { type: 'string', nullable: true },
        },
      },
      Submission: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          companyId: { type: 'string' },
          companyName: { type: 'string' },
          companyCode: { type: 'string' },
          type: { $ref: '#/components/schemas/SubmissionType' },
          title: { type: 'string' },
          period: { type: 'string', nullable: true, example: 'Q2 2026' },
          status: { $ref: '#/components/schemas/SubmissionStatus' },
          workflowStage: { type: 'string', example: 'ministry' },
          payload: {
            type: 'object',
            description:
              'Package data: financialStatements, operationalMetrics, governanceMetrics, documentChecklist, ratios (auto-computed)',
          },
          submittedBy: { type: 'string', nullable: true },
          submittedByName: { type: 'string', nullable: true },
          reviewedBy: { type: 'string', nullable: true },
          comments: { type: 'string', nullable: true, description: 'Reviewer comment when returned' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkflowEvent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          submissionId: { type: 'string' },
          actorName: { type: 'string' },
          action: { type: 'string', example: 'approved' },
          comment: { type: 'string', nullable: true },
          fromStatus: { type: 'string', nullable: true },
          toStatus: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ActionPoint: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          companyId: { type: 'string' },
          companyName: { type: 'string' },
          submissionId: { type: 'string', nullable: true },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: ['financial', 'operational', 'governance', 'other'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'overdue'] },
          dueDate: { type: 'string', nullable: true },
          raisedBy: { type: 'string' },
          raisedByName: { type: 'string' },
        },
      },
      StoredDocument: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          companyId: { type: 'string' },
          companyName: { type: 'string' },
          submissionId: { type: 'string', nullable: true },
          name: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              'business_case',
              'business_plan',
              'registration_certificate',
              'shareholder_agreement',
              'articles_of_association',
              'performance_contract',
              'budget_action_plan',
              'strategic_plan',
              'signed_financial_statements',
              'board_minutes',
              'investment_memo',
              'other',
            ],
          },
          originalName: { type: 'string' },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'number' },
          storageDriver: { type: 'string', enum: ['gridfs'] },
          notes: { type: 'string', nullable: true },
          uploadedBy: { type: 'string' },
          uploadedByName: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      FinancialStatements: {
        type: 'object',
        description: 'All monetary values in RWF',
        properties: {
          revenue: { type: 'number' },
          costOfSales: { type: 'number' },
          operatingExpenses: { type: 'number' },
          interestExpense: { type: 'number' },
          taxExpense: { type: 'number' },
          currentAssets: { type: 'number' },
          nonCurrentAssets: { type: 'number' },
          currentLiabilities: { type: 'number' },
          nonCurrentLiabilities: { type: 'number' },
          equity: { type: 'number' },
          operatingCashFlow: { type: 'number' },
          investingCashFlow: { type: 'number' },
          financingCashFlow: { type: 'number' },
        },
      },
      FinancialRatios: {
        type: 'object',
        properties: {
          grossProfit: { type: 'number' },
          ebitda: { type: 'number' },
          netIncome: { type: 'number' },
          totalAssets: { type: 'number' },
          totalLiabilities: { type: 'number' },
          grossMarginPct: { type: 'number', nullable: true },
          ebitdaMarginPct: { type: 'number', nullable: true },
          netMarginPct: { type: 'number', nullable: true },
          currentRatio: { type: 'number', nullable: true },
          debtToEquity: { type: 'number', nullable: true },
          returnOnEquityPct: { type: 'number', nullable: true },
          returnOnAssetsPct: { type: 'number', nullable: true },
          redFlags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health, storage, and mail mode',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'nipms-api' },
                    version: { type: 'string' },
                    environment: { type: 'string' },
                    appUrl: { type: 'string', example: 'http://localhost:5173' },
                    storage: {
                      type: 'object',
                      properties: {
                        driver: { type: 'string', enum: ['gridfs'], example: 'gridfs' },
                        bucket: { type: 'string', example: 'nipms_files' },
                      },
                    },
                    mail: {
                      type: 'object',
                      properties: {
                        mode: { type: 'string', enum: ['smtp', 'console'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with email and password',
        description: 'Returns a JWT. Fails with 403 EMAIL_NOT_VERIFIED until the email is verified.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'portfolio.analyst@minecofin.gov.rw' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/AuthUser' },
                  },
                },
              },
            },
          },
          400: errorResponse('Missing email or password'),
          401: errorResponse('Invalid credentials'),
          403: errorResponse('Email not verified (code EMAIL_NOT_VERIFIED)'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current authenticated user',
        security: bearerAuth,
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/AuthUser' } },
                },
              },
            },
          },
          401: errorResponse('Missing or invalid token'),
        },
      },
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email address with a one-time token',
        description: 'Token comes from the invite/verification email link (48-hour expiry).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Email verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          400: errorResponse('Invalid or expired token'),
        },
      },
    },
    '/api/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the verification email',
        description: 'Always returns a generic message to prevent account enumeration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Generic acknowledgement', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          400: errorResponse('Email is required'),
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset link',
        description: 'Reset link is valid for 1 hour. Generic response prevents account enumeration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Generic acknowledgement', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          400: errorResponse('Email is required'),
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set a new password with a reset token',
        description: 'Password policy: minimum 10 characters, uppercase, lowercase, and a number.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          400: errorResponse('Invalid/expired token or weak password'),
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password changed',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Message' },
                    { type: 'object', properties: { user: { $ref: '#/components/schemas/AuthUser' } } },
                  ],
                },
              },
            },
          },
          400: errorResponse('Wrong current password or weak new password'),
          401: errorResponse('Not authenticated'),
        },
      },
    },

    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List all accounts',
        description: 'Ministry roles only (portfolio_analyst, department_head, leadership).',
        security: bearerAuth,
        responses: {
          200: jsonDataArray('#/components/schemas/ManagedUser'),
          401: errorResponse('Not authenticated'),
          403: errorResponse('Insufficient permissions'),
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Provision a new account (no public signup)',
        description:
          'Sends an invite with a temporary password and a 48-hour verification link. ' +
          'Company roles require companyId. Only HoD/Leadership may create senior ministry accounts.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'fullName', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  fullName: { type: 'string' },
                  role: { $ref: '#/components/schemas/UserRole' },
                  title: { type: 'string' },
                  companyId: { type: 'string', nullable: true, description: 'Required for company roles' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonData('#/components/schemas/ManagedUser', 'Account created and invite sent'),
          400: errorResponse('Validation error'),
          403: errorResponse('Insufficient permissions for this role'),
          409: errorResponse('Email already exists'),
        },
      },
    },
    '/api/users/{id}': {
      patch: {
        tags: ['Users'],
        summary: 'Update an account (name, title, role, company, active status)',
        security: bearerAuth,
        parameters: [idParam],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  title: { type: 'string' },
                  isActive: { type: 'boolean' },
                  role: { $ref: '#/components/schemas/UserRole' },
                  companyId: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: jsonData('#/components/schemas/ManagedUser'),
          400: errorResponse('Validation error / cannot deactivate own account'),
          403: errorResponse('Insufficient permissions'),
          404: errorResponse('User not found'),
        },
      },
    },
    '/api/users/{id}/resend-invite': {
      post: {
        tags: ['Users'],
        summary: 'Resend the verification invite',
        security: bearerAuth,
        parameters: [idParam],
        responses: {
          200: { description: 'Invite resent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          404: errorResponse('User not found'),
        },
      },
    },

    '/api/companies': {
      get: {
        tags: ['Companies'],
        summary: 'List companies (company users see only their own SOE)',
        security: bearerAuth,
        responses: {
          200: jsonDataArray('#/components/schemas/Company'),
          401: errorResponse('Not authenticated'),
        },
      },
      post: {
        tags: ['Companies'],
        summary: 'Create a company record directly (portfolio analyst only)',
        description: 'Normally SOE creation goes through the soe_creation submission workflow instead.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'name', 'sector'],
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  sector: { type: 'string' },
                  location: { type: 'string' },
                  province: { type: 'string' },
                  ministry: { type: 'string' },
                  description: { type: 'string' },
                  investmentAmount: { type: 'number' },
                  ownershipPct: { type: 'number' },
                  ceoName: { type: 'string' },
                  cfoName: { type: 'string' },
                  boardChair: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonData('#/components/schemas/Company'),
          400: errorResponse('Code, name, and sector are required'),
          403: errorResponse('Analyst role required'),
          409: errorResponse('Company code already exists'),
        },
      },
    },
    '/api/companies/{id}': {
      get: {
        tags: ['Companies'],
        summary: 'Get one company',
        security: bearerAuth,
        parameters: [idParam],
        responses: {
          200: jsonData('#/components/schemas/Company'),
          403: errorResponse('Access denied (other company)'),
          404: errorResponse('Company not found'),
        },
      },
      patch: {
        tags: ['Companies'],
        summary: 'Update company fields (portfolio analyst only)',
        security: bearerAuth,
        parameters: [idParam],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', description: 'Any subset of company fields' },
            },
          },
        },
        responses: {
          200: jsonData('#/components/schemas/Company'),
          403: errorResponse('Analyst role required'),
          404: errorResponse('Company not found'),
        },
      },
    },

    '/api/submissions': {
      get: {
        tags: ['Submissions'],
        summary: 'List submissions visible to the current role',
        security: bearerAuth,
        responses: { 200: jsonDataArray('#/components/schemas/Submission') },
      },
      post: {
        tags: ['Submissions'],
        summary: 'Create a draft package (any business process)',
        description:
          'type=soe_creation is analyst-only and also creates the pending company record. ' +
          'Company packages (profile_update, planning_budgeting, quarterly_report, annual_report) are created by company submitters or analysts.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'title'],
                properties: {
                  companyId: { type: 'string' },
                  type: { $ref: '#/components/schemas/SubmissionType' },
                  title: { type: 'string' },
                  period: { type: 'string', example: 'Q2 2026' },
                  payload: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonData('#/components/schemas/Submission'),
          400: errorResponse('Validation error'),
          403: errorResponse('Role not allowed for this type'),
        },
      },
    },
    '/api/submissions/{id}': {
      patch: {
        tags: ['Submissions'],
        summary: 'Update a draft/returned package before (re)submitting',
        security: bearerAuth,
        parameters: [idParam],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  period: { type: 'string' },
                  payload: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonData('#/components/schemas/Submission'),
          403: errorResponse('Not editable at this stage / by this role'),
          404: errorResponse('Submission not found'),
        },
      },
    },
    '/api/submissions/{id}/submit': {
      post: {
        tags: ['Submissions'],
        summary: 'Submit a draft into the approval chain',
        description:
          'Company packages → pending_company_approval. SOE creation (analyst) → pending_department_approval.',
        security: bearerAuth,
        parameters: [idParam],
        responses: {
          200: jsonData('#/components/schemas/Submission'),
          403: errorResponse('Cannot submit at this stage'),
          404: errorResponse('Submission not found'),
        },
      },
    },
    '/api/submissions/{id}/approve': {
      post: {
        tags: ['Submissions'],
        summary: 'Approve at the current stage',
        description:
          'company_approver: pending_company_approval → pending_ministry_review. ' +
          'portfolio_analyst: pending_ministry_review → pending_department_approval. ' +
          'department_head: pending_department_approval → approved (registry effects applied).',
        security: bearerAuth,
        parameters: [idParam],
        responses: {
          200: jsonData('#/components/schemas/Submission'),
          403: errorResponse('You cannot approve at this stage'),
          404: errorResponse('Submission not found'),
        },
      },
    },
    '/api/submissions/{id}/return': {
      post: {
        tags: ['Submissions'],
        summary: 'Return for revision with a mandatory comment',
        security: bearerAuth,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['comment'],
                properties: { comment: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: jsonData('#/components/schemas/Submission'),
          400: errorResponse('Comment required'),
          403: errorResponse('Cannot return at this stage'),
          404: errorResponse('Submission not found'),
        },
      },
    },
    '/api/submissions/{id}/events': {
      get: {
        tags: ['Submissions'],
        summary: 'Workflow audit trail for a submission',
        security: bearerAuth,
        parameters: [idParam],
        responses: { 200: jsonDataArray('#/components/schemas/WorkflowEvent') },
      },
    },

    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Aggregated portfolio metrics for the dashboard',
        security: bearerAuth,
        responses: {
          200: {
            description: 'Summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        totalCompanies: { type: 'number' },
                        activeCompanies: { type: 'number' },
                        portfolioValue: { type: 'number', description: 'RWF' },
                        pendingSubmissions: { type: 'number' },
                        approvedThisQuarter: { type: 'number' },
                        submissionsByStatus: { type: 'object', additionalProperties: { type: 'number' } },
                        sectorAllocation: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: { sector: { type: 'string' }, value: { type: 'number' } },
                          },
                        },
                        companies: { type: 'array', items: { $ref: '#/components/schemas/Company' } },
                        recentSubmissions: { type: 'array', items: { $ref: '#/components/schemas/Submission' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/action-points': {
      get: {
        tags: ['Action Points'],
        summary: 'List action points (company users see their own company only)',
        security: bearerAuth,
        responses: { 200: jsonDataArray('#/components/schemas/ActionPoint') },
      },
      post: {
        tags: ['Action Points'],
        summary: 'Raise an action point against a company (ministry roles)',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['companyId', 'title'],
                properties: {
                  companyId: { type: 'string' },
                  submissionId: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string', enum: ['financial', 'operational', 'governance', 'other'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                  dueDate: { type: 'string', format: 'date' },
                  assignedTo: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonData('#/components/schemas/ActionPoint'),
          400: errorResponse('Validation error'),
          403: errorResponse('Ministry role required'),
        },
      },
    },
    '/api/action-points/{id}': {
      patch: {
        tags: ['Action Points'],
        summary: 'Update an action point (status, priority, description...)',
        security: bearerAuth,
        parameters: [idParam],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', description: 'Any subset of action point fields' },
            },
          },
        },
        responses: {
          200: jsonData('#/components/schemas/ActionPoint'),
          404: errorResponse('Action point not found'),
        },
      },
    },

    '/api/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List documents (optionally filter by company)',
        security: bearerAuth,
        parameters: [
          {
            name: 'companyId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Ministry users may filter; company users are always scoped to their own SOE',
          },
        ],
        responses: {
          200: {
            description: 'Document list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/StoredDocument' } },
                    storage: {
                      type: 'object',
                      properties: {
                        driver: { type: 'string', enum: ['gridfs'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Documents'],
        summary: 'Upload a document into a company folder',
        description:
          'Multipart form. Allowed: PDF, Office, CSV, text, images. Max 25 MB. ' +
          'The file is stored in MongoDB GridFS in the same database as the rest of NIPMS ' +
          '(local Mongo or Atlas). Download, preview, and delete use the same `/api/documents` routes.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'companyId', 'name', 'category'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  companyId: { type: 'string' },
                  submissionId: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonData('#/components/schemas/StoredDocument'),
          400: errorResponse('Missing file / invalid type'),
          403: errorResponse('Access denied'),
          404: errorResponse('Company not found'),
        },
      },
    },
    '/api/documents/{id}/download': {
      get: {
        tags: ['Documents'],
        summary: 'Download the original file',
        security: bearerAuth,
        parameters: [idParam],
        responses: {
          200: {
            description: 'File stream (Content-Disposition: attachment)',
            content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
          },
          403: errorResponse('Access denied'),
          404: errorResponse('Document or file missing'),
        },
      },
    },
    '/api/documents/{id}': {
      delete: {
        tags: ['Documents'],
        summary: 'Delete a document (uploader, analyst, or HoD)',
        security: bearerAuth,
        parameters: [idParam],
        responses: {
          200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          403: errorResponse('Insufficient permissions'),
          404: errorResponse('Document not found'),
        },
      },
    },

    '/api/reports/company/{companyId}': {
      get: {
        tags: ['Reports'],
        summary: 'Company performance summary (JSON or CSV)',
        security: bearerAuth,
        parameters: [
          { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'format',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['csv'] },
            description: 'Set format=csv to download a CSV extract',
          },
        ],
        responses: {
          200: {
            description: 'Summary with approved report history and ratios (or CSV file)',
            content: {
              'application/json': { schema: { type: 'object', properties: { data: { type: 'object' } } } },
              'text/csv': { schema: { type: 'string' } },
            },
          },
          404: errorResponse('Company not found'),
        },
      },
    },
    '/api/reports/portfolio-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Consolidated portfolio summary (ministry roles; JSON or CSV)',
        security: bearerAuth,
        parameters: [
          {
            name: 'format',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['csv'] },
          },
        ],
        responses: {
          200: {
            description: 'Portfolio-wide summary (or CSV file)',
            content: {
              'application/json': { schema: { type: 'object', properties: { data: { type: 'object' } } } },
              'text/csv': { schema: { type: 'string' } },
            },
          },
          403: errorResponse('Ministry role required'),
        },
      },
    },

    '/api/imports/financial-template': {
      get: {
        tags: ['Imports'],
        summary: 'Download the blank financial statement CSV template',
        security: bearerAuth,
        responses: {
          200: {
            description: 'CSV template (Field,Value rows)',
            content: { 'text/csv': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/api/imports/financial-statements': {
      post: {
        tags: ['Imports'],
        summary: 'Parse an Excel/CSV workbook into financial statement fields',
        description:
          'Accepts .xlsx/.xls/.csv (max 10 MB). Supports Field/Value rows or wide headers (Revenue, Cost of Sales...). ' +
          'Returns mapped statements plus auto-computed ratios and red flags — Business Process 4 dual input.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Parsed statements and ratios',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        financialStatements: { $ref: '#/components/schemas/FinancialStatements' },
                        ratios: { $ref: '#/components/schemas/FinancialRatios' },
                        mappedFields: { type: 'array', items: { type: 'string' } },
                        unmappedHeaders: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse('No file / unrecognised columns / parse failure'),
        },
      },
    },
    '/api/imports/annual-template': {
      get: {
        tags: ['Imports'],
        summary: 'Download the official annual financial statements workbook',
        security: bearerAuth,
        responses: {
          200: {
            description: 'Excel workbook (Cover, Trial Balance, statements, notes, KPIs)',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: errorResponse('Template file not available on the server'),
        },
      },
    },
    '/api/imports/quarterly-template': {
      get: {
        tags: ['Imports'],
        summary: 'Download the official quarterly financial statements workbook',
        security: bearerAuth,
        responses: {
          200: {
            description: 'Excel workbook',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: errorResponse('Template file not available on the server'),
        },
      },
    },
    '/api/imports/financial-pack': {
      post: {
        tags: ['Imports'],
        summary: 'Parse a filled statements workbook into the full reporting pack',
        description:
          'Accepts the MINECOFIN annual or quarterly workbook (.xlsx, max 10 MB) and returns cover details, ' +
          'trial balance accounts, balance sheet / income / cash flow / equity line amounts and KPI rows for ' +
          'auto-filling the reporting form. Mode is auto-detected from the amount column headings when omitted.',
        security: bearerAuth,
        parameters: [
          {
            name: 'mode',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['annual', 'quarterly'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  mode: { type: 'string', enum: ['annual', 'quarterly'] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Parsed statement pack',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        packType: { type: 'string', enum: ['annual', 'quarterly'] },
                        amountKeys: { type: 'array', items: { type: 'string' } },
                        cover: { type: 'object' },
                        trialBalance: { type: 'array', items: { type: 'object' } },
                        balanceSheet: { type: 'object' },
                        incomeStatement: { type: 'object' },
                        cashFlow: { type: 'object' },
                        changesInEquity: { type: 'object' },
                        operationalKpis: { type: 'array', items: { type: 'object' } },
                        governanceKpis: { type: 'array', items: { type: 'object' } },
                        mappedLines: { type: 'integer' },
                        sheetsFound: { type: 'array', items: { type: 'string' } },
                        warnings: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse('No file / unreadable workbook / no lines matched'),
        },
      },
    },
  },
} as const;
