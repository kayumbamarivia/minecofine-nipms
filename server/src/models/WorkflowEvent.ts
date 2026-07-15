import mongoose, { Schema, Types } from 'mongoose';

export interface IWorkflowEvent {
  _id: Types.ObjectId;
  submissionId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  comment: string;
  fromStatus: string;
  toStatus: string;
  createdAt: Date;
}

const workflowEventSchema = new Schema<IWorkflowEvent>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    comment: { type: String, default: '' },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const WorkflowEvent = mongoose.model<IWorkflowEvent>('WorkflowEvent', workflowEventSchema);
