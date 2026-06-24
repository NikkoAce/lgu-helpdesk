import express from 'express';
import { getOffices, createOffice, updateOffice, deleteOffice } from './office.controller';
import authMiddleware, { requireRole } from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/', getOffices); // Public access

router.post('/', authMiddleware as any, requireRole(['ICTO']) as any, createOffice);
router.put('/:id', authMiddleware as any, requireRole(['ICTO']) as any, updateOffice);
router.delete('/:id', authMiddleware as any, requireRole(['ICTO']) as any, deleteOffice);

export default router;
