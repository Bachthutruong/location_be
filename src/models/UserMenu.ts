import mongoose, { Document, Schema } from 'mongoose';

export interface IUserMenu extends Document {
  user: mongoose.Types.ObjectId;
  menu: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserMenuSchema = new Schema<IUserMenu>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    menu: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure one menu can only be assigned once per user
UserMenuSchema.index({ user: 1, menu: 1 }, { unique: true });

export default mongoose.model<IUserMenu>('UserMenu', UserMenuSchema);

