import mongoose, { Schema, Types } from 'mongoose';

export interface ICompany {
  _id: Types.ObjectId;
  code: string;
  name: string;
  sector: string;
  status: 'active' | 'inactive' | 'pending_registration';
  location: string;
  province: string;
  ministry: string;
  description: string;
  investmentAmount: number;
  ownershipPct: number;
  ceoName: string;
  cfoName: string;
  boardChair: string;
  establishedDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    sector: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending_registration'],
      default: 'active',
    },
    location: { type: String, default: '' },
    province: { type: String, default: '' },
    ministry: { type: String, default: 'MINECOFIN' },
    description: { type: String, default: '' },
    investmentAmount: { type: Number, default: 0 },
    ownershipPct: { type: Number, default: 100 },
    ceoName: { type: String, default: '' },
    cfoName: { type: String, default: '' },
    boardChair: { type: String, default: '' },
    establishedDate: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Company = mongoose.model<ICompany>('Company', companySchema);
