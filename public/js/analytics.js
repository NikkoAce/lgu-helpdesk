document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SETUP & AUTH ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Page protection: Only allow ICTO Head to see this page
    if (!currentUser || currentUser.role !== 'ICTO Head') {
        // Redirect non-admins to the main dashboard
        window.location.href = 'app.html';
        // It's good practice to add an alert for better user experience
        alert('Access Denied: This page is for administrators only.');
        return;
    }
    const token = localStorage.getItem('authToken');

    // --- 2. DOM ELEMENT REFERENCES ---
    const statsContainer = document.getElementById('stats-cards-container');
    const chartCanvas = document.getElementById('status-chart');

    // --- 3. CORE FUNCTIONS ---
    async function fetchAndRenderAnalytics() {
        try {
            const response = await fetch('https://lgu-helpdesk-copy.onrender.com/analytics/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message);
            
            const summary = await response.json();
            renderStatCards(summary);
            renderStatusChart(summary);

        } catch (error) {
            statsContainer.innerHTML = `<div class="col-span-full text-center p-4 bg-red-100 text-red-700 rounded-lg">Error: ${error.message}</div>`;
        }
    }

    /**
     * Renders the summary data into stat cards.
     * @param {object} summary - The analytics data from the server.
     */
    function renderStatCards(summary) {
        statsContainer.innerHTML = `
            <div class="overflow-hidden rounded-lg bg-white p-5 shadow">
                <dt class="truncate text-sm font-medium text-gray-500">Total Tickets</dt>
                <dd class="mt-1 text-3xl font-semibold tracking-tight text-gray-900">${summary.totalTickets}</dd>
            </div>
            <div class="overflow-hidden rounded-lg bg-white p-5 shadow">
                <dt class="truncate text-sm font-medium text-gray-500">New</dt>
                <dd class="mt-1 text-3xl font-semibold tracking-tight text-blue-600">${summary.new}</dd>
            </div>
            <div class="overflow-hidden rounded-lg bg-white p-5 shadow">
                <dt class="truncate text-sm font-medium text-gray-500">In Progress</dt>
                <dd class="mt-1 text-3xl font-semibold tracking-tight text-yellow-600">${summary.inProgress}</dd>
            </div>
            <div class="overflow-hidden rounded-lg bg-white p-5 shadow">
                <dt class="truncate text-sm font-medium text-gray-500">Resolved</dt>
                <dd class="mt-1 text-3xl font-semibold tracking-tight text-green-600">${summary.resolved}</dd>
            </div>
             <div class="overflow-hidden rounded-lg bg-white p-5 shadow">
                <dt class="truncate text-sm font-medium text-gray-500">Closed</dt>
                <dd class="mt-1 text-3xl font-semibold tracking-tight text-gray-600">${summary.closed}</dd>
            </div>
        `;
    }

    /**
     * Renders a doughnut chart showing the breakdown of tickets by status.
     * @param {object} summary - The analytics data from the server.
     */
    function renderStatusChart(summary) {
        const ctx = chartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['New', 'In Progress', 'Resolved', 'Closed'],
                datasets: [{
                    label: 'Tickets by Status',
                    data: [summary.new, summary.inProgress, summary.resolved, summary.closed],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',  // Blue
                        'rgba(245, 158, 11, 0.8)', // Yellow
                        'rgba(22, 163, 74, 0.8)',  // Green
                        'rgba(107, 114, 128, 0.8)' // Gray
                    ],
                    borderColor: [
                        'rgba(59, 130, 246, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(22, 163, 74, 1)',
                        'rgba(107, 114, 128, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    // --- 4. INITIAL LOAD ---
    fetchAndRenderAnalytics();
});
