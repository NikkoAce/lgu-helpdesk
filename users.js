document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SETUP & AUTH ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Page protection: Only allow ICTO Head to see this page
    if (!currentUser || currentUser.role !== 'ICTO Head') {
        window.location.href = 'app.html';
        return;
    }
    const token = localStorage.getItem('authToken');

    // --- 2. DOM ELEMENT REFERENCES ---
    const tableBody = document.getElementById('users-table-body');
    // Edit Modal Elements
    const editModal = document.getElementById('edit-user-modal');
    const editForm = document.getElementById('edit-user-form');
    const editUserName = document.getElementById('edit-user-name');
    const editUserOffice = document.getElementById('edit-user-office'); // New
    const editRoleSelect = document.getElementById('edit-role-select');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editMessage = document.getElementById('edit-message');
    // Delete Modal Elements
    const deleteModal = document.getElementById('delete-user-modal');
    const deleteUserName = document.getElementById('delete-user-name');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteMessage = document.getElementById('delete-message');

    // A simple cache to hold the fetched user data to avoid re-fetching
    let usersCache = [];
    // To keep track of which user is being edited or deleted
    let selectedUserId = null;

    // --- 3. CORE FUNCTIONS ---
    async function fetchAndRenderUsers() {
        // Show a loading state in the table
        tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Loading users...</td></tr>`;
        try {
            const response = await fetch('https://lgu-helpdesk-api.onrender.com/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message);
            usersCache = await response.json();
            renderTable(usersCache);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-600">Error: ${error.message}</td></tr>`;
        }
    }

    function renderTable(users) {
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
        selectedUserId = user._id;
        editUserName.textContent = user.name;
        editUserOffice.value = user.office; // New
        editRoleSelect.value = user.role;
        editMessage.textContent = '';
        editModal.classList.remove('hidden');
    }

    function openDeleteModal(user) {
        selectedUserId = user._id;
        deleteUserName.textContent = user.name;
        deleteMessage.textContent = '';
        deleteModal.classList.remove('hidden');
    }

    function closeModal() {
        editModal.classList.add('hidden');
        deleteModal.classList.add('hidden');
    }

    // Event delegation for the entire table body
    tableBody.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const userId = e.target.dataset.userid;
        if (!action || !userId) return;

        const user = usersCache.find(u => u._id === userId);
        if (!user) return;

        if (action === 'edit') openEditModal(user);
        if (action === 'delete') openDeleteModal(user);
    });

    // Handle the edit form submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Gather all data from the form
        const updatedData = {
            name: editUserName.value,
            office: editUserOffice.value,
            role: editRoleSelect.value
        };

        editMessage.textContent = 'Saving...';
        try {
            const response = await fetch(`https://lgu-helpdesk-api.onrender.com/users/${selectedUserId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) throw new Error((await response.json()).message);
             showToast('User updated successfully!');
            await fetchAndRenderUsers(); // Refresh the table with new data
            closeModal();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error'); 
        }
    });

    // Handle the delete confirmation
    confirmDeleteBtn.addEventListener('click', async () => {
        deleteMessage.textContent = 'Deleting...';
        deleteMessage.className = 'mt-4 text-sm text-gray-600';
        try {
            const response = await fetch(`https://lgu-helpdesk-api.onrender.com/users/${selectedUserId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message);
            showToast('User deleted successfully.'); // Use toast for success
            await fetchAndRenderUsers(); // Refresh the table
            closeModal();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error'); // Use toast for error
        }
    });

    // Handle cancel buttons
    cancelEditBtn.addEventListener('click', closeModal);
    cancelDeleteBtn.addEventListener('click', closeModal);

    // --- 5. INITIAL LOAD ---
    fetchAndRenderUsers();
});
