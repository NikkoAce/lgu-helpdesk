import { Response } from 'express';
import Ticket from '../tickets/ticket.model';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

/**
 * @desc    Get dashboard summary counters scoped by role visibility
 * @route   GET /api/analytics/dashboard-summary
 */
export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { role, name, office } = req.user;
        const queryFilter: any = {};

        if (role.includes('ICTO')) {
            // ICTO sees global statistics
        } else if (role === 'Department Head') {
            queryFilter.requesterOffice = office;
        } else {
            queryFilter.requesterName = name;
        }

        const [total, newTickets, inProgress, resolved] = await Promise.all([
            Ticket.countDocuments(queryFilter),
            Ticket.countDocuments({ ...queryFilter, status: 'New' }),
            Ticket.countDocuments({ ...queryFilter, status: 'In Progress' }),
            Ticket.countDocuments({ ...queryFilter, status: 'Resolved' })
        ]);

        res.status(200).json({ total, new: newTickets, inProgress, resolved });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching dashboard summary', error: error.message });
    }
};

/**
 * @desc    Get global analytics data (ICTO personnel only)
 * @route   GET /api/analytics/summary
 */
export const getMainAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    if (!req.user || !req.user.role || !req.user.role.includes('ICTO')) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to ICTO personnel.' });
    }
    try {
        const [totalTickets, newTickets, inProgressTickets, resolvedTickets, closedTickets] = await Promise.all([
            Ticket.countDocuments(),
            Ticket.countDocuments({ status: 'New' }),
            Ticket.countDocuments({ status: 'In Progress' }),
            Ticket.countDocuments({ status: 'Resolved' }),
            Ticket.countDocuments({ status: 'Closed' })
        ]);
        res.status(200).json({
            totalTickets,
            new: newTickets,
            inProgress: inProgressTickets,
            resolved: resolvedTickets,
            closed: closedTickets
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching analytics summary', error: error.message });
    }
};
