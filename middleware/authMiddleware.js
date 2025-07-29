const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Token is expected to be in the format "Bearer <token>"
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. Malformed token.' });
    }

    try {
        // Verify the token and attach the user payload to the request object
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next(); // Proceed to the route handler
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

module.exports = authMiddleware;
