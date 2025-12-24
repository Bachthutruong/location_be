import mongoose, { Schema } from 'mongoose';
const NewsCategorySchema = new Schema({
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
}, {
    timestamps: true
});
export default mongoose.model('NewsCategory', NewsCategorySchema);
//# sourceMappingURL=NewsCategory.js.map