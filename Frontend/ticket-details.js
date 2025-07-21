document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SETUP & AUTH ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = 'login.html'; return; }
    const token = localStorage.getItem('authToken');

    // --- 2. DOM ELEMENT REFERENCES ---
    const container = document.getElementById('ticket-details-container');
    const loadingMessage = document.getElementById('loading-message');
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');

    if (!ticketId) { loadingMessage.textContent = 'Error: No ticket ID provided.'; return; }

    // --- 3. CORE FUNCTIONS ---
    async function fetchTicketDetails() {
        try {
            const response = await fetch(`http://localhost:3000/tickets/${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message);
            const ticket = await response.json();
            loadingMessage.style.display = 'none';
            renderTicketPage(ticket);
        } catch (error) {
            loadingMessage.textContent = `Error: ${error.message}`;
        }
    }

    function renderTicketPage(ticket) {
        const ticketHTML = `
            <div class="mx-auto max-w-4xl">
                <!-- Header, Details, etc. -->
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p class="text-sm text-gray-500">Ticket #${ticket.id}</p>
                        <h1 class="text-3xl font-bold text-gray-800">${ticket.subject}</h1>
                    </div>
                    <div class="mt-1">
                        <span id="status-badge" class="text-lg font-medium px-4 py-1.5 rounded-full ${getBadgeColor(ticket.status)}">${ticket.status}</span>
                    </div>
                </div>
                <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="md:col-span-1 space-y-6">
                        <div class="rounded-lg border bg-white p-4 shadow-sm">
                            <h2 class="text-lg font-semibold text-gray-800 mb-4">Details</h2>
                            <div class="space-y-3 text-sm">
                                <div class="flex justify-between"><span class="font-medium text-gray-500">Requester:</span><span class="text-gray-800 text-right">${ticket.requesterName}</span></div>
                                <div class="flex justify-between"><span class="font-medium text-gray-500">Department:</span><span class="text-gray-800 text-right">${ticket.requesterRole}</span></div>
                                <div class="flex justify-between"><span class="font-medium text-gray-500">Created:</span><span class="text-gray-800 text-right">${new Date(ticket.createdAt).toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div id="admin-actions" class="hidden">
                           <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <h2 class="text-lg font-semibold text-gray-800 mb-4">Actions</h2>
                                <form id="update-status-form">
                                    <label for="status-select" class="block text-sm font-medium text-gray-700">Update Status</label>
                                    <select id="status-select" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500">
                                        <option value="New">New</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                    <div id="update-message" class="text-sm mt-2"></div>
                                    <button type="submit" class="mt-4 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Update</button>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="rounded-lg border bg-white p-6 shadow-sm">
                            <h2 class="text-lg font-semibold text-gray-800">Description</h2>
                            <p class="mt-2 text-gray-700 whitespace-pre-wrap">${ticket.description}</p>
                        </div>
                        <div class="mt-8">
                            <h2 class="text-xl font-semibold text-gray-800 mb-4">Conversation</h2>
                            <div id="comment-list" class="space-y-4"></div>
                            <form id="comment-form" class="mt-6">
                               <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                    <label for="comment-content" class="text-sm font-medium text-gray-700">Add a reply</label>
                                    <textarea id="comment-content" name="content" rows="4" required class="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="Type your message..."></textarea>
                                    <div id="comment-error" class="text-sm text-red-600 mt-1"></div>
                                    <div class="mt-3 text-right">
                                        <button type="submit" class="inline-flex items-center justify-center rounded-md border border-transparent bg-sky-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">Submit Reply</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = ticketHTML;
        // Setup all interactive components
        renderComments(ticket.comments || []);
        setupCommentForm();
        setupAdminActions(ticket);
    }

    function getBadgeColor(status) {
        if (status === 'In Progress') return 'bg-yellow-100 text-yellow-800';
        if (status === 'Resolved') return 'bg-green-100 text-green-800';
        if (status === 'Closed') return 'bg-gray-100 text-gray-800';
        return 'bg-blue-100 text-blue-800'; // Default for 'New'
    }

    function renderComments(comments) {
        const commentList = document.getElementById('comment-list');
        if (!commentList) return;
        if (comments.length === 0) {
            commentList.innerHTML = '<div class="text-center py-4"><p class="text-gray-500">No comments yet.</p></div>';
            return;
        }
        commentList.innerHTML = comments.map(comment => `
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div class="flex items-center justify-between"><p class="font-semibold text-gray-800">${comment.author}</p><p class="text-xs text-gray-500">${new Date(comment.createdAt).toLocaleString()}</p></div>
                <p class="mt-2 text-gray-700 whitespace-pre-wrap">${comment.content}</p>
            </div>`).join('');
    }

    function setupCommentForm() {
        const commentForm = document.getElementById('comment-form');
        if (!commentForm) return;
        commentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const content = event.target.content.value.trim();
            const author = currentUser.name;
            const commentError = document.getElementById('comment-error');
            commentError.textContent = '';
            if (!content) {
                commentError.textContent = 'Comment cannot be empty.';
                return;
            }
            try {
                const response = await fetch(`http://localhost:3000/tickets/${ticketId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ author, content })
                });
                if (!response.ok) throw new Error((await response.json()).message);
                const updatedComments = await response.json();
                renderComments(updatedComments);
                event.target.reset();
            } catch (error) {
                commentError.textContent = `Error: ${error.message}`;
            }
        });
    }

    function setupAdminActions(ticket) {
        const adminPanel = document.getElementById('admin-actions');
        if (currentUser.role && currentUser.role.includes('ICTO')) {
            adminPanel.classList.remove('hidden');
        } else {
            return;
        }

        const statusSelect = document.getElementById('status-select');
        const updateForm = document.getElementById('update-status-form');
        const updateMessage = document.getElementById('update-message');
        
        statusSelect.value = ticket.status;

        updateForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const newStatus = statusSelect.value;
            updateMessage.textContent = '';
            updateMessage.className = 'text-sm mt-2';
            try {
                const response = await fetch(`http://localhost:3000/tickets/${ticketId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ status: newStatus })
                });
                if (!response.ok) throw new Error((await response.json()).message);
                const updatedTicket = await response.json();
                const statusBadge = document.getElementById('status-badge');
                statusBadge.textContent = updatedTicket.status;
                statusBadge.className = `text-lg font-medium px-4 py-1.5 rounded-full ${getBadgeColor(updatedTicket.status)}`;
                updateMessage.textContent = 'Status updated successfully!';
                updateMessage.classList.add('text-green-600');
            } catch (error) {
                updateMessage.textContent = `Error: ${error.message}`;
                updateMessage.classList.add('text-red-600');
            }
        });
    }

    fetchTicketDetails();
});
