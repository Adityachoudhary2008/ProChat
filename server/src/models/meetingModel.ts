import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMeeting extends Document {
    host: Types.ObjectId;
    participants: Types.ObjectId[];
    startTime: Date;
    endTime?: Date;
    isActive: boolean;
    meetingId: string; // Unique readable ID for joining
}

const meetingSchema = new Schema<IMeeting>(
    {
        host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        startTime: { type: Date, default: Date.now },
        endTime: { type: Date },
        isActive: { type: Boolean, default: true },
        meetingId: { type: String, required: true, unique: true },
    },
    {
        timestamps: true,
    }
);

const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
export default Meeting;
