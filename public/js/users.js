async function initializeUsersPage() {
    // Page protection: Only allow ICTO personnel to see this page
    // This now runs *after* app.js has populated currentUser.
    if (!currentUser || !currentUser.role.includes('ICTO')) {
        alert('Access Denied: This page is for ICTO personnel only.');
        window.location.href = 'app.html';
        return;
    }

    // If authorized, set up the page and fetch initial data
    setupUserPageEventListeners(); // Rename to avoid conflict
    fetchAndRenderUsers('Active'); // Default to active users
    fetchPendingCount(); // Fetch the count for the badge
}

    // A simple cache to hold the fetched user data to avoid re-fetching
    let usersCache = [];
    // To keep track of which user is being edited or deleted.
    let selectedUser = null;
    // To keep track of the current view
    let currentView = 'Active';

    // --- 3. CORE FUNCTIONS ---
    async function fetchAndRenderUsers(status, searchTerm = '') {
        const tableBody = document.getElementById('users-table-body');
        // Show a loading state in the table
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4"><span class="loading loading-spinner"></span></td></tr>`;
        try {
            const url = new URL(`${window.API_BASE_URL}/api/users`);
            if (searchTerm) {
                url.searchParams.append('search', searchTerm.trim());
            }

            const response = await fetch(url, {
                credentials: 'include' // Use cookie for authentication
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch users');
            usersCache = await response.json();
            renderTable(usersCache, status);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-error">Error: ${error.message}</td></tr>`;
        }
    }

    async function fetchPendingCount() {
        try {
            const url = new URL(`${window.API_BASE_URL}/api/users`);
            url.searchParams.append('status', 'Pending');
            const response = await fetch(url.toString(), {
                credentials: 'include' // Use cookie for authentication
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch pending count');
            const pendingUsers = await response.json();
            const count = pendingUsers.length;
            const badge = document.getElementById('pending-count-badge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Failed to fetch pending user count:', error);
        }
    }

    function renderTable(users, status) {
        const tableHead = document.querySelector('#users-table-body').parentElement.querySelector('thead tr');
        const tableBody = document.getElementById('users-table-body');
        
        // Dynamically set table headers based on the view
        if (status === 'Pending') {
            tableHead.innerHTML = `
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name / ID</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Office</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Registered On</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            `;
        } else { // Active users
            tableHead.innerHTML = `
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name / ID</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Office</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            `;
        }

        if (users.length === 0) {
            const message = status === 'Pending' ? 'No pending registrations found.' : 'No active users found.';
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4">${message}</td></tr>`;
            return;
        }

        tableBody.innerHTML = ''; // Clear the table body
        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'hover transition-opacity duration-500';
            row.id = `user-row-${user._id}`;

            if (status === 'Pending') {
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${user.name}</div>
                        <div class="text-sm text-gray-500">${user.employeeId}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.office}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button data-action="approve" data-userid="${user._id}" class="btn btn-xs btn-success">Approve</button>
                        <button data-action="reject" data-userid="${user._id}" class="btn btn-xs btn-error">Reject</button>
                    </td>
                `;
            } else { // Active users
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${user.name}</div>
                        <div class="text-sm text-gray-500">${user.employeeId}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">${user.office || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="badge badge-ghost badge-sm">${user.role}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button data-action="edit" data-userid="${user._id}" class="btn btn-ghost btn-xs">Edit</button>
                        <button data-action="delete" data-userid="${user._id}" class="btn btn-ghost btn-xs text-error">Delete</button>
                    </td>
                `;
            }
            tableBody.appendChild(row);
        });
    }

    // --- 4. MODAL & EVENT HANDLING ---
    function openEditModal(user) {
        const editModal = document.getElementById('edit-user-modal');
        const editUserName = document.getElementById('edit-user-name');
        const editUserOffice = document.getElementById('edit-user-office');
        const editRoleSelect = document.getElementById('edit-role-select');

        selectedUser = user;
        editUserName.value = user.name; // FIX: Use .value for input fields
        editUserOffice.value = user.office; // New
        editRoleSelect.value = user.role;
        editModal.showModal();
    }

    function openDeleteModal(user) {
        const deleteModal = document.getElementById('delete-user-modal');
        const deleteUserNameConfirm = document.getElementById('delete-user-name-confirm');
        const confirmInput = document.getElementById('delete-confirm-input');
        const confirmBtn = document.getElementById('confirm-delete-btn');

        selectedUser = user;
        deleteUserNameConfirm.textContent = user.name;
        confirmInput.value = ''; // Clear previous input
        confirmBtn.disabled = true; // Disable button initially
        deleteModal.showModal();

        // Add a listener to enable the button only when the name matches
        confirmInput.oninput = () => {
            confirmBtn.disabled = confirmInput.value !== user.name;
        };
    }

    function closeModal() {
        const editModal = document.getElementById('edit-user-modal');
        const deleteModal = document.getElementById('delete-user-modal');
        // Use the built-in close method for <dialog> elements
        if (editModal) editModal.close();
        if (deleteModal) deleteModal.close();
    }

function setupUserPageEventListeners() {
    const tableBody = document.getElementById('users-table-body');
    const searchInput = document.getElementById('search-input');
    const tabsContainer = document.querySelector('.tabs');

    // --- Debounce for Search ---
    let debounceTimer;
    const debounce = (func, delay) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    };

    // Edit Modal Elements
    const editForm = document.getElementById('edit-user-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    // Delete Modal Elements
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Search input listener
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            debounce(() => fetchAndRenderUsers(currentView, searchInput.value), 300);
        });
    }

    // Tab switching listener
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('[role="tab"]');
            if (tab && !tab.classList.contains('tab-active')) {
                // Update active tab style
                tabsContainer.querySelector('.tab-active').classList.remove('tab-active');
                tab.classList.add('tab-active');
                
                // Fetch and render users for the new view
                currentView = tab.dataset.status;
                fetchAndRenderUsers(currentView, searchInput.value);
            }
        });
    }

    // Event delegation for the entire table body
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const userId = button.dataset.userid;
        if (!action || !userId) return;

        const user = usersCache.find(u => u._id === userId);
        if (!user) return;

        if (action === 'edit') openEditModal(user); // Existing actions
        if (action === 'delete') openDeleteModal(user);
    });
    }

    // Handle the edit form submission
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveButton = editForm.querySelector('button[type="submit"]');
        const originalButtonText = saveButton.innerHTML;
        
        // --- NEW: Set Loading State ---
        saveButton.disabled = true;
        saveButton.innerHTML = `
            <span class="loading loading-spinner"></span>
            Saving...
        `;

        const updatedData = {
            name: document.getElementById('edit-user-name').value,
            office: document.getElementById('edit-user-office').value,
            role: document.getElementById('edit-role-select').value
        };

        try {
            // Use window.API_BASE_URL to construct the full URL
            const response = await fetch(`${window.API_BASE_URL}/api/users/${selectedUser._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showToast('User updated successfully!');
            await fetchAndRenderUsers(currentView, searchInput.value);
            closeModal();

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // --- NEW: Restore Button State ---
            // This 'finally' block ensures the button is always restored,
            // even if there's an error.
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonText;
        }
    });
    }

    // Handle the delete confirmation
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const originalButtonText = confirmDeleteBtn.innerHTML;
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = `
                <span class="loading loading-spinner"></span>
                Deleting...
            `;

        try {
            const response = await fetch(`${window.API_BASE_URL}/api/users/${selectedUser._id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            showToast('User deleted successfully.'); // Use toast for success
            await fetchAndRenderUsers(currentView, searchInput.value); // Refresh the table
            closeModal();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error'); // Use toast for error
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = originalButtonText;
        }
    });
    }

    // --- NEW: Handle Approve/Reject Actions ---
    const handleUserStatusAction = async (userId, status) => {
        try {
            const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status === 'approve' ? 'Active' : 'Rejected' }),
                credentials: 'include' // IMPORTANT: Send the auth cookie with the request
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            showToast(result.message, 'success');

            // Animate removal and refresh list
            const row = document.getElementById(`user-row-${userId}`);
            if (row) {
                row.classList.add('opacity-0');
                setTimeout(() => {
                    row.remove();
                    // Check if the table is now empty
                    if (tableBody.children.length === 0) {
                        renderTable([], 'Pending');
                    }
                    fetchPendingCount(); // Update the badge count
                }, 500);
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    };

    // Add listener for approve/reject buttons
    tableBody.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action="approve"], button[data-action="reject"]');
        if (button) {
            const { action, userid } = button.dataset;
            handleUserStatusAction(userid, action);
        }
    });

    // Handle cancel buttons
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);
}
