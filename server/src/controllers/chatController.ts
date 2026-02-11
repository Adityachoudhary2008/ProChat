import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Chat from '../models/chatModel';
import User from '../models/userModel';

// @desc    Access or create a one-on-one chat
// @route   POST /api/chat
// @access  Protected
export const accessChat = asyncHandler(async (req: any, res: Response) => {
    const { userId } = req.body;

    if (!userId) {
        res.status(400);
        throw new Error('UserId param not sent with request');
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate('users', '-password')
        .populate('latestMessage');

    isChat = await User.populate(isChat, {
        path: 'latestMessage.sender',
        select: 'name email profile',
    }) as any;

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            chatName: 'sender',
            isGroupChat: false,
            users: [req.user._id, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                'users',
                '-password'
            );
            res.status(200).json(FullChat);
        } catch (error: any) {
            res.status(400);
            throw new Error(error.message);
        }
    }
});

// @desc    Fetch all chats for a user
// @route   GET /api/chat
// @access  Protected
export const fetchChats = asyncHandler(async (req: any, res: Response) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate('users', '-password')
            .populate('groupAdmin', '-password')
            .populate('latestMessage')
            .sort({ updatedAt: -1 })
            .then(async (results: any) => {
                results = await User.populate(results, {
                    path: 'latestMessage.sender',
                    select: 'name email profile',
                });
                res.status(200).send(results);
            });
    } catch (error: any) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Create a group chat
// @route   POST /api/chat/group
// @access  Protected
export const createGroupChat = asyncHandler(async (req: any, res: Response) => {
    if (!req.body.users || !req.body.name) {
        res.status(400).send({ message: 'Please Fill all the fields' });
        return;
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        res
            .status(400)
            .send('More than 2 users are required to form a group chat');
        return;
    }

    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate('users', '-password')
            .populate('groupAdmin', '-password');

        res.status(200).json(fullGroupChat);
    } catch (error: any) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Rename a group
// @route   PUT /api/chat/rename
// @access  Protected
export const renameGroup = asyncHandler(async (req: Request, res: Response) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName: chatName,
        },
        {
            new: true,
        }
    )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

    if (!updatedChat) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(updatedChat);
    }
});

// @desc    Add user to group
// @route   PUT /api/chat/groupadd
// @access  Protected
export const addToGroup = asyncHandler(async (req: Request, res: Response) => {
    const { chatId, userId } = req.body;

    const added = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

    if (!added) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(added);
    }
});

// @desc    Remove user from group
// @route   PUT /api/chat/groupremove
// @access  Protected
export const removeFromGroup = asyncHandler(async (req: Request, res: Response) => {
    const { chatId, userId } = req.body;

    const removed = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

    if (!removed) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(removed);
    }
});
