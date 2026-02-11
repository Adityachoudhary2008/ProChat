import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChat extends Document {
    chatName: string;
    isGroupChat: boolean;
    users: Types.ObjectId[];
    latestMessage?: Types.ObjectId;
    groupAdmin?: Types.ObjectId;
}

const chatSchema = new Schema<IChat>(
    {
        chatName: { type: String, trim: true },
        isGroupChat: { type: Boolean, default: false },
        users: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        latestMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        },
        groupAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

const Chat = mongoose.model<IChat>('Chat', chatSchema);
export default Chat;
