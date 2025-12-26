import mongoose, { Schema } from 'mongoose';
const CourseRegistrationSchema = new Schema({
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
}, {
    timestamps: true
});
// Index for efficient querying
CourseRegistrationSchema.index({ news: 1, createdAt: -1 });
export default mongoose.model('CourseRegistration', CourseRegistrationSchema);
//# sourceMappingURL=CourseRegistration.js.map