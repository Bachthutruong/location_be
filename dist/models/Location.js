import mongoose, { Schema } from 'mongoose';
export var LocationStatus;
(function (LocationStatus) {
    LocationStatus["PENDING"] = "pending";
    LocationStatus["APPROVED"] = "approved";
    LocationStatus["REJECTED"] = "rejected";
    LocationStatus["DELETED"] = "deleted";
})(LocationStatus || (LocationStatus = {}));
const LocationSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    province: {
        type: String,
        required: true,
        trim: true
    },
    district: {
        type: String,
        required: true,
        trim: true
    },
    street: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    googleMapsLink: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
            type: String,
            required: true
        }],
    manager: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(LocationStatus),
        default: LocationStatus.PENDING
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    }
}, {
    timestamps: true
});
export default mongoose.model('Location', LocationSchema);
//# sourceMappingURL=Location.js.map