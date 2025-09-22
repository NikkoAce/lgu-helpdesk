const API_BASE_URL = 'https://lgu-helpdesk-copy.onrender.com';
const PORTAL_LOGIN_URL = 'https://lgu-employee-portal.netlify.app/index.html';

async function initializeAnalyticsPage() {
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

        // Page protection: Only allow ICTO Head to see this page
        if (currentUser.role !== 'ICTO Head') {
            alert('Access Denied: This page is for administrators only.');
            window.location.href = 'app.html';
            return;
        }

        // If authorized, fetch the analytics data
        fetchAndRenderAnalytics();

    } catch (error) {
        console.error("Authentication failed:", error);
        window.location.href = PORTAL_LOGIN_URL;
    }
}

async function fetchAndRenderAnalytics() {
    const statsContainer = document.getElementById('stats-cards-container');
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/summary`, {
            credentials: 'include' // Use cookie for authentication
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
        const statsContainer = document.getElementById('stats-cards-container');
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
        const chartCanvas = document.getElementById('status-chart');
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

document.addEventListener('DOMContentLoaded', initializeAnalyticsPage);
