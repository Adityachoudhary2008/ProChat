import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Meeting from '../models/meetingModel';
import { v4 as uuidv4 } from 'uuid';

// @desc    Create a new meeting
// @route   POST /api/meeting
// @access  Protected
export const createMeeting = asyncHandler(async (req: any, res: Response) => {
    const meetingId = uuidv4();

    const meeting = await Meeting.create({
        host: req.user._id,
        participants: [req.user._id],
        meetingId: meetingId,
    });

    res.status(201).json(meeting);
});

// @desc    Join a meeting (verify ID)
// @route   GET /api/meeting/:meetingId
// @access  Protected
export const getMeeting = asyncHandler(async (req: any, res: Response) => {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (meeting && meeting.isActive) {
        // Add user to participants if not already there
        if (!meeting.participants.includes(req.user._id)) {
            meeting.participants.push(req.user._id);
            await meeting.save();
        }
        res.json(meeting);
    } else {
        res.status(404);
        throw new Error('Meeting not found or ended');
    }
});
