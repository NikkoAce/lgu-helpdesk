/**
 * Creates and displays a toast notification.
 * @param {string} message - The message to display in the toast.
 * @param {string} [type='success'] - The type of toast ('success' or 'error').
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.role = 'alert';

    // Use DaisyUI alert classes
    let alertClass = 'alert-success';
    if (type === 'error') {
        alertClass = 'alert-error';
    }
    alert.className = `alert ${alertClass} shadow-lg transition-all duration-300 ease-in-out`;

    const iconSvg = type === 'success' 
        ? `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

    alert.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;

    // Add toast to the container
    container.appendChild(alert);

    // Auto-remove the toast after 5 seconds
    setTimeout(() => {
        if (alert) {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

const API_BASE_URL = 'https://lgu-helpdesk-copy.onrender.com';
const PORTAL_LOGIN_URL = 'https://lgu-employee-portal.netlify.app/index.html';

// --- Global State ---
let currentUser = null;
let dashboardCurrentPage = 1;
let dashboardTotalPages = 1;

/**
 * Checks authentication, fetches user data, and initializes the application.
 */
async function initializeApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include', // Crucial for sending the HttpOnly cookie
        });

        if (!response.ok) {
            // If the cookie is invalid or expired, the server returns an error (e.g., 401).
            // Redirect to the main portal login page.
            window.location.href = PORTAL_LOGIN_URL;
            return;
        }

        currentUser = await response.json();

        // --- If authenticated, render all page components ---
        renderSidebar();
        renderHeader();

        // Only render dashboard-specific components if they exist on the current page
        if (document.getElementById('dashboard-stats-container')) {
            renderDashboardAnalytics();
        }
        if (document.getElementById('ticket-list-container')) {
            renderTickets();
        }

    } catch (error) {
        console.error("Initialization failed:", error);
        // On any failure, assume not authenticated and redirect.
        window.location.href = PORTAL_LOGIN_URL;
    }
}

/**
 * Fetches and renders the personalized stat cards for the dashboard.
 */
async function renderDashboardAnalytics() {
    const statsContainer = document.getElementById('dashboard-stats-container');
    if (!statsContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard-summary`, {
            credentials: 'include' // Use cookie for authentication
        });
        if (!response.ok) throw new Error((await response.json()).message);
        
        const summary = await response.json();

        statsContainer.innerHTML = `
            <div class="stat">
                <div class="stat-title">Your Total Tickets</div>
                <div class="stat-value">${summary.total}</div>
            </div>
            <div class="stat">
                <div class="stat-title">New</div>
                <div class="stat-value text-info">${summary.new}</div>
            </div>
            <div class="stat">
                <div class="stat-title">In Progress</div>
                <div class="stat-value text-warning">${summary.inProgress}</div>
            </div>
            <div class="stat">
                <div class="stat-title">Resolved</div>
                <div class="stat-value text-success">${summary.resolved}</div>
            </div>
        `;
    } catch (error) {
        statsContainer.innerHTML = `<div class="col-span-full text-center p-4 bg-red-100 text-red-700 rounded-lg">Error loading summary: ${error.message}</div>`;
    }
}

/**
 * Fetches a page of tickets and renders them as cards on the dashboard.
 */
async function renderTickets() {
    const ticketContainer = document.getElementById('ticket-list-container');
    if (!ticketContainer) return;

    const loadingMessage = document.getElementById('loading-message');
    try {
        const url = new URL(`${API_BASE_URL}/api/tickets`);
        url.searchParams.append('page', dashboardCurrentPage);
        url.searchParams.append('limit', 5); // Show 5 tickets per page on dashboard

        const response = await fetch(url, {
            credentials: 'include' // Use cookie for authentication
        });
        if (!response.ok) throw new Error(`Failed to fetch tickets.`);
        
        const data = await response.json();
        const tickets = data.tickets;
        dashboardTotalPages = data.totalPages;
        
        if(loadingMessage) loadingMessage.style.display = 'none';

        if (!tickets || tickets.length === 0) {
            ticketContainer.innerHTML = '<p class="text-gray-600">No support tickets found.</p>';
            const paginationControls = document.getElementById('dashboard-pagination-controls');
            if (paginationControls) paginationControls.style.display = 'none';
            return;
        }

        const ticketsHTML = tickets.map(ticket => {
            let badgeClass = 'badge-info';
            if (ticket.status === 'In Progress') badgeClass = 'badge-warning';
            if (ticket.status === 'Resolved') badgeClass = 'badge-success';
            if (ticket.status === 'Closed') badgeClass = 'badge-ghost';

            return `
                <div class="card card-compact bg-base-100 border mb-4 hover:shadow-md transition-shadow duration-200">
                    <div class="card-body">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex-grow pr-4">
                                <h3 class="card-title text-base">${ticket.subject}</h3>
                                <p class="text-xs text-base-content/60">#${ticket.id} &bull; ${ticket.requesterName} &bull; ${new Date(ticket.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div class="card-actions items-center">
                                <span class="badge ${badgeClass} badge-sm">${ticket.status}</span>
                                <a href="ticket-details.html?id=${ticket.id}" class="btn btn-ghost btn-xs">View Details</a>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
        ticketContainer.innerHTML = ticketsHTML;
        renderDashboardPagination();
    } catch (error) {
        if (loadingMessage) {
            loadingMessage.textContent = `Error: ${error.message}`;
            loadingMessage.className = 'text-red-600 font-semibold';
        } else {
            console.error("Error rendering tickets:", error.message);
        }
    }
}

