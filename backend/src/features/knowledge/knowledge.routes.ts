import { Router } from 'express';
import { createArticle, getArticles, getArticleBySlug, updateArticle } from './knowledge.controller';
import authMiddleware, { requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Public routes for authenticated portal users
router.get('/', authMiddleware as any, getArticles as any);
router.get('/:slug', authMiddleware as any, getArticleBySlug as any);

// Restricted routes for ICTO staff to manage articles
router.post('/', authMiddleware as any, requireRole(['ICTO Staff', 'ICTO Head']) as any, createArticle as any);
router.put('/:slug', authMiddleware as any, requireRole(['ICTO Staff', 'ICTO Head']) as any, updateArticle as any);

export default router;
