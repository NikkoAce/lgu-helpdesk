async function initializeUsersPage() {
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

        // If authorized, set up the page and fetch initial data
        setupEventListeners();
        fetchAndRenderUsers();
    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = PORTAL_LOGIN_URL;
    }
}

    // A simple cache to hold the fetched user data to avoid re-fetching
    let usersCache = [];
    // To keep track of which user is being edited or deleted
    let selectedUserId = null;

    // --- 3. CORE FUNCTIONS ---
    async function fetchAndRenderUsers() {
        const tableBody = document.getElementById('users-table-body');
        // Show a loading state in the table
        tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Loading users...</td></tr>`;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                credentials: 'include' // Use cookie for authentication
            });
            if (!response.ok) throw new Error((await response.json()).message);
            usersCache = await response.json();
            renderTable(usersCache);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-600">Error: ${error.message}</td></tr>`;
        }
    }

    function renderTable(users) {
        const tableBody = document.getElementById('users-table-body');
        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No users found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = ''; // Clear the table body
        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
           row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${user.name}</div>
                    <div class="text-sm text-gray-500">${user.employeeId}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${user.office || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-900">${user.role}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <button data-action="edit" data-userid="${user._id}" class="text-sky-600 hover:text-sky-900">Edit</button>
                    <button data-action="delete" data-userid="${user._id}" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- 4. MODAL & EVENT HANDLING ---
    function openEditModal(user) {
        const editModal = document.getElementById('edit-user-modal');
        const editUserName = document.getElementById('edit-user-name');
        const editUserOffice = document.getElementById('edit-user-office');
        const editRoleSelect = document.getElementById('edit-role-select');
        const editMessage = document.getElementById('edit-message');

        selectedUserId = user._id;
        editUserName.textContent = user.name;
        editUserOffice.value = user.office; // New
        editRoleSelect.value = user.role;
        editMessage.textContent = '';
        editModal.classList.remove('hidden');
    }

    function openDeleteModal(user) {
        const deleteModal = document.getElementById('delete-user-modal');
        const deleteUserName = document.getElementById('delete-user-name');
        const deleteMessage = document.getElementById('delete-message');
        selectedUserId = user._id;
        deleteUserName.textContent = user.name;
        deleteMessage.textContent = '';
        deleteModal.classList.remove('hidden');
    }

    function closeModal() {
        const editModal = document.getElementById('edit-user-modal');
        const deleteModal = document.getElementById('delete-user-modal');
        editModal.classList.add('hidden');
        deleteModal.classList.add('hidden');
    }

function setupEventListeners() {
    const tableBody = document.getElementById('users-table-body');
    // Edit Modal Elements
    const editForm = document.getElementById('edit-user-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    // Delete Modal Elements
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Event delegation for the entire table body
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const userId = e.target.dataset.userid;
        if (!action || !userId) return;

        const user = usersCache.find(u => u._id === userId);
        if (!user) return;

        if (action === 'edit') openEditModal(user);
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
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
        `;

        const updatedData = {
            name: document.getElementById('edit-user-name').value,
            office: document.getElementById('edit-user-office').value,
            role: document.getElementById('edit-role-select').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${selectedUserId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
                credentials: 'include'
            });
            if (!response.ok) throw new Error((await response.json()).message);
            
            showToast('User updated successfully!');
            await fetchAndRenderUsers();
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
        const deleteMessage = document.getElementById('delete-message');
        deleteMessage.textContent = 'Deleting...';
        deleteMessage.className = 'mt-4 text-sm text-gray-600';
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${selectedUserId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error((await response.json()).message);
            showToast('User deleted successfully.'); // Use toast for success
            await fetchAndRenderUsers(); // Refresh the table
            closeModal();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error'); // Use toast for error
        }
    });
    }

    // Handle cancel buttons
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', initializeUsersPage);
