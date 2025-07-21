document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SETUP & AUTH ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Page Protection: Only allow ICTO roles to access this page
    if (!currentUser || !currentUser.role.includes('ICTO')) {
        window.location.href = 'app.html';
        return;
    }
    const token = localStorage.getItem('authToken');

    // --- 2. STATE MANAGEMENT ---
    // Keep track of the current state of the dashboard
    let currentPage = 1;
    let totalPages = 1;
    let currentStatus = 'All';
    let currentSearch = '';
    let debounceTimer; // For search input to avoid excessive API calls

    // --- 3. DOM ELEMENT REFERENCES ---
    const tableBody = document.getElementById('tickets-table-body');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const pageInfo = document.getElementById('page-info');

    // --- 4. CORE FUNCTIONS ---

    /**
     * Fetches tickets from the server based on the current state
     * (page, status, search) and renders them.
     */
    async function fetchAndRenderTickets() {
        // Show a loading message while fetching
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Loading tickets...</td></tr>`;

        // Build the URL with query parameters
        const url = new URL('https://lgu-helpdesk-api.onrender.com/tickets');
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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message);
            
            const data = await response.json();
            totalPages = data.totalPages;
            renderTable(data.tickets);
            renderPaginationControls();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-600">Error: ${error.message}</td></tr>`;
        }
    }

    /**
     * Renders the ticket data into the table body.
     * @param {Array} tickets - An array of ticket objects.
     */
    function renderTable(tickets) {
        if (tickets.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No tickets found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = tickets.map(ticket => {
            let badgeColor = 'bg-blue-100 text-blue-800';
            if (ticket.status === 'In Progress') badgeColor = 'bg-yellow-100 text-yellow-800';
            if (ticket.status === 'Resolved') badgeColor = 'bg-green-100 text-green-800';
            if (ticket.status === 'Closed') badgeColor = 'bg-gray-100 text-gray-800';
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${ticket.subject}</div><div class="text-sm text-gray-500">${ticket.category}</div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${ticket.requesterName}</div><div class="text-sm text-gray-500">${ticket.requesterRole}</div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${badgeColor}">${ticket.status}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><a href="ticket-details.html?id=${ticket.id}" class="text-sky-600 hover:text-sky-900">View</a></td>
                </tr>`;
        }).join('');
    }

    /**
     * Updates the pagination controls (buttons and page info).
     */
    function renderPaginationControls() {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage >= totalPages;
    }

    // --- 5. EVENT LISTENERS ---
    statusFilter.addEventListener('change', () => {
        currentStatus = statusFilter.value;
        currentPage = 1; // Reset to first page on new filter
        fetchAndRenderTickets();
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        // Debounce to avoid API calls on every keystroke
        debounceTimer = setTimeout(() => {
            currentSearch = searchInput.value;
            currentPage = 1; // Reset to first page on new search
            fetchAndRenderTickets();
        }, 500); 
    });

    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAndRenderTickets();
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchAndRenderTickets();
        }
    });

    // --- 6. INITIAL LOAD ---
    fetchAndRenderTickets();
});
