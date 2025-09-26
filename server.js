require('module-alias/register'); // Must be the first line

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const passport = require('passport'); // Import passport
const session = require('express-session'); // Import express-session
const MongoStore = require('connect-mongo'); // Import connect-mongo
const path = require('path'); // Import the path module

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION & MIDDLEWARE---
const MONGO_URI = process.env.MONGO_URI;
// Define allowed origins
const allowedOrigins = [
    'https://lgu-employee-portal.netlify.app', // Your main portal
    'https://lgu-ithelpdesk.netlify.app',      // Your IT Helpdesk app (THIS IS THE MISSING ONE)
    'http://127.0.0.1:5500',                   // Your local development URL for the portal
    'http://127.0.0.1:5501'                    // A potential local dev URL for the helpdesk
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true // IMPORTANT: Allow cookies to be sent from the frontend
};

// Trust the first proxy hop (essential for Render deployment)
// This allows Passport to correctly determine the `https` protocol from proxy headers.
app.set('trust proxy', 1);

app.use(cors(corsOptions)); // Use the new options
app.options('*', cors(corsOptions)); // Handle preflight requests for all routes
app.use(express.json());
app.use(cookieParser()); // To parse cookies from incoming requests

// --- PASSPORT & SESSION MIDDLEWARE ---
// This must come before your routes. Session is required by Passport for the OAuth flow.
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'a_very_secret_key_for_oauth', // Add SESSION_SECRET to your .env
        resave: false,
        saveUninitialized: false,
        // Use MongoStore to store sessions in your database, making them persistent
        store: MongoStore.create({ mongoUrl: MONGO_URI }),
        cookie: { 
            secure: process.env.NODE_ENV === 'production',
            // Set a reasonable lifetime for the session cookie (e.g., 15 minutes)
            maxAge: 1000 * 60 * 15 
        }
    })
);
app.use(passport.initialize());
app.use(passport.session());
require('@/config/passport.js'); // Use module alias

// --- Use morgan for detailed request logging ---
app.use(morgan('dev'));

// --- DATABASE CONNECTION ---
// Add readPreference option to ensure we always get the most up-to-date data,
// preventing stale reads after writes like a password update.
mongoose.connect(MONGO_URI, { readPreference: 'primary' })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:',err));



// --- API ROUTES ---
app.use('/api/auth', require('@/features/auth/auth.routes.js'));
app.use('/api/tickets', require('@/features/tickets/ticket.routes.js'));
app.use('/api/users', require('@/features/users/user.routes.js'));
app.use('/api/analytics', require('@/features/analytics/analytics.routes.js'));



// --- START SERVER ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
