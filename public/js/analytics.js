async function initializeAnalyticsPage() {
    // Page protection: Only allow ICTO personnel to see this page
    if (!currentUser || !currentUser.role.includes('ICTO')) {
        alert('Access Denied: This page is for ICTO personnel only.');
        window.location.href = 'app.html';
        return;
    }
    // If authorized, fetch the analytics data
    fetchAndRenderAnalytics();
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
            <div class="stat">
                <div class="stat-title">Total Tickets</div>
                <div class="stat-value">${summary.totalTickets}</div>
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
             <div class="stat">
                <div class="stat-title">Closed</div>
                <div class="stat-value text-base-content/60">${summary.closed}</div>
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

        // Store the chart instance in a variable
        const statusChart = new Chart(ctx, {
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

        // Add event listener for the export button
        const exportBtn = document.getElementById('export-chart-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = statusChart.toBase64Image();
                link.download = 'ticket-status-summary.png';
                link.click();
            });
        }
    }
