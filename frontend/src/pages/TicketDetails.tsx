// FILE: d:/Programming/_ITHELPDESK/frontend/src/pages/TicketDetails.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import type { SupportTicket, HelpdeskUser } from '../utils/api';
import { 
  ArrowLeft, 
  AlertCircle, 
  MessageSquare, 
  Paperclip, 
  Trash2, 
  User, 
  Calendar, 
  Building2, 
  UserCheck,
  Clock,
  Activity,
  Tag
} from 'lucide-react';

interface TicketDetailsProps {
  currentUser: HelpdeskUser | null;
}

export const TicketDetails: React.FC<TicketDetailsProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Comment Form States
  const [commentContent, setCommentContent] = useState('');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status Change States
  const [statusValue, setStatusValue] = useState('New');
  const [assignedToValue, setAssignedToValue] = useState<string>('');
  const [statusReason, setStatusReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [ictoUsers, setIctoUsers] = useState<HelpdeskUser[]>([]);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchWithAuth<SupportTicket>(`tickets/${id}`);
      setTicket(data);
      setStatusValue(data.status);
      setAssignedToValue(data.assignedTo?._id || data.assignedTo?.id || '');
      setAssetTag(data.assetTag || '');
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch ticket details:', err);
      setError(err.message || 'Error fetching ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const isIctoRole = currentUser?.role && currentUser.role.includes('ICTO');

  useEffect(() => {
    if (isIctoRole) {
      fetchWithAuth<HelpdeskUser[]>('users')
        .then(users => {
          const ictos = users.filter(u => u.role && u.role.includes('ICTO'));
          setIctoUsers(ictos);
        })
        .catch(console.error);
    }
  }, [isIctoRole]);

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCommentFile(e.target.files[0]);
    } else {
      setCommentFile(null);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentContent.trim()) return;

    setSubmittingComment(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('content', commentContent.trim());
    if (commentFile) {
      formData.append('attachment', commentFile);
    }

    try {
      const updatedComments = await fetchWithAuth<any>(`tickets/${id}/comments`, {
        method: 'POST',
        body: formData
      });
      
      setTicket(prev => prev ? { ...prev, comments: updatedComments } : null);
      setCommentContent('');
      setCommentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccess('Comment submitted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      setError(err.message || 'Error posting reply.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !ticket) return;

    setUpdatingStatus(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedTicket = await fetchWithAuth<SupportTicket>(`tickets/${id}`, {
        method: 'PATCH',
        body: { 
          status: statusValue, 
          assignedTo: assignedToValue,
          statusReason: statusReason.trim(),
          assetTag: assetTag.trim(),
          resolutionNotes: (statusValue === 'Resolved' || statusValue === 'Closed') ? resolutionNotes.trim() : undefined
        }
      });
      setTicket(updatedTicket);
      setStatusReason('');
      setResolutionNotes('');
      setSuccess('Ticket status updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update ticket status:', err);
      setError(err.message || 'Error updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteAttachment = async (commentId: string) => {
    if (!id || !confirm('Are you sure you want to permanently delete this attachment? This action cannot be undone.')) {
      return;
    }
    
    setError(null);
    setSuccess(null);

    try {
      await fetchWithAuth(`tickets/${id}/comments/${commentId}/attachment`, {
        method: 'DELETE'
      });
      setSuccess('Attachment deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      fetchDetails(); // Reload details
    } catch (err: any) {
      console.error('Failed to delete attachment:', err);
      setError(err.message || 'Error deleting attachment.');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'badge-warning';
      case 'Resolved': return 'badge-success';
      case 'Closed': return 'badge-neutral';
      default: return 'badge-info'; // 'New'
    }
  };

  // isIctoRole is already defined above

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-xs text-base-content/50 mt-2">Loading ticket conversation...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-12">
        <div className="alert alert-error">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn btn-outline btn-sm w-full">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Navigation header */}
      <button 
        onClick={() => isIctoRole ? navigate('/tickets') : navigate('/dashboard')}
        className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline self-start"
      >
        <ArrowLeft size={14} />
        <span>{isIctoRole ? 'Back to Tickets' : 'Back to Dashboard'}</span>
      </button>

      {success && (
        <div className="alert alert-success text-xs p-3 rounded-lg flex items-center gap-2">
          <span>{success}</span>
        </div>
      )}
      {error && ticket && (
        <div className="alert alert-error text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {ticket && (
        <div className="space-y-6">
          {/* Header section */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-base-300 pb-4">
            <div>
              <p className="text-xs text-base-content/50 font-semibold font-mono">Ticket #{ticket.id}</p>
              <h2 className="text-2xl font-extrabold font-heading text-base-content tracking-tight mt-1">
                {ticket.subject}
              </h2>
            </div>
            <span className={`badge badge-md font-bold py-3 ${getStatusBadgeColor(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Metadata & Actions */}
            <div className="space-y-6">
              {/* Details Card */}
              <div className="card card-compact bg-base-100 border border-base-300 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/50">Ticket details</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-base-200">
                    <span className="font-semibold text-base-content/60 flex items-center gap-1.5"><User size={12} /> Requester</span>
                    <span className="text-base-content font-bold">{ticket.requesterName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-base-200">
                    <span className="font-semibold text-base-content/60 flex items-center gap-1.5"><Building2 size={12} /> Office</span>
                    <span className="text-base-content font-bold">{ticket.requesterOffice || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-base-200">
                    <span className="font-semibold text-base-content/60 flex items-center gap-1.5"><UserCheck size={12} /> Department</span>
                    <span className="text-base-content font-bold">{ticket.requesterRole}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-semibold text-base-content/60 flex items-center gap-1.5"><Calendar size={12} /> Created</span>
                    <span className="text-base-content font-bold">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  {ticket.assetTag && !isIctoRole && (
                    <div className="flex justify-between items-center py-1 border-t border-base-200 mt-1">
                      <span className="font-semibold text-base-content/60 flex items-center gap-1.5"><Tag size={12} /> Asset Tag</span>
                      <span className="text-base-content font-mono font-bold bg-base-200 px-2 py-0.5 rounded">{ticket.assetTag}</span>
                    </div>
                  )}
                  {(ticket.firstResponseAt || ticket.resolvedAt) && (
                    <>
                      <div className="divider my-1"></div>
                      <h4 className="text-[10px] uppercase font-bold text-base-content/40 mb-2">SLA Tracking</h4>
                      {ticket.firstResponseAt && (
                        <div className="flex justify-between items-center py-1">
                          <span className="font-semibold text-base-content/60 flex items-center gap-1.5"><Clock size={12} /> Responded</span>
                          <span className="text-base-content font-bold">{new Date(ticket.firstResponseAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {ticket.resolvedAt && (
                        <div className="flex justify-between items-center py-1">
                          <span className="font-semibold text-base-content/60 flex items-center gap-1.5"><Clock size={12} /> Resolved</span>
                          <span className="text-base-content font-bold">{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Admin Actions Panel */}
              {isIctoRole && (
                <div className="card card-compact bg-base-100 border border-base-300 p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/50">Admin Actions</h3>
                  <form onSubmit={handleStatusSubmit} className="space-y-3">
                    <div className="form-control">
                      <label htmlFor="status-select" className="label py-1">
                        <span className="label-text text-xs font-semibold">Update Status</span>
                      </label>
                      <select 
                        id="status-select" 
                        value={statusValue}
                        onChange={(e) => setStatusValue(e.target.value)}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div className="form-control">
                      <label htmlFor="assign-select" className="label py-1">
                        <span className="label-text text-xs font-semibold">Assign To</span>
                      </label>
                      <select 
                        id="assign-select" 
                        value={assignedToValue}
                        onChange={(e) => setAssignedToValue(e.target.value)}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value="">-- Unassigned --</option>
                        {ictoUsers.map(u => (
                          <option key={u._id} value={u._id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control">
                      <label htmlFor="asset-tag" className="label py-1">
                        <span className="label-text text-xs font-semibold">Asset Tag</span>
                      </label>
                      <input 
                        type="text" 
                        id="asset-tag" 
                        value={assetTag}
                        onChange={(e) => setAssetTag(e.target.value)}
                        placeholder="e.g. PC-2023-001"
                        className="input input-bordered input-sm w-full font-mono text-xs"
                      />
                    </div>
                    {statusValue !== ticket.status && (
                      <div className="form-control">
                        <label htmlFor="status-reason" className="label py-1">
                          <span className="label-text text-xs font-semibold">Reason for Change (Required)</span>
                        </label>
                        <textarea 
                          id="status-reason" 
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
                          className="textarea textarea-bordered text-xs w-full"
                          rows={2}
                          required
                        />
                      </div>
                    )}
                    {(statusValue === 'Resolved' || statusValue === 'Closed') && statusValue !== ticket.status && (
                      <div className="form-control">
                        <label htmlFor="resolution-notes" className="label py-1">
                          <span className="label-text text-xs font-semibold">Resolution Notes (Required)</span>
                        </label>
                        <textarea 
                          id="resolution-notes" 
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="textarea textarea-bordered text-xs w-full"
                          rows={3}
                          required
                        />
                      </div>
                    )}
                    <button 
                      type="submit" 
                      disabled={updatingStatus || (statusValue !== ticket.status && !statusReason) || ((statusValue === 'Resolved' || statusValue === 'Closed') && statusValue !== ticket.status && !resolutionNotes)}
                      className="btn btn-primary btn-sm w-full mt-2"
                    >
                      {updatingStatus ? <span className="loading loading-spinner loading-xs"></span> : 'Update Status'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Right Column: Description & Conversation */}
            <div className="md:col-span-2 space-y-6">
              {/* Description box */}
              <div className="bg-base-100 rounded-2xl border border-base-300 p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/50">Description</h3>
                <p className="text-sm text-base-content whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Status History */}
              {ticket.statusHistory && ticket.statusHistory.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold font-heading text-base-content flex items-center gap-2">
                    <Activity size={18} />
                    <span>Status History</span>
                  </h3>
                  <div className="bg-base-100 rounded-2xl border border-base-300 p-6 shadow-sm">
                    <ul className="steps steps-vertical text-xs w-full">
                      {ticket.statusHistory.map((history, idx) => (
                        <li key={idx} className="step step-primary w-full text-left ml-0">
                          <div className="flex flex-col text-left mb-4 mt-1">
                            <span className="font-bold text-sm">
                              {history.fromStatus} → {history.status}
                            </span>
                            <span className="text-base-content/60 mb-1">{new Date(history.changedAt).toLocaleString()}</span>
                            {history.reason && (
                              <span className="bg-base-200 p-2 rounded mt-1 italic text-base-content/80">Reason: {history.reason}</span>
                            )}
                            {history.notes && (
                              <span className="bg-base-200 p-2 rounded mt-1 text-base-content/80">Notes: {history.notes}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Conversation Feeds */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold font-heading text-base-content flex items-center gap-2">
                  <MessageSquare size={18} />
                  <span>Conversation Feed</span>
                </h3>

                <div className="space-y-4">
                  {ticket.comments && ticket.comments.length > 0 ? (
                    ticket.comments.map((comment) => {
                      const showDeleteButton = isIctoRole && comment.attachmentUrl;
                      return (
                        <div key={comment._id} className="bg-base-100 rounded-2xl border border-base-300 p-5 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-base-200 pb-2">
                            <div>
                              <span className="text-sm font-bold text-base-content">{comment.author}</span>
                              {comment.authorRole && (
                                <span className="text-[10px] font-mono uppercase bg-base-200 text-base-content/70 px-1.5 py-0.5 rounded ml-2">
                                  {comment.authorRole}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-base-content/50">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-base-content/80 whitespace-pre-wrap leading-relaxed">
                            {comment.content}
                          </p>
                          {comment.attachmentUrl && (
                            <div className="flex items-center gap-4 pt-2 text-xs">
                              <a 
                                href={comment.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="link link-primary font-bold flex items-center gap-1"
                              >
                                <Paperclip size={12} />
                                <span>View Attachment</span>
                              </a>
                              {showDeleteButton && (
                                <button 
                                  onClick={() => handleDeleteAttachment(comment._id)}
                                  className="text-error font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete File</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 bg-base-100 border border-base-300 rounded-2xl text-base-content/50 text-xs">
                      No updates submitted for this ticket yet.
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleCommentSubmit} className="bg-base-100 rounded-2xl border border-base-300 p-6 shadow-sm space-y-4">
                  <div className="form-control">
                    <label htmlFor="comment-content" className="label py-1">
                      <span className="label-text text-xs font-semibold">Post a Reply</span>
                    </label>
                    <textarea 
                      id="comment-content" 
                      rows={3}
                      required
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Type your reply here..." 
                      className="textarea textarea-bordered text-sm w-full"
                    />
                  </div>

                  <div className="form-control">
                    <label htmlFor="attachment" className="label py-1">
                      <span className="label-text text-xs font-semibold">Attach a File (Optional)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        id="attachment"
                        ref={fileInputRef}
                        onChange={handleCommentFileChange}
                        className="file-input file-input-bordered file-input-sm w-full max-w-xs" 
                      />
                      {commentFile && (
                        <span className="text-xs text-base-content/60 font-semibold truncate max-w-xs">
                          Selected: {commentFile.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit" 
                      disabled={submittingComment || !commentContent.trim()}
                      className="btn btn-primary btn-sm px-6"
                    >
                      {submittingComment ? <span className="loading loading-spinner loading-xs"></span> : 'Submit Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
