import mongoose, { Schema } from 'mongoose';
const ReportCategorySchema = new Schema({
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
export default mongoose.model('ReportCategory', ReportCategorySchema);
//# sourceMappingURL=ReportCategory.js.map