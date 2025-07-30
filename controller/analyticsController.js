const Ticket = require('../models/Ticket');

exports.getDashboardSummary = async (req, res) => {
    try {
        const { role, name, office } = req.user;
        const queryFilter = {};

        if (role.includes('ICTO')) {
            // ICTO sees system-wide stats on their dashboard too
        } else if (role === 'Department Head') {
            queryFilter.requesterOffice = office;
        } else { // Regular Employee
            queryFilter.requesterName = name;
        }

        const [total, newTickets, inProgress, resolved] = await Promise.all([
            Ticket.countDocuments(queryFilter),
            Ticket.countDocuments({ ...queryFilter, status: 'New' }),
            Ticket.countDocuments({ ...queryFilter, status: 'In Progress' }),
            Ticket.countDocuments({ ...queryFilter, status: 'Resolved' })
        ]);

        res.status(200).json({ total, new: newTickets, inProgress, resolved });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard summary', error: error.message });
    }
};

exports.getMainAnalytics = async (req, res) => {
    if (req.user.role !== 'ICTO Head') {
        return res.status(403).json({ message: 'Forbidden' });
    }
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
};
