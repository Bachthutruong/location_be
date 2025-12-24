import mongoose, { Schema } from 'mongoose';
const UserMenuSchema = new Schema({
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
}, {
    timestamps: true
});
// Ensure one menu can only be assigned once per user
UserMenuSchema.index({ user: 1, menu: 1 }, { unique: true });
export default mongoose.model('UserMenu', UserMenuSchema);
//# sourceMappingURL=UserMenu.js.map