// FILE: d:/Programming/_ITHELPDESK/frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { fetchWithAuth } from './utils/api';
import type { HelpdeskUser } from './utils/api';

// Page Imports
import { Dashboard } from './pages/Dashboard';
import { NewTicket } from './pages/NewTicket';
import { Tickets } from './pages/Tickets';
import { TicketDetails } from './pages/TicketDetails';
import { Users } from './pages/Users';
import { Analytics } from './pages/Analytics';

import { 
  Home, 
  FileText, 
  FileSpreadsheet, 
  BarChart2, 
  Users as UsersIcon, 
  ArrowLeftRight, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';

const isProduction = window.location.hostname === 'lgu-ithelpdesk.netlify.app';
const PORTAL_URL = isProduction ? 'https://lgu-employee-portal.netlify.app' : 'http://localhost:5501';

interface NavLinkItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<HelpdeskUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth<HelpdeskUser>('auth/me');
        setCurrentUser(data);
      } catch (err) {
        console.error('Helpdesk authentication check failed, redirecting to portal...', err);
        // Redirect to Portal login
        window.location.href = `${PORTAL_URL}/login`;
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetchWithAuth('auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      window.location.href = `${PORTAL_URL}/login`;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-300">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm opacity-60 mt-3 font-heading">Checking workstation access...</p>
      </div>
    );
  }

  if (!currentUser) return null;

  // Build navigation items based on role
  const commonLinks: NavLinkItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: <Home size={18} /> },
    { name: 'New Ticket', href: '/new-ticket', icon: <FileText size={18} /> }
  ];

  const ictoLinks: NavLinkItem[] = [
    { name: 'All Tickets', href: '/tickets', icon: <FileSpreadsheet size={18} /> }
  ];

  const adminLinks: NavLinkItem[] = [
    { name: 'Analytics', href: '/analytics', icon: <BarChart2 size={18} /> },
    { name: 'User Management', href: '/users', icon: <UsersIcon size={18} /> }
  ];

  const isIcto = currentUser.role && currentUser.role.includes('ICTO');
  const navLinks = isIcto 
    ? [...commonLinks, ...ictoLinks, ...adminLinks] 
    : commonLinks;

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-base-200 flex flex-col lg:flex-row relative">
      
      {/* Mobile Header Bar */}
      <header className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <img src="/LGU-DAET-LOGO.png" alt="LGU Logo" className="h-8 w-8 rounded-full object-contain" />
          <span className="text-lg font-bold font-heading">IT Helpdesk Hub</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn btn-square btn-ghost text-white"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar Aside */}
      <aside className={`
        flex w-64 flex-col bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-50 
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:h-screen lg:z-30
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-36 flex-col items-center justify-center border-b border-slate-800 px-6 gap-3">
          <img src="/LGU-DAET-LOGO.png" alt="LGU Seal" className="h-14 w-14 rounded-full object-contain" />
          <span className="text-sm font-extrabold text-white font-heading tracking-wider">LGU Daet IT Helpdesk</span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = currentPath === link.href || (link.href !== '/dashboard' && currentPath.startsWith(link.href));
            return (
              <button 
                key={link.href}
                onClick={() => { navigate(link.href); setSidebarOpen(false); }}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold w-full text-left transition-colors duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-content shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Link back to Portal */}
        <div className="p-4 border-t border-slate-800">
          <a 
            href={`${PORTAL_URL}/dashboard`} 
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeftRight size={18} />
            <span>Back to Portal</span>
          </a>
        </div>

        {/* User Card & Signout */}
        <div className="border-t border-slate-800 p-4 space-y-4">
          <div className="text-left px-2">
            <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider truncate mt-0.5">{currentUser.role}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="btn btn-error btn-sm text-white w-full rounded-xl gap-2 font-bold"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Contents Panel */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-ticket" element={<NewTicket />} />
          <Route path="/ticket/:id" element={<TicketDetails currentUser={currentUser} />} />
          
          {/* Protected admin/icto routes */}
          {isIcto ? (
            <>
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<Users />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          )}
        </Routes>
      </main>

    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
