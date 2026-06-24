import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import User from '../features/auth/user.model';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('FATAL: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables must be provided.');
}

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            accessType: 'offline',
            callbackURL: '/api/auth/google/callback',
            scope: ['profile', 'email'],
        } as any,
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
                if (!profile.emails || profile.emails.length === 0) {
                    return done(new Error('No email found in Google profile'), false);
                }

                // 1. Check if user is linked by googleId
                let user = await User.findOne({ googleId: profile.id });
                if (user) {
                    return done(null, user);
                }

                // 2. Check if email is already registered, if so, link googleId
                const userEmail = profile.emails[0].value;
                user = await User.findOne({ email: userEmail });

                if (user) {
                    user.googleId = profile.id;
                    await user.save();
                    return done(null, user);
                } else {
                    // 3. Create a new pending account.
                    // Google OAuth users no longer bypass the admin approval flow.
                    const newUser = await User.create({
                        googleId: profile.id,
                        name: profile.displayName,
                        email: userEmail,
                        employmentType: 'Permanent',
                        role: 'Employee',
                        employeeId: `google-${profile.id}`,
                        status: 'Pending' // Force 'Pending' state for security
                    });
                    return done(null, newUser);
                }
            } catch (error) {
                return done(error as Error, false);
            }
        }
    )
);

passport.serializeUser((user: any, done) => {
    done(null, user.id || user._id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});