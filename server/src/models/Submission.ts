import mongoose, { Schema, Types } from 'mongoose';
import type { SubmissionStatus, SubmissionType, WorkflowStage } from '../types.js';

export interface ISubmission {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  type: SubmissionType;
  title: string;
  period: string;
  status: SubmissionStatus;
  workflowStage: WorkflowStage;
  payload: Record<string, unknown>;
  submittedBy: Types.ObjectId | null;
  reviewedBy: Types.ObjectId | null;
  comments: string;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'soe_creation',
        'profile_update',
        'planning_budgeting',
        'quarterly_report',
        'annual_report',
      ],
    },
    title: { type: String, required: true },
    period: { type: String, default: '' },
    status: {
      type: String,
      required: true,
      enum: [
        'draft',
        'pending_company_approval',
        'pending_ministry_review',
        'pending_department_approval',
        'approved',
        'returned',
      ],
      default: 'draft',
      index: true,
    },
    workflowStage: {
      type: String,
      enum: ['company', 'ministry', 'department', 'final'],
      default: 'company',
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    comments: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
