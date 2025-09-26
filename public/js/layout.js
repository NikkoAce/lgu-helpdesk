/**
 * Renders the sidebar navigation based on the user's role.
 * @param {object} currentUser - The currently authenticated user object.
 */
function renderSidebar(currentUser) {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer || !currentUser) return;

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
    if (currentUser && currentUser.role && currentUser.role.includes('ICTO')) { // ICTO Staff and ICTO Head
        linksToRender = [...navLinksData.common, ...navLinksData.icto, ...navLinksData.admin];
    } else { // Regular Employees and Department Heads
        linksToRender = navLinksData.common;
    }

    const currentPage = window.location.pathname.split('/').pop();
    const navHTML = linksToRender.map(link => {
        const isActive = link.href === currentPage;
        const activeClass = 'bg-sky-600 text-white';
        const inactiveClass = 'text-slate-300 hover:bg-slate-700 hover:text-white';
        return `
            <a href="${link.href}" class="flex items-center rounded-md px-4 py-2 text-sm font-medium ${isActive ? activeClass : inactiveClass}">
                ${link.icon}<span>${link.name}</span>
            </a>`;
    }).join('');

    sidebarContainer.innerHTML = `
        <!-- Mobile Overlay -->
        <div id="overlay" class="fixed inset-0 z-30 hidden bg-black bg-opacity-50 lg:hidden"></div>
        <!-- Sidebar -->
        <aside id="sidebar" class="flex w-64 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 z-40 -translate-x-full lg:fixed lg:translate-x-0 lg:h-screen">
            <div class="flex h-32 flex-col items-center justify-center border-b border-slate-700 px-4">
                <img src="images/LGU-DAET LOGO.jpg" alt="LGU Logo" class="h-16 w-16 rounded-full object-contain">
                <span class="text-lg font-bold text-white">LGU-Daet IT Helpdesk</span>
            </div>
            <nav class="flex-1 space-y-2 p-4">${navHTML}</nav>
            
            <!-- Sidebar Footer with User Info -->
            <div class="border-t border-slate-700 p-4">
                <div class="text-left">
                    <p class="text-sm font-semibold text-white">${currentUser.name}</p>
                    <p class="text-xs text-slate-400">${currentUser.role}</p>
                </div>
                <button id="signout-button" class="btn btn-error btn-sm text-white w-full mt-4">Sign Out</button>
            </div>
        </aside>
    `;
}

/**
 * Renders the header with user info and sign-out button.
 * @param {object} currentUser - The currently authenticated user object.
 */
function renderHeader(currentUser) {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer || !currentUser) return;

    // This header will only contain the mobile menu button.
    // It will be hidden on large screens where the sidebar is always visible.
    headerContainer.innerHTML = `
        <header class="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
            <span class="text-lg font-bold">LGU-Daet IT Helpdesk</span>
            <button id="mobile-menu-button" class="btn btn-square btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
        </header>
    `;
}

/**
 * Sets up event listeners for the main layout components (sidebar, header).
 */
function setupLayoutEventListeners() {
    // Sign Out Button
    // We use event delegation on the document in case the button isn't rendered yet.
    document.addEventListener('click', async (event) => {
        if (event.target && event.target.id === 'signout-button') {
            try {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch (error) {
                console.error('Logout request failed:', error);
            } finally {
                window.location.href = PORTAL_LOGIN_URL;
            }
        }
    });

    // --- NEW: Mobile Menu Button to OPEN the sidebar ---
    document.addEventListener('click', (event) => {
        // Use .closest() to handle clicks on the button or its SVG icon
        if (event.target.closest('#mobile-menu-button')) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');
            }
        }
    });

    // Mobile Responsiveness for closing the sidebar
    document.addEventListener('click', (event) => {
        // Also handle clicking the overlay to close the menu
        if (event.target.id === 'overlay') {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar && overlay) {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            }
        }
    });
}