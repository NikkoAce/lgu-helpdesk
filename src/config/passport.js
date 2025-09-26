const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const User = require('../features/users/user.model.js');


passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // The callbackURL should be the full path on your server
            accessType: 'offline', // This prompts the user for consent once, then makes the app visible in their Google Account settings.
            callbackURL: '/api/auth/google/callback',
            scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // 1. Find an existing user by their Google ID. This is the fastest path for returning users.
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    // User already exists and is linked. Log them in.
                    return done(null, user);
                }

                // 2. If no user is found by Google ID, try to find one by email to link the account.
                user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // User exists but hasn't used Google to log in before.
                    // Link their account by adding their Google ID and save.
                    user.googleId = profile.id;
                    await user.save();
                    return done(null, user);
                } else {
                    // 3. If no user exists with this Google ID or email, create a new user.
                    const newUser = await User.create({
                        googleId: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        // Set default values. These can be updated later in their profile.
                        employmentType: 'Permanent',
                        role: 'Employee',
                        // Use a unique placeholder for employeeId to avoid unique index conflicts on null values.
                        employeeId: `google-${profile.id}`,
                        status: 'Active' // Users signing up via Google are automatically considered active
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