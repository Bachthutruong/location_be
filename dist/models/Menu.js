import mongoose, { Schema } from 'mongoose';
const MenuSchema = new Schema({
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
}, {
    timestamps: true
});
// Index for efficient querying
MenuSchema.index({ parent: 1, order: 1 });
export default mongoose.model('Menu', MenuSchema);
//# sourceMappingURL=Menu.js.map