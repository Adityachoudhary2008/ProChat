import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/userModel';

const configurePassport = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID || '',
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
                callbackURL: '/api/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                const { id, displayName, emails, photos } = profile;
                const email = emails?.[0]?.value;

                try {
                    let user = await User.findOne({
                        $or: [{ googleId: id }, { email }]
                    });

                    if (user) {
                        if (!user.googleId) {
                            user.googleId = id;
                            await user.save();
                        }
                        return done(null, user);
                    }

                    user = await User.create({
                        name: displayName,
                        email: email,
                        googleId: id,
                        avatar: photos?.[0]?.value,
                        isVerified: true, // OAuth emails are usually verified
                        password: Math.random().toString(36).slice(-10), // Random password for OAuth users
                    });

                    return done(null, user);
                } catch (err) {
                    return done(err as Error);
                }
            }
        )
    );

    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID || '',
                clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
                callbackURL: '/api/auth/github/callback',
            },
            async (accessToken: string, refreshToken: string, profile: any, done: any) => {
                const { id, displayName, username, emails, photos } = profile;
                const email = emails?.[0]?.value;

                try {
                    let user = await User.findOne({
                        $or: [{ githubId: id }, { email }]
                    });

                    if (user) {
                        if (!user.githubId) {
                            user.githubId = id;
                            await user.save();
                        }
                        return done(null, user);
                    }

                    user = await User.create({
                        name: displayName || username,
                        email: email,
                        githubId: id,
                        avatar: photos?.[0]?.value,
                        isVerified: true,
                        password: Math.random().toString(36).slice(-10),
                    });

                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};

export default configurePassport;
