// FILE: d:/Programming/_ITHELPDESK/frontend/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import type { SupportTicket } from '../utils/api';
import { 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight, 
  Inbox, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface StatsSummary {
  total: number;
  new: number;
  inProgress: number;
  resolved: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch stats
        const statsData = await fetchWithAuth<StatsSummary>('analytics/dashboard-summary');
        setStats(statsData);

        // Fetch tickets for page
        const ticketsData = await fetchWithAuth<{ tickets: SupportTicket[]; totalPages: number }>(
          `tickets?page=${currentPage}&limit=5`
        );
        setTickets(ticketsData.tickets);
        setTotalPages(ticketsData.totalPages);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Error fetching dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="badge badge-info badge-sm">New</span>;
      case 'In Progress':
        return <span className="badge badge-warning badge-sm">In Progress</span>;
      case 'Resolved':
        return <span className="badge badge-success badge-sm">Resolved</span>;
      case 'Closed':
        return <span className="badge badge-neutral badge-sm">Closed</span>;
      default:
        return <span className="badge badge-sm">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-heading text-base-content tracking-tight">
            Helpdesk Dashboard
          </h2>
          <p className="text-sm text-base-content/60">
            Monitor and manage your IT support tickets.
          </p>
        </div>
        <button 
          onClick={() => navigate('/new-ticket')} 
          className="btn btn-primary btn-sm gap-2"
        >
          <PlusCircle size={16} />
          <span>Create New Ticket</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex items-center gap-4 hover-scale">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <div className="text-2xl font-extrabold">{stats.total}</div>
              <div className="text-xs text-base-content/50 uppercase font-semibold">Total Tickets</div>
            </div>
          </div>

          <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex items-center gap-4 hover-scale">
            <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <Inbox size={24} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-info">{stats.new}</div>
              <div className="text-xs text-base-content/50 uppercase font-semibold">New</div>
            </div>
          </div>

          <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex items-center gap-4 hover-scale">
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-warning">{stats.inProgress}</div>
              <div className="text-xs text-base-content/50 uppercase font-semibold">In Progress</div>
            </div>
          </div>

          <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex items-center gap-4 hover-scale">
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-success">{stats.resolved}</div>
              <div className="text-xs text-base-content/50 uppercase font-semibold">Resolved</div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets section */}
      <div className="bg-base-100 rounded-3xl border border-base-300 p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-xl font-bold font-heading">Recent Tickets</h3>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-base-content/50 space-y-2">
            <FileText size={40} className="mx-auto opacity-30" />
            <p>You have not submitted any support tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {tickets.map(ticket => (
                <div 
                  key={ticket._id} 
                  className="p-4 bg-base-200/50 hover:bg-base-200 border border-base-300 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-base-content/50 font-mono">#{ticket.id}</span>
                      <span className="text-xs font-semibold text-primary">{ticket.category} / {ticket.subCategory}</span>
                    </div>
                    <h4 className="text-base font-bold tracking-tight text-base-content">{ticket.subject}</h4>
                    <p className="text-xs text-base-content/60">
                      Created: {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {getStatusBadge(ticket.status)}
                    <button 
                      onClick={() => navigate(`/ticket/${ticket.id}`)}
                      className="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-base-300 text-xs">
                <span className="text-base-content/60">Page {currentPage} of {totalPages}</span>
                <div className="join">
                  <button 
                    onClick={handlePrevPage} 
                    disabled={currentPage === 1}
                    className="join-item btn btn-outline btn-xs"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button className="join-item btn btn-outline btn-xs pointer-events-none">{currentPage}</button>
                  <button 
                    onClick={handleNextPage} 
                    disabled={currentPage === totalPages}
                    className="join-item btn btn-outline btn-xs"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
