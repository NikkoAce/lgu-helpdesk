import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from 'passport';

import authRoutes from './features/auth/auth.routes';
import ticketRoutes from './features/tickets/ticket.routes';
import userRoutes from './features/users/user.routes';
import analyticsRoutes from './features/analytics/analytics.routes';

// Load passport configuration
import './config/passport';

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI environment variable is not defined.');
    process.exit(1);
}

// Allowed CORS origins list
const allowedOrigins = [
    'https://lgu-employee-portal.netlify.app',
    'https://lgu-ithelpdesk.netlify.app',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501'
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

// Trust proxy for secure cookies on cloud providers
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Initialize Passport (Stateless JWT mode - no passport.session() required)
app.use(passport.initialize());

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI, { readPreference: 'primary' })
    .then(() => console.info('MongoDB Connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack || err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// --- START SERVER ---
app.listen(PORT, () => console.info(`Server running on port ${PORT}`));
