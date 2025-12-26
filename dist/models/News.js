import mongoose, { Schema } from 'mongoose';
const NewsSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'NewsCategory',
        required: true
    },
    images: {
        type: [String],
        default: []
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    published: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date
    },
    isCourse: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
export default mongoose.model('News', NewsSchema);
//# sourceMappingURL=News.js.map