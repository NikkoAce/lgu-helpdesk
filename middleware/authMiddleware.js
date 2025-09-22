const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    // Get token from the HttpOnly cookie
    const token = req.cookies.portalAuthToken;

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
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
