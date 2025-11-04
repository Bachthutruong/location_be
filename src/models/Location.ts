import mongoose, { Document, Schema } from 'mongoose';

export enum LocationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted'
}

export interface ILocation extends Document {
  name: string;
  category: mongoose.Types.ObjectId;
  province: string;
  district: string;
  street: string;
  address: string;
  phone?: string;
  googleMapsLink: string;
  description: string;
  images: string[];
  manager: mongoose.Types.ObjectId;
  status: LocationStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    province: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    street: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    googleMapsLink: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    images: [{
      type: String,
      required: true
    }],
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: Object.values(LocationStatus),
      default: LocationStatus.PENDING
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: {
      type: Date
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ILocation>('Location', LocationSchema);



