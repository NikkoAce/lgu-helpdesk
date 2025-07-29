const User = require('../models/User'); // We will create this model file next
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.registerUser = async (req, res) => {
    try {
        const { employeeId, employmentType, name, role, password, office, email } = req.body;
        if (!employeeId || !employmentType || !name || !role || !password || !office || !email) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        let existingUser = await User.findOne({ employeeId });
        if (existingUser) return res.status(400).json({ message: 'Employee ID already registered.' });
        
        existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email address already registered.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ employeeId, employmentType, name, role, office, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { employeeId, password } = req.body;
        if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password are required.' });
        
        const user = await User.findOne({ employeeId });
        if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const payload = { user: { id: user._id, name: user.name, role: user.role, office: user.office, email: user.email } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(200).json({ token });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};
