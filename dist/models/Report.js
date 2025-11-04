import mongoose, { Schema } from 'mongoose';
export var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "pending";
    ReportStatus["RESOLVED"] = "resolved";
    ReportStatus["REJECTED"] = "rejected";
})(ReportStatus || (ReportStatus = {}));
const ReportSchema = new Schema({
    location: {
        type: Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'ReportCategory',
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(ReportStatus),
        default: ReportStatus.PENDING
    },
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true
});
export default mongoose.model('Report', ReportSchema);
//# sourceMappingURL=Report.js.map