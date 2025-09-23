const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const User = require('../models/User'); // Corrected path to the User model

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // The callbackURL should be the full path on your server
            callbackURL: '/api/auth/google/callback',
            scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find a user in your database based on their Google email.
                let user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // If the user exists, pass them to the next step.
                    return done(null, user);
                } else {
                    // If the user does not exist, create a new one.
                    // IMPORTANT: You will need to add `googleId: String` to your User model
                    // and make `employeeId` and `password` optional.
                    const newUser = await User.create({
                        googleId: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        // Set default values for other required fields
                        employmentType: 'Permanent', // Or a suitable default
                        role: 'Employee',
                        office: 'Unassigned' // Or a suitable default
                    });
                    return done(null, newUser);
                }
            } catch (error) {
                return done(error, false);
            }
        }
    )
);

// These are required for the session-based OAuth flow
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});