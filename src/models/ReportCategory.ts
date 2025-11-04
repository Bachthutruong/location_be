import mongoose, { Document, Schema } from 'mongoose';

export interface IReportCategory extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportCategorySchema = new Schema<IReportCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IReportCategory>('ReportCategory', ReportCategorySchema);



