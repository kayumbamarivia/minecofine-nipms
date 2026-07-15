import mongoose, { Schema, Types } from 'mongoose';

export type ActionPointStatus = 'open' | 'in_progress' | 'resolved' | 'overdue';
export type ActionPointCategory = 'financial' | 'operational' | 'governance' | 'other';
export type ActionPointPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IActionPoint {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  submissionId: Types.ObjectId | null;
  title: string;
  description: string;
  category: ActionPointCategory;
  priority: ActionPointPriority;
  status: ActionPointStatus;
  dueDate: string;
  raisedBy: Types.ObjectId;
  assignedTo: string;
  resolutionNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const actionPointSchema = new Schema<IActionPoint>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['financial', 'operational', 'governance', 'other'],
      default: 'other',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'overdue'],
      default: 'open',
      index: true,
    },
    dueDate: { type: String, default: '' },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: String, default: '' },
    resolutionNote: { type: String, default: '' },
  },
  { timestamps: true },
);

export const ActionPoint = mongoose.model<IActionPoint>('ActionPoint', actionPointSchema);
