require('dotenv').config();

// --- Robust Module Aliasing ---
// This must come before any other require statements that use the alias.
const moduleAlias = require('module-alias');
moduleAlias.addAlias('@', __dirname); // The '@' alias now points to the project root.

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION & MIDDLEWARE---
const MONGO_URI = process.env.MONGO_URI;
const allowedOrigins = [
    'https://lgu-employee-portal.netlify.app',
    'https://lgu-ithelpdesk.netlify.app',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// --- PASSPORT & SESSION MIDDLEWARE ---
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'a_very_secret_key_for_oauth',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: MONGO_URI }),
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 15
        }
    })
);
app.use(passport.initialize());
app.use(passport.session());
require('@/src/config/passport.js'); // Use module alias

// --- Use morgan for detailed request logging ---
app.use(morgan('dev'));

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI, { readPreference: 'primary' })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- API ROUTES ---
app.use('/api/auth', require('@/src/features/auth/auth.routes.js'));
app.use('/api/tickets', require('@/src/features/tickets/ticket.routes.js'));
app.use('/api/users', require('@/src/features/users/user.routes.js'));
app.use('/api/analytics', require('@/src/features/analytics/analytics.routes.js'));

// --- START SERVER ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));