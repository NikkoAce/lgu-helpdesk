const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser, getMe } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// This new route will allow other systems to verify a user's token.
// It's placed before other routes with parameters to avoid conflicts.
router.get('/me', authMiddleware, getMe);

router.get('/', authMiddleware, getAllUsers);
router.patch('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);

module.exports = router;