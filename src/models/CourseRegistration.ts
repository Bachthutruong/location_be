import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseRegistration extends Document {
  news: mongoose.Types.ObjectId; // Reference to News (course)
  name: string; // Name of the registrant
  email: string;
  phone: string;
  note?: string; // Optional note/comment
  createdAt: Date;
  updatedAt: Date;
}

const CourseRegistrationSchema = new Schema<ICourseRegistration>(
  {
    news: {
      type: Schema.Types.ObjectId,
      ref: 'News',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying
CourseRegistrationSchema.index({ news: 1, createdAt: -1 });

export default mongoose.model<ICourseRegistration>('CourseRegistration', CourseRegistrationSchema);

