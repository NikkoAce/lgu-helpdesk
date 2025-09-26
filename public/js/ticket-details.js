async function initializeTicketDetailsPage() {
    try {
        // Now that we are authenticated, fetch the ticket details
        fetchTicketDetails();

    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = PORTAL_LOGIN_URL;
    }
}

async function fetchTicketDetails() {
    const loadingMessage = document.getElementById('loading-message');
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');

    if (!ticketId) { loadingMessage.textContent = 'Error: No ticket ID provided.'; return; }

        try {
            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, { credentials: 'include' });
            if (!response.ok) throw new Error((await response.json()).message);
            const ticket = await response.json();
            loadingMessage.style.display = 'none';
            renderTicketPage(ticket);
        } catch (error) {
            loadingMessage.textContent = `Error: ${error.message}`;
        }
}

    function renderTicketPage(ticket) {
        const container = document.getElementById('ticket-details-container');
        const ticketHTML = `
            <div class="mx-auto max-w-4xl">
                <!-- Header, Details, etc. -->
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p class="text-sm text-base-content/70">Ticket #${ticket.id}</p>
                        <h1 class="text-3xl font-bold text-gray-800">${ticket.subject}</h1>
                    </div>
                    <div class="mt-1">
                        <span id="status-badge" class="badge badge-lg ${getBadgeColor(ticket.status)}">${ticket.status}</span>
                    </div>
                </div>
                <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="md:col-span-1 space-y-6">
                        <div class="card card-compact bg-base-100 border">
                            <div class="card-body">
                            <h2 class="card-title">Details</h2>
                            <div class="space-y-3 text-sm">
                                <div class="flex justify-between"><span class="font-medium text-base-content/70">Requester:</span><span class="text-base-content text-right">${ticket.requesterName}</span></div>
                                <div class="flex justify-between"><span class="font-medium text-base-content/70">Office:</span><span class="text-base-content text-right">${ticket.requesterOffice || 'N/A'}</span></div>
                                <div class="flex justify-between"><span class="font-medium text-base-content/70">Department:</span><span class="text-base-content text-right">${ticket.requesterRole}</span></div>
                                <div class="flex justify-between"><span class="font-medium text-base-content/70">Created:</span><span class="text-base-content text-right">${new Date(ticket.createdAt).toLocaleString()}</span></div>
                            </div>
                            </div>
                        </div>
                        <div id="admin-actions" class="hidden">
                           <div class="card card-compact bg-base-100 border">
                            <div class="card-body">
                                <h2 class="card-title">Actions</h2>
                                <form id="update-status-form">
                                    <label for="status-select" class="label"><span class="label-text">Update Status</span></label>
                                    <select id="status-select" class="select select-bordered w-full">
                                        <option value="New">New</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                    <button type="submit" class="btn btn-primary w-full mt-4">Update</button>
                                </form>
                            </div>
                            </div>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="card bg-base-100 border">
                            <div class="card-body">
                                <h2 class="card-title">Description</h2>
                                <p class="mt-2 text-base-content whitespace-pre-wrap">${ticket.description}</p>
                            </div>
                        </div>
                        <div class="mt-8">
                            <h2 class="text-xl font-semibold text-gray-800 mb-4">Conversation</h2>
                            <div id="comment-list" class="space-y-4"></div>
                            <form id="comment-form" class="mt-6">
                               <div class="card bg-base-100 border">
                                <div class="card-body">
                                    <label for="comment-content" class="label"><span class="label-text">Add a reply</span></label>
                                    <textarea id="comment-content" name="content" rows="4" required class="textarea textarea-bordered" placeholder="Type your message..."></textarea>
                                    
                                    <!-- FIXED: Added the file input HTML here -->
                                    <div class="mt-3">
                                        <label for="attachment" class="label"><span class="label-text">Attach a file (optional)</span></label>
                                        <input type="file" id="attachment" name="attachment" class="file-input file-input-bordered w-full" />
                                        <p id="file-preview" class="mt-2 text-sm text-gray-600"></p>
                                    </div>

                                    <div class="card-actions justify-end mt-2">
                                        <button type="submit" class="btn btn-primary">Submit Reply</button>
                                    </div>
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
        if (status === 'In Progress') return 'badge-warning';
        if (status === 'Resolved') return 'badge-success';
        if (status === 'Closed') return 'badge-ghost';
        return 'badge-info'; // Default for 'New'
    }

     function renderComments(comments) {
        const commentList = document.getElementById('comment-list');
        if (!commentList) return;
        if (comments.length === 0) {
            commentList.innerHTML = '<div class="text-center py-4"><p class="text-gray-500">No comments yet.</p></div>';
            return;
        }
        commentList.innerHTML = comments.map(comment => {
            // NEW: Conditionally render the delete button for ICTO staff
            const showDeleteButton = currentUser.role.includes('ICTO') && comment.attachmentUrl;
            
            return `
            <div class="card card-compact bg-base-100 border">
                <div class="card-body">
                    <div class="flex items-center justify-between">
                        <p class="font-semibold">${comment.author}</p>
                        <p class="text-xs text-base-content/70">${new Date(comment.createdAt).toLocaleString()}</p>
                    </div>
                    <p class="mt-2 whitespace-pre-wrap">${comment.content}</p>
                    ${comment.attachmentUrl ? `
                    <div class="card-actions items-center">
                        <a href="${comment.attachmentUrl}" target="_blank" rel="noopener noreferrer" class="link link-primary text-sm">View Attachment</a>
                        ${showDeleteButton ? `<button data-comment-id="${comment._id}" class="btn btn-link btn-error btn-xs p-0 delete-attachment-btn">Delete</button>` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
        `}).join('');
        
        // NEW: After rendering, set up the event listeners for the new buttons
        setupDeleteAttachmentListeners();
    }

    function setupCommentForm() {
        const commentForm = document.getElementById('comment-form');
        const attachmentInput = document.getElementById('attachment');
        const filePreview = document.getElementById('file-preview');
        if (!commentForm || !attachmentInput || !filePreview) return; // Safety check

        attachmentInput.addEventListener('change', () => {
            if (attachmentInput.files.length > 0) {
                filePreview.textContent = `Selected file: ${attachmentInput.files[0].name}`;
            } else {
                filePreview.textContent = '';
            }
        });

        commentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = commentForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;

            const formData = new FormData();
            formData.append('content', document.getElementById('comment-content').value);
            if (attachmentInput.files.length > 0) {
                formData.append('attachment', attachmentInput.files[0]);
            }

            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span class="loading loading-spinner"></span>
                Submitting...
            `;

            try {
                const response = await fetch(`https://lgu-helpdesk-copy.onrender.com/api/tickets/${ticketId}/comments`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                if (!response.ok) throw new Error((await response.json()).message);
                
                const updatedComments = await response.json();
                renderComments(updatedComments);
                event.target.reset();
                filePreview.textContent = '';
                showToast('Reply submitted successfully!');

            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
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
        
        statusSelect.value = ticket.status;

        updateForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const newStatus = statusSelect.value;
            const button = updateForm.querySelector('button[type="submit"]');
            const originalButtonText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `
                <span class="loading loading-spinner"></span>
                Updating...
            `;

            try {
                const response = await fetch(`https://lgu-helpdesk-copy.onrender.com/api/tickets/${ticketId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                    credentials: 'include'
                });
                if (!response.ok) throw new Error((await response.json()).message);
                const updatedTicket = await response.json();
                const statusBadge = document.getElementById('status-badge');
                statusBadge.textContent = updatedTicket.status;
                statusBadge.className = `badge badge-lg ${getBadgeColor(updatedTicket.status)}`;
                showToast('Status updated successfully!'); 
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                button.disabled = false;
                button.innerHTML = originalButtonText;
            }
        });
    }



     function setupDeleteAttachmentListeners() {
        const deleteButtons = document.querySelectorAll('.delete-attachment-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const commentId = e.target.dataset.commentId;
                
                // Use a simple confirmation dialog
                if (!confirm('Are you sure you want to permanently delete this attachment? This action cannot be undone.')) {
                    return;
                }

                try {
                    const response = await fetch(`https://lgu-helpdesk-copy.onrender.com/api/tickets/${ticketId}/comments/${commentId}/attachment`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (!response.ok) throw new Error((await response.json()).message);
                    
                    showToast('Attachment deleted successfully!');
                    // Refresh the ticket details to show the change
                    fetchTicketDetails();

                } catch (error) {
                    showToast(`Error: ${error.message}`, 'error');
                }
            });
        });
    }

document.addEventListener('DOMContentLoaded', initializeTicketDetailsPage);
