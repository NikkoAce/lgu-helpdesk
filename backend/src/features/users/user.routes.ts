import express from 'express';
import {
    getAllUsers,
    updateUser,
    deleteUser,
    getMe,
    updateUserProfile,
    getGsoOffices,
    updateUserStatus
} from './user.controller';
import authMiddleware from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/me', authMiddleware as any, getMe as any);
router.get('/offices', getGsoOffices);
router.put('/me', authMiddleware as any, updateUserProfile as any);
router.get('/', authMiddleware as any, getAllUsers as any);
router.patch('/:id/status', authMiddleware as any, updateUserStatus as any);
router.patch('/:id', authMiddleware as any, updateUser as any);
router.delete('/:id', authMiddleware as any, deleteUser as any);

export default router;