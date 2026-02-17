import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel';
import generateToken from '../utils/generateToken';

// ... (existing authUser, registerUser, getUserProfile) - I need to keep them! 
// Wait, overwrite will delete them. I should use append or rewrite the whole file carefully.
// I will rewrite the whole file including the new function.

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id as unknown as string, user.role),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        role: role || 'student'
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id as unknown as string, user.role),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req: any, res: Response) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile: user.profile
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Get all users (search)
// @route   GET /api/user?search=
// @access  Protected
export const allUsers = asyncHandler(async (req: any, res: Response) => {
    const keyword = req.query.search
        ? {
            $or: [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
            ],
        }
        : {};

    const users = await User.findById(keyword).find({ _id: { $ne: req.user._id } });
    res.send(users);
});

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: any, res: Response) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Update profile fields
    if (req.body.profile) {
        user.profile = {
            ...user.profile,
            ...req.body.profile
        };
    }

    const updatedUser = await user.save();
    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profile: updatedUser.profile
    });
});

// @desc    Get user settings
// @route   GET /api/user/settings
// @access  Private
export const getSettings = asyncHandler(async (req: any, res: Response) => {
    const user = await User.findById(req.user._id).select('settings');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.json(user);
});

// @desc    Update user settings
// @route   PUT /api/user/settings
// @access  Private
export const updateSettings = asyncHandler(async (req: any, res: Response) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Update settings
    if (req.body.settings) {
        user.settings = {
            ...user.settings,
            ...req.body.settings
        };
    }

    const updatedUser = await user.save();
    res.json({
        _id: updatedUser._id,
        settings: updatedUser.settings
    });
});
