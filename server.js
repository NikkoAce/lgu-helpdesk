require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware & Connection
app.use(cors());
app.use(express.json());
mongoose.connect(MONGO_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

// --- SCHEMAS & MODELS ---
const commentSchema = new mongoose.Schema({ author: String, content: String, createdAt: { type: Date, default: Date.now } });

const ticketSchema = new mongoose.Schema({
    subject: String,
    description: String,
    requesterName: String,
    requesterRole: String,
    requesterOffice: String,
    category: String,
    subCategory: String,
    urgency: String,
    status: { type: String, default: 'New' },
    createdAt: { type: Date, default: Date.now },
    comments: [commentSchema]
});


const userSchema = new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    name: String,
    role: String,
    office: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
const User = mongoose.model('User', userSchema);

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'Access denied. No token.' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Malformed token.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET).user;
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// --- PUBLIC ROUTES ---
app.post('/register', async (req, res) => {
    try {
        const { employeeId, name, role, password, office, email } = req.body;
        if (!employeeId || !name || !role || !password || !office || !email) return res.status(400).json({ message: 'All fields are required.' });
        const existingUser = await User.findOne({ employeeId });
        if (existingUser) return res.status(400).json({ message: 'Employee ID already registered.' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ employeeId, name, role, office, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { employeeId, password } = req.body;
        if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password are required.' });
        const user = await User.findOne({ employeeId });
        if (!user) return res.status(401).json({ message: 'Invalid Employee ID or Password.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid Employee ID or Password.' });
        const payload = { user: { id: user._id, name: user.name, role: user.role, office: user.office, email: user.email } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(200).json({ token });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// --- PROTECTED TICKET ROUTES ---
app.get('/tickets', authMiddleware, async (req, res) => {
    try {
        const { role, name, office } = req.user; // Get user details from the JWT

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Filter and Search parameters from the frontend
        const { status, search } = req.query;
        
        // --- NEW: Build the base query based on user role ---
        const queryFilter = {};

        if (role.includes('ICTO')) {
            // ICTO Staff/Head sees all tickets
        } else if (role === 'Department Head') {
            // Department Head sees all tickets from their office
            queryFilter.requesterOffice = office;
        } else {
            // Regular Employee sees only their own tickets
            queryFilter.requesterName = name;
        }

        // Add frontend filters to the base query
        if (status && status !== 'All') {
            queryFilter.status = status;
        }
        if (search) {
            queryFilter.subject = { $regex: search, $options: 'i' };
        }

        // Fetch total count for pagination
        const totalTickets = await Ticket.countDocuments(queryFilter);
        const totalPages = Math.ceil(totalTickets / limit);

        // Fetch paginated tickets
        const tickets = await Ticket.find(queryFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const responseTickets = tickets.map(t => ({ ...t.toObject(), id: t._id }));

        res.status(200).json({
            tickets: responseTickets,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
});

app.post('/tickets', authMiddleware, async (req, res) => {
    try {
        const newTicket = new Ticket({ ...req.body, requesterName: req.user.name, requesterRole: req.user.role, requesterOffice: req.user.office });
        await newTicket.save();
        res.status(201).json({ message: 'Ticket created successfully!', ticket: { ...newTicket.toObject(), id: newTicket._id } });
    } catch (error) {
        res.status(400).json({ message: 'Error creating ticket', error: error.message });
    }
});

app.get('/tickets/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid Ticket ID.' });
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
        res.status(200).json({ ...ticket.toObject(), id: ticket._id });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching ticket details', error: error.message });
    }
});

app.post('/tickets/:id/comments', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid Ticket ID.' });
        const { content } = req.body;
        if (!content) return res.status(400).json({ message: 'Comment content is required.' });
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
        const newComment = { author: req.user.name, content };
        ticket.comments.push(newComment);
        await ticket.save();
        res.status(201).json(ticket.comments);
    } catch (error) {
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
});

app.patch('/tickets/:id', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid Ticket ID.' });
        const allowedStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
        if (!status || !allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid or missing status.' });
        const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedTicket) return res.status(404).json({ message: 'Ticket not found.' });
        res.status(200).json({ ...updatedTicket.toObject(), id: updatedTicket._id });
    } catch (error) {
        res.status(500).json({ message: 'Error updating ticket status', error: error.message });
    }
});

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

// --- USER MANAGEMENT ROUTES ---
app.get('/users', authMiddleware, async (req, res) => {
    if (req.user.role !== 'ICTO Head') return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    try {
        const users = await User.find().select('-password').sort({ name: 1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

app.patch('/users/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'ICTO Head') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    }
    try {
        const { name, role, office } = req.body;
        const updateData = {};

        // Build an object with only the fields that were provided
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (office) updateData.office = office;

        // Ensure at least one field is being updated
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true } // Return the updated document
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});



app.delete('/users/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'ICTO Head') return res.status(403).json({ message: 'Forbidden' });
    try {
        if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot delete your own administrator account.' });
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'User not found.' });
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

// --- START SERVER ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
