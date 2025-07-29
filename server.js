require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');


const app = express();
const PORT = 3000;

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI;



// Middleware & Connection
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));



// --- API ROUTES ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// --- ANALYTICS ROUTE ---
app.get('/analytics/summary', authMiddleware, async (req, res) => {
    try {
        const [totalTickets, newTickets, inProgressTickets, resolvedTickets, closedTickets] = await Promise.all([
            Ticket.countDocuments(),
            Ticket.countDocuments({ status: 'New' }),
            Ticket.countDocuments({ status: 'In Progress' }),
            Ticket.countDocuments({ status: 'Resolved' }),
            Ticket.countDocuments({ status: 'Closed' })
        ]);
        res.status(200).json({ totalTickets, new: newTickets, inProgress: inProgressTickets, resolved: resolvedTickets, closed: closedTickets });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics summary', error: error.message });
    }
});



app.get('/analytics/dashboard-summary', authMiddleware, async (req, res) => {
    try {
        const { role, name, office } = req.user;
        const queryFilter = {};

        // Build the filter based on the user's role
        if (role.includes('ICTO')) {
            // For ICTO, show system-wide stats
        } else if (role === 'Department Head') {
            queryFilter.requesterOffice = office;
        } else { // Regular Employee
            queryFilter.requesterName = name;
        }

        // Run queries in parallel to get the stats
        const [
            totalTickets,
            newTickets,
            inProgressTickets,
            resolvedTickets
        ] = await Promise.all([
            Ticket.countDocuments(queryFilter),
            Ticket.countDocuments({ ...queryFilter, status: 'New' }),
            Ticket.countDocuments({ ...queryFilter, status: 'In Progress' }),
            Ticket.countDocuments({ ...queryFilter, status: 'Resolved' })
        ]);

        res.status(200).json({
            total: totalTickets,
            new: newTickets,
            inProgress: inProgressTickets,
            resolved: resolvedTickets
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard summary', error: error.message });
    }
});

// --- START SERVER ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
