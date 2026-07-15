import mongoose, { Schema, Types } from 'mongoose';

export type DocumentCategory =
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

export interface IDocument {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  submissionId: Types.ObjectId | null;
  name: string;
  category: DocumentCategory;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  storageDriver: 'local' | 's3';
  uploadedBy: Types.ObjectId;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', default: null, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      required: true,
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
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storagePath: { type: String, required: true },
    storageDriver: { type: String, enum: ['local', 's3'], default: 'local' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

export const DocumentFile = mongoose.model<IDocument>('DocumentFile', documentSchema);
