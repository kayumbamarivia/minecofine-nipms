import mongoose, { Schema, Types } from 'mongoose';
import type { UserRole } from '../types.js';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  companyId: Types.ObjectId | null;
  title: string;
  isActive: boolean;
  emailVerified: boolean;
  mustChangePassword: boolean;
  emailVerificationTokenHash: string | null;
  emailVerificationExpires: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpires: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: [
        'company_submitter',
        'company_approver',
        'portfolio_analyst',
        'department_head',
        'leadership',
      ],
    },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    title: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);
