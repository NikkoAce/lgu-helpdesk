import { Request, Response } from 'express';
import KnowledgeArticle from './knowledge.model';
import AuditLog from '../internal/auditLog.model';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// Generate a slug from a title
const generateSlug = (title: string): string => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

export const createArticle = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { title, content, category, tags, isPublished } = req.body;
        if (!title || !content || !category) {
            return res.status(400).json({ message: 'Title, content, and category are required.' });
        }

        let slug = generateSlug(title);
        // Ensure slug is unique
        let existing = await KnowledgeArticle.findOne({ slug });
        let count = 1;
        while (existing) {
            slug = `${generateSlug(title)}-${count}`;
            existing = await KnowledgeArticle.findOne({ slug });
            count++;
        }

        const article = new KnowledgeArticle({
            title,
            slug,
            content,
            category,
            tags: tags || [],
            author: req.user?.id,
            isPublished: isPublished || false
        });

        await article.save();

        await AuditLog.create({
            action: 'knowledge_article_created',
            performedBy: req.user?.id,
            details: `Created knowledge base article: ${title}`
        });

        if (article.isPublished) {
            await AuditLog.create({
                action: 'knowledge_article_published',
                performedBy: req.user?.id,
                details: `Published knowledge base article: ${title}`
            });
        }

        res.status(201).json(article);
    } catch (error: any) {
        console.error('Create Article Error:', error);
        res.status(500).json({ message: 'Error creating article.' });
    }
};

export const getArticles = async (req: Request, res: Response): Promise<any> => {
    try {
        // Return only published articles for regular queries
        const articles = await KnowledgeArticle.find({ isPublished: true })
            .select('-content') // exclude content for list view
            .populate('author', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(articles);
    } catch (error: any) {
        console.error('Get Articles Error:', error);
        res.status(500).json({ message: 'Error fetching articles.' });
    }
};

export const getArticleBySlug = async (req: Request, res: Response): Promise<any> => {
    try {
        const { slug } = req.params;
        const article = await KnowledgeArticle.findOne({ slug }).populate('author', 'name');

        if (!article) {
            return res.status(404).json({ message: 'Article not found.' });
        }

        // Increment view count
        article.viewCount += 1;
        await article.save();

        res.status(200).json(article);
    } catch (error: any) {
        console.error('Get Article Error:', error);
        res.status(500).json({ message: 'Error fetching article.' });
    }
};

export const updateArticle = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { slug } = req.params;
        const updates = req.body;

        const article = await KnowledgeArticle.findOne({ slug });
        if (!article) {
            return res.status(404).json({ message: 'Article not found.' });
        }

        const wasPublished = article.isPublished;

        Object.assign(article, updates);
        await article.save();

        await AuditLog.create({
            action: 'knowledge_article_updated',
            performedBy: req.user?.id,
            details: `Updated knowledge base article: ${article.title}`
        });

        if (!wasPublished && article.isPublished) {
            await AuditLog.create({
                action: 'knowledge_article_published',
                performedBy: req.user?.id,
                details: `Published knowledge base article: ${article.title}`
            });
        }

        res.status(200).json(article);
    } catch (error: any) {
        console.error('Update Article Error:', error);
        res.status(500).json({ message: 'Error updating article.' });
    }
};
