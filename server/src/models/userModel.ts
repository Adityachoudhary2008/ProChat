import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'student' | 'teacher' | 'hr' | 'admin';
    avatar?: string;
    profile: {
        bio?: string;
        skills: string[];
        education: {
            degree: string;
            institution: string;
            year: string;
        }[];
        projects: {
            title: string;
            description: string;
            link?: string;
        }[];
    };
    settings?: {
        privacy: {
            showLastSeen: boolean;
            showProfilePhoto: boolean;
            showOnlineStatus: boolean;
        };
        notifications: {
            messageNotifications: boolean;
            callNotifications: boolean;
            emailNotifications: boolean;
        };
        appearance: {
            theme: 'light' | 'dark' | 'auto';
            language: string;
        };
    };
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    isVerified: boolean;
    emailVerificationToken?: string;
    googleId?: string;
    githubId?: string;
    matchPassword: (enteredPassword: string) => Promise<boolean>;
    getResetPasswordToken: () => string;
    getEmailVerificationToken: () => string;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'hr', 'admin'], default: 'student' },
    avatar: { type: String },
    profile: {
        bio: { type: String },
        skills: [{ type: String }],
        education: [{
            degree: String,
            institution: String,
            year: String
        }],
        projects: [{
            title: String,
            description: String,
            link: String
        }]
    },
    settings: {
        privacy: {
            showLastSeen: { type: Boolean, default: true },
            showProfilePhoto: { type: Boolean, default: true },
            showOnlineStatus: { type: Boolean, default: true }
        },
        notifications: {
            messageNotifications: { type: Boolean, default: true },
            callNotifications: { type: Boolean, default: true },
            emailNotifications: { type: Boolean, default: false }
        },
        appearance: {
            theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
            language: { type: String, default: 'en' }
        }
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    googleId: String,
    githubId: String
}, {
    timestamps: true
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

userSchema.methods.getEmailVerificationToken = function () {
    const verificationToken = crypto.randomBytes(20).toString('hex');

    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    return verificationToken;
};


userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;
