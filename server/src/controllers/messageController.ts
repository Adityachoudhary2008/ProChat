import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Message from '../models/messageModel';
import User from '../models/userModel';
import Chat from '../models/chatModel';

// @desc    Send a message
// @route   POST /api/message
// @access  Protected
export const sendMessage = asyncHandler(async (req: any, res: Response) => {
    const { content, chatId, image } = req.body;

    if ((!content && !image) || !chatId) {
        console.log('Invalid data passed into request');
        res.sendStatus(400);
        return;
    }

    var newMessage: any = {
        sender: req.user._id,
        content: content,
        image: image,
        chat: chatId,
    };

    try {
        var message: any = await Message.create(newMessage);

        message = await message.populate('sender', 'name profile');
        message = await message.populate('chat');
        message = await User.populate(message, {
            path: 'chat.users',
            select: 'name profile email',
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        res.json(message);
    } catch (error: any) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Fetch all messages for a chat
// @route   GET /api/message/:chatId
// @access  Protected
export const allMessages = asyncHandler(async (req: Request, res: Response) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate('sender', 'name profile email')
            .populate('chat');
        res.json(messages);
    } catch (error: any) {
        res.status(400);
        throw new Error(error.message);
    }
});
