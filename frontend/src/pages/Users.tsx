// FILE: d:/Programming/_ITHELPDESK/frontend/src/pages/Users.tsx
import React, { useEffect, useState } from 'react';
import { fetchWithAuth, BASE_URL } from '../utils/api';
import type { HelpdeskUser } from '../utils/api';
import { 
  Search, 
  AlertCircle, 
  UserX, 
  UserCheck, 
  ShieldAlert, 
  X, 
  Edit, 
  Trash 
} from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<HelpdeskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<'Active' | 'Pending'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [offices, setOffices] = useState<any[]>([]);

  // Modals state
  const [editingUser, setEditingUser] = useState<HelpdeskUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<HelpdeskUser | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    employeeId: '',
    office: '',
    role: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete form state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingProcess, setDeletingProcess] = useState(false);

  // Fetch offices list
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await fetch(`${BASE_URL}/offices`);
        if (response.ok) {
          const list = await response.json();
          setOffices(list);
        }
      } catch (err) {
        console.error('Failed to load offices:', err);
      }
    };
    fetchOffices();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let endpoint = `users?status=${currentTab}`;
      if (searchQuery.trim()) {
        endpoint += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const data = await fetchWithAuth<HelpdeskUser[]>(endpoint);
      setUsers(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Error loading users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const pendingData = await fetchWithAuth<HelpdeskUser[]>('users?status=Pending');
      setPendingCount(pendingData.length);
    } catch (err) {
      console.error('Failed to load pending badge count:', err);
    }
  };

  // Trigger loading when tab or query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
      fetchPendingCount();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentTab, searchQuery]);

  const handleStatusAction = async (userId: string, action: 'approve' | 'reject') => {
    setError(null);
    setSuccess(null);
    try {
      const nextStatus = action === 'approve' ? 'Active' : 'Rejected';
      const result = await fetchWithAuth<{ message: string }>(`users/${userId}/status`, {
        method: 'PATCH',
        body: { status: nextStatus }
      });
      setSuccess(result.message || `User successfully ${action}d.`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Animate item removal locally
      setUsers(prev => prev.filter(u => u._id !== userId));
      fetchPendingCount();
    } catch (err: any) {
      console.error('Failed to update user status:', err);
      setError(err.message || 'Error updating user registration.');
    }
  };

  // Edit user functions
  const openEditModal = (user: HelpdeskUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      employeeId: user.employeeId,
      office: user.office || '',
      role: user.role
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setError(null);

    try {
      const selectedOfficeOption = document.querySelector(`option[value="${editForm.office}"]`) as HTMLOptionElement;
      const officeId = selectedOfficeOption ? selectedOfficeOption.getAttribute('data-officeid') : undefined;

      await fetchWithAuth(`users/${editingUser._id}`, {
        method: 'PATCH',
        body: { ...editForm, officeId }
      });
      setSuccess('User updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user:', err);
      setError(err.message || 'Error updating user details.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete user functions
  const openDeleteModal = (user: HelpdeskUser) => {
    setDeletingUser(user);
    setDeleteConfirmText('');
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingUser || deleteConfirmText !== deletingUser.name) return;
    setDeletingProcess(true);
    setError(null);

    try {
      await fetchWithAuth(`users/${deletingUser._id}`, {
        method: 'DELETE'
      });
      setSuccess('User deleted successfully.');
      setTimeout(() => setSuccess(null), 3000);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError(err.message || 'Error deleting user.');
    } finally {
      setDeletingProcess(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-extrabold font-heading text-base-content tracking-tight">
          User Directory & Management
        </h2>
        <p className="text-sm text-base-content/60">
          Review pending registrations and adjust department permissions.
        </p>
      </div>

      {success && (
        <div className="alert alert-success text-xs p-3 rounded-lg flex items-center gap-2">
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-base-100 p-4 rounded-2xl border border-base-300 shadow-sm">
        <div className="tabs tabs-boxed bg-base-200 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => { setCurrentTab('Active'); searchQuery && setSearchQuery(''); }}
            className={`tab rounded-lg text-xs font-bold ${currentTab === 'Active' ? 'tab-active bg-primary text-primary-content' : 'text-base-content/70'}`}
          >
            Active Users
          </button>
          <button 
            onClick={() => { setCurrentTab('Pending'); searchQuery && setSearchQuery(''); }}
            className={`tab rounded-lg text-xs font-bold gap-2 ${currentTab === 'Pending' ? 'tab-active bg-primary text-primary-content' : 'text-base-content/70'}`}
          >
            <span>Pending Approvals</span>
            {pendingCount > 0 && (
              <span className={`badge badge-xs font-bold p-1.5 ${currentTab === 'Pending' ? 'bg-primary-content text-primary' : 'bg-primary text-primary-content'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" size={16} />
          <input 
            type="text" 
            placeholder={`Search ${currentTab.toLowerCase()} users...`} 
            className="input input-bordered input-sm pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-base-100 rounded-3xl border border-base-300 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-base-content/50 space-y-2">
            <UserX size={48} className="mx-auto opacity-30" />
            <p>No {currentTab.toLowerCase()} users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="table table-zebra w-full text-left">
              <thead>
                <tr>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Name / ID</th>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Email</th>
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Office</th>
                  {currentTab === 'Active' ? (
                    <>
                      <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Role</th>
                      <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Status</th>
                    </>
                  ) : (
                    <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4">Registered On</th>
                  )}
                  <th className="bg-base-100 text-xs text-base-content/60 font-semibold uppercase tracking-wider px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id} className="hover">
                    <td className="px-6 py-4">
                      <div className="font-bold text-base-content text-sm">{user.name}</div>
                      <div className="text-xs text-base-content/50 font-mono">{user.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-base-content/85">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-base-content/75">{user.office || 'N/A'}</td>
                    {currentTab === 'Active' ? (
                      <>
                        <td className="px-6 py-4">
                          <span className="badge badge-ghost badge-sm font-semibold">{user.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="badge badge-success badge-sm font-semibold">{user.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => openEditModal(user)}
                            className="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10"
                          >
                            <Edit size={14} className="mr-1" /> Edit
                          </button>
                          <button 
                            onClick={() => openDeleteModal(user)}
                            className="btn btn-ghost btn-xs text-error font-bold hover:bg-error/10"
                          >
                            <Trash size={14} className="mr-1" /> Delete
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm text-base-content/70">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => handleStatusAction(user._id, 'approve')}
                            className="btn btn-success btn-xs gap-1 font-bold text-white shadow"
                          >
                            <UserCheck size={12} /> Approve
                          </button>
                          <button 
                            onClick={() => handleStatusAction(user._id, 'reject')}
                            className="btn btn-error btn-xs gap-1 font-bold text-white shadow"
                          >
                            <X size={12} /> Reject
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm rounded-3xl border border-base-300">
            <h3 className="text-lg font-bold font-heading mb-4">Edit User Permissions</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-semibold">Full Name</span></label>
                <input 
                  type="text" 
                  required
                  className="input input-bordered input-sm w-full"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-semibold">Employee ID</span></label>
                <input 
                  type="text" 
                  required
                  readOnly={!!(editForm.employeeId && !editForm.employeeId.startsWith('google-'))}
                  className="input input-bordered input-sm w-full read-only:bg-base-200 read-only:text-base-content/50"
                  value={editForm.employeeId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, employeeId: e.target.value }))}
                />
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-semibold">Office</span></label>
                <select 
                  required
                  value={editForm.office}
                  onChange={(e) => setEditForm(prev => ({ ...prev, office: e.target.value }))}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="">Select Office</option>
                  {offices.map(o => <option key={o._id} value={o.officeName} data-officeid={o._id}>{o.officeName}</option>)}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-semibold">Role</span></label>
                <select 
                  required
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="Employee">Employee</option>
                  <option value="Department Head">Department Head</option>
                  <option value="ICTO Staff">ICTO Staff</option>
                  <option value="ICTO Head">ICTO Head</option>
                </select>
              </div>

              <div className="modal-action flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)} 
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingEdit}
                  className="btn btn-primary btn-sm px-6"
                >
                  {savingEdit ? <span className="loading loading-spinner loading-xs"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm rounded-3xl border border-base-300">
            <div className="flex items-center gap-3 text-error mb-3">
              <ShieldAlert size={28} />
              <h3 className="text-lg font-bold font-heading">Delete Account</h3>
            </div>
            <p className="text-xs text-base-content/70 leading-relaxed mb-4">
              Are you sure you want to permanently delete the profile of <strong className="text-base-content">{deletingUser.name}</strong>? This will wipe their support logs.
            </p>
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">
                    Type <strong className="font-bold select-none">{deletingUser.name}</strong> to confirm:
                  </span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Verify profile name"
                  className="input input-bordered input-sm w-full"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>

              <div className="modal-action flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setDeletingUser(null)} 
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={deletingProcess || deleteConfirmText !== deletingUser.name}
                  className="btn btn-error btn-sm px-6 text-white shadow-sm"
                >
                  {deletingProcess ? <span className="loading loading-spinner loading-xs"></span> : 'Delete Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
