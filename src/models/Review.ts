import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  location: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure one review per user per location
ReviewSchema.index({ location: 1, user: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', ReviewSchema);



