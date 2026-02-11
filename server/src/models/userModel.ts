import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'student' | 'teacher' | 'hr' | 'admin';
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
    matchPassword: (enteredPassword: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'hr', 'admin'], default: 'student' },
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
    }
}, {
    timestamps: true
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
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
