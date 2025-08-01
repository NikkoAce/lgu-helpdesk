require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');


const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION & MIDDLEWARE---
const MONGO_URI = process.env.MONGO_URI;
// Define allowed origins
const allowedOrigins = [
    'https://lgu-employee-portal.netlify.app',
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
    }
};

app.use(cors(corsOptions)); // Use the new options
app.use(express.json());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:',err));



// --- API ROUTES ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes')); 



// --- START SERVER ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
