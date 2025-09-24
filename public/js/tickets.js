async function initializeTicketsPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            window.location.href = PORTAL_LOGIN_URL;
            return;
        }
        const currentUser = await response.json();

        // Page Protection: Only allow ICTO roles to access this page
        if (!currentUser.role.includes('ICTO')) {
            alert('Access Denied: This page is for ICTO staff only.');
            window.location.href = 'app.html';
            return;
        }

        // If authorized, set up the page and fetch initial data
        setupTicketPageEventListeners(); // Rename to avoid conflict
        fetchAndRenderTickets();
    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = PORTAL_LOGIN_URL;
    }
}
    let currentPage = 1;
    let totalPages = 1;
    let currentStatus = 'All';
    let currentSearch = '';
    let debounceTimer; // For search input to avoid excessive API calls


    /**
     * Fetches tickets from the server based on the current state
     * (page, status, search) and renders them.
     */
    async function fetchAndRenderTickets() {
        const tableBody = document.getElementById('tickets-table-body');
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4"><span class="loading loading-spinner"></span></td></tr>`;

        // Build the URL with query parameters
        const url = new URL(`${API_BASE_URL}/api/tickets`);
        url.searchParams.append('page', currentPage);
        url.searchParams.append('limit', 10); // Show 10 tickets per page
        if (currentStatus !== 'All') {
            url.searchParams.append('status', currentStatus);
        }
        if (currentSearch) {
            url.searchParams.append('search', currentSearch);
        }

        try {
            const response = await fetch(url, {
                credentials: 'include' // Use cookie for authentication
            });
            if (!response.ok) throw new Error((await response.json()).message);
            
            const data = await response.json();
            totalPages = data.totalPages;
            renderTable(data.tickets);
            renderPaginationControls();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-error">Error: ${error.message}</td></tr>`;
        }
    }

    /**
     * Renders the ticket data into the table body.
     * @param {Array} tickets - An array of ticket objects.
     */
    function renderTable(tickets) {
        const tableBody = document.getElementById('tickets-table-body');
        if (tickets.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4">No tickets found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = tickets.map(ticket => {
            let badgeClass = 'badge-info';
            if (ticket.status === 'In Progress') badgeClass = 'badge-warning';
            if (ticket.status === 'Resolved') badgeClass = 'badge-success';
            if (ticket.status === 'Closed') badgeClass = 'badge-ghost';
            return `
                <tr class="hover">
                    <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${ticket.subject}</div><div class="text-sm text-gray-500">${ticket.category}</div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${ticket.requesterName}</div><div class="text-sm text-gray-500">${ticket.requesterRole}</div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="badge badge-sm ${badgeClass}">${ticket.status}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><a href="ticket-details.html?id=${ticket.id}" class="btn btn-ghost btn-xs">View</a></td>
                </tr>`;
        }).join('');
    }

    /**
     * Updates the pagination controls (buttons and page info).
     */
    function renderPaginationControls() {
        const prevButton = document.getElementById('prev-button');
        const nextButton = document.getElementById('next-button');
        const pageInfo = document.getElementById('page-info');
        const pageNumber = document.getElementById('page-number');

        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageNumber.textContent = currentPage;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage >= totalPages;
    }

    // --- 5. EVENT LISTENERS ---
function setupTicketPageEventListeners() {
    setupEventListeners(); // Call the main event listener setup from app.js

    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentStatus = statusFilter.value;
            currentPage = 1; // Reset to first page on new filter
            fetchAndRenderTickets();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            // Debounce to avoid API calls on every keystroke
            debounceTimer = setTimeout(() => {
                currentSearch = searchInput.value;
                currentPage = 1; // Reset to first page on new search
                fetchAndRenderTickets();
            }, 500);
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                fetchAndRenderTickets();
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                fetchAndRenderTickets();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeTicketsPage);
