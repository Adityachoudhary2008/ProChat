import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel';
import generateToken from '../utils/generateToken';
import sendEmail from '../utils/sendEmail';
import crypto from 'crypto';

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
        // Get verification token
        const verificationToken = user.getEmailVerificationToken();
        await user.save({ validateBeforeSave: false });

        // Create verification url
        const verificationUrl = `${req.protocol}://${req.get('host')}/verify-email/${verificationToken}`;

        const message = `Please confirm your email by clicking the following link: \n\n ${verificationUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'ProChat Email Verification',
                message,
            });

            res.status(201).json({
                success: true,
                message: 'Registration successful! Please check your email to verify your account.',
            });
        } catch (err) {
            console.log(err);
            res.status(201).json({
                success: true,
                message: 'Registration successful, but verification email could not be sent. Please contact support.',
            });
        }
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Verify email
// @route   GET /api/user/verify-email/:verificationtoken
// @access  Public
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    // Get hashed token
    const emailVerificationToken = crypto
        .createHash('sha256')
        .update(req.params.verificationtoken)
        .digest('hex');

    const user = await User.findOne({ emailVerificationToken });

    if (!user) {
        res.status(400);
        throw new Error('Invalid verification token');
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
        token: generateToken(user._id as unknown as string, user.role),
    });
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

// @desc    Forgot password
// @route   POST /api/user/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        res.status(404);
        throw new Error('There is no user with that email');
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url (Frontend URL)
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please use the following link to reset your password: \n\n ${resetToken} \n\n Link: ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'ProChat Password Reset',
            message,
        });

        res.status(200).json({ success: true, message: 'Reset email sent' });
    } catch (err) {
        console.log(err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Reset password
// @route   PUT /api/user/reset-password/:resettoken
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired token');
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password reset successful',
        token: generateToken(user._id as unknown as string, user.role),
    });
});
