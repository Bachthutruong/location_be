import mongoose, { Document, Schema } from 'mongoose';

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected'
}

export interface IReport extends Document {
  location: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  description: string;
  reportedBy: mongoose.Types.ObjectId;
  status: ReportStatus;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'ReportCategory',
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IReport>('Report', ReportSchema);