/**
 * Populates the sidebar navigation based on the user's role.
 */
function renderSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav || !currentUser) return;

    const navLinksData = {
        common: [
            { name: 'Dashboard', href: 'app.html', icon: getIcon('home') },
            { name: 'New Ticket', href: 'new-ticket.html', icon: getIcon('ticket') },
        ],
        icto: [{ name: 'All Tickets', href: 'tickets.html', icon: getIcon('document') }],
        admin: [
            { name: 'Analytics', href: 'analytics.html', icon: getIcon('chart') },
            { name: 'User Management', href: 'users.html', icon: getIcon('users') },
        ]
    };

    let linksToRender = [];
    if (currentUser.role.includes('ICTO')) {
        linksToRender = [navLinksData.common[0], ...navLinksData.icto, navLinksData.common[1]];
    } else {
        linksToRender = navLinksData.common;
    }
    if (currentUser.role === 'ICTO Head') {
        linksToRender.push(...navLinksData.admin);
    }

    const currentPage = window.location.pathname.split('/').pop();
    sidebarNav.innerHTML = linksToRender.map(link => {
        const isActive = link.href === currentPage;
        const activeClass = 'bg-sky-600 text-white';
        const inactiveClass = 'text-slate-300 hover:bg-slate-700 hover:text-white';
        return `
            <a href="${link.href}" class="flex items-center rounded-md px-4 py-2 text-sm font-medium ${isActive ? activeClass : inactiveClass}">
                ${link.icon}<span>${link.name}</span>
            </a>`;
    }).join('');
}

/**
 * Populates the header with the current user's information.
 */
function renderHeader() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo || !currentUser) return;
    userInfo.innerHTML = `
        <p class="text-sm font-semibold text-gray-800">${currentUser.name}</p>
        <p class="text-xs text-gray-500">${currentUser.role}</p>`;
}

/**
 * Returns SVG strings for icons.
 */
function getIcon(name) {
    const icons = {
        home: `<svg class="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
        ticket: `<svg class="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>`,
        document: `<svg class="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
        chart: `<svg class="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
        users: `<svg class="mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 003 14v1a6 6 0 006 6h6m-9-5.197a6.002 6.002 0 009 0"/></svg>`,
    };
    return icons[name] || '';
}

/**
 * Updates the pagination controls on the dashboard.
 */
function renderDashboardPagination() {
    const pageInfo = document.getElementById('dashboard-page-info');
    const prevButton = document.getElementById('dashboard-prev-button');
    const nextButton = document.getElementById('dashboard-next-button');
    const pageNumber = document.getElementById('dashboard-page-number');

    if (!pageInfo || !prevButton || !nextButton || !pageNumber) return;

    pageInfo.textContent = `Page ${dashboardCurrentPage} of ${dashboardTotalPages}`;
    pageNumber.textContent = dashboardCurrentPage;
    prevButton.disabled = dashboardCurrentPage === 1;
    nextButton.disabled = dashboardCurrentPage >= dashboardTotalPages;
}

/**
 * Sets up all non-authentication-dependent event listeners.
 */
function setupEventListeners() {
    // Sign Out Button
    const signOutButton = document.getElementById('signout-button');
    if (signOutButton) {
        signOutButton.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch (error) {
                console.error('Logout request failed:', error);
            } finally {
                // Always redirect to the portal login page after attempting to log out.
                window.location.href = PORTAL_LOGIN_URL;
            }
        });
    }

    // Dashboard Pagination
    const prevButton = document.getElementById('dashboard-prev-button');
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (dashboardCurrentPage > 1) {
                dashboardCurrentPage--;
                renderTickets();
            }
        });
    }

    const nextButton = document.getElementById('dashboard-next-button');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (dashboardCurrentPage < dashboardTotalPages) {
                dashboardCurrentPage++;
                renderTickets();
            }
        });
    }

    // Mobile Responsiveness
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    // The menu button is now a label for the drawer, so this JS is no longer needed.
    // The drawer is handled by a hidden checkbox and CSS.
}

// This function is now called from each page's specific JS file.
