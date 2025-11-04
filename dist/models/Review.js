import mongoose, { Schema } from 'mongoose';
const ReviewSchema = new Schema({
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
}, {
    timestamps: true
});
// Ensure one review per user per location
ReviewSchema.index({ location: 1, user: 1 }, { unique: true });
export default mongoose.model('Review', ReviewSchema);
//# sourceMappingURL=Review.js.map