import mongoose, { Document, Schema } from 'mongoose';

export interface IMenu extends Document {
  name: string;
  link: string;
  parent?: mongoose.Types.ObjectId;
  order: number;
  isGlobal: boolean; // true for global menu (all users), false for user-specific
  userId?: mongoose.Types.ObjectId; // for user-specific menus
  createdAt: Date;
  updatedAt: Date;
}

const MenuSchema = new Schema<IMenu>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    link: {
      type: String,
      required: true,
      trim: true
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
      default: null
    },
    order: {
      type: Number,
      default: 0
    },
    isGlobal: {
      type: Boolean,
      default: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying
MenuSchema.index({ parent: 1, order: 1 });

export default mongoose.model<IMenu>('Menu', MenuSchema);

