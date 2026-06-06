// FILE: d:/Programming/_ITHELPDESK/frontend/src/pages/Tickets.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import type { SupportTicket } from '../utils/api';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  FileText, 
  Filter 
} from 'lucide-react';

export const Tickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        let endpoint = `tickets?page=${currentPage}&limit=10`;
        if (statusFilter !== 'All') {
          endpoint += `&status=${statusFilter}`;
        }
        if (searchQuery.trim()) {
          endpoint += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }

        const data = await fetchWithAuth<{ tickets: SupportTicket[]; totalPages: number }>(endpoint);
        setTickets(data.tickets);
        setTotalPages(data.totalPages);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch all tickets:', err);
        setError(err.message || 'Error fetching support tickets.');
      } finally {
        setLoading(false);
      }
    };

    // Debounce search query changes
    const timer = setTimeout(() => {
      fetchTickets();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPage, statusFilter, searchQuery]);

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

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="badge badge-info badge-sm font-semibold">New</span>;
      case 'In Progress':
        return <span className="badge badge-warning badge-sm font-semibold">In Progress</span>;
      case 'Resolved':
        return <span className="badge badge-success badge-sm font-semibold">Resolved</span>;
      case 'Closed':
        return <span className="badge badge-neutral badge-sm font-semibold">Closed</span>;
      default:
        return <span className="badge badge-sm font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-extrabold font-heading text-base-content tracking-tight">
          All Tickets Directory
        </h2>
        <p className="text-sm text-base-content/60">
          Manage and review support tickets logged across the government offices.
        </p>
      </div>

      {error && (
        <div className="alert alert-error text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" size={16} />
          <input 
            type="text" 
            placeholder="Search subject or requester..." 
            className="input input-bordered input-sm pl-10 w-full"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter size={16} className="text-base-content/50" />
          <select 
            className="select select-bordered select-sm w-full sm:w-40"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets Table Panel */}
      <div className="bg-base-100 rounded-3xl border border-base-300 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 text-base-content/50 space-y-2">
            <FileText size={48} className="mx-auto opacity-30" />
            <p>No support tickets match the search or filter query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="table table-zebra w-full text-left">
              <thead>
                <tr>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Subject / Category</th>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Requester</th>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Created On</th>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket._id} className="hover">
                    <td className="px-6 py-4">
                      <div className="font-bold text-base-content text-sm">{ticket.subject}</div>
                      <div className="text-xs text-base-content/50 font-mono">#{ticket.id} &bull; {ticket.category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-base-content">{ticket.requesterName}</div>
                      <div className="text-xs text-base-content/50">{ticket.requesterRole} ({ticket.requesterOffice || 'N/A'})</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                    <td className="px-6 py-4 text-sm text-base-content/75">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/ticket/${ticket.id}`)}
                        className="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-6 border-t border-base-300 text-xs bg-base-100">
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
                    disabled={currentPage >= totalPages}
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
