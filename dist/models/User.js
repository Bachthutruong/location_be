import mongoose, { Schema } from 'mongoose';
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["STAFF"] = "staff";
    UserRole["MANAGER"] = "manager";
    UserRole["USER"] = "user";
})(UserRole || (UserRole = {}));
const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.USER
    }
}, {
    timestamps: true
});
export default mongoose.model('User', UserSchema);
//# sourceMappingURL=User.js.map