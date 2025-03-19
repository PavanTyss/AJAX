document.addEventListener('DOMContentLoaded', function() {
    const apiBaseUrl = 'http://localhost:3000/api';
    let currentFilter = 'all';
    let tasks = [];
    
    // DOM elements
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const taskForm = document.getElementById('taskForm');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const filters = document.querySelectorAll('.filter');
    const loadingSpinner = document.querySelector('.loading');
    const notification = document.getElementById('notification');
    
    // Set current date as min for the due date input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDueDate').min = today;
    
    // Initialize
    fetchTasks();
    
    // Event listeners
    addTaskBtn.addEventListener('click', toggleTaskForm);
    cancelBtn.addEventListener('click', toggleTaskForm);
    taskForm.addEventListener('submit', handleTaskSubmit);
    refreshBtn.addEventListener('click', fetchTasks);
    
    // Filter event listeners
    filters.forEach(filter => {
        filter.addEventListener('click', function() {
            filters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderTasks();
        });
    });
    
    // Fetch tasks from API
    function fetchTasks() {
        showLoading();
        
        fetch(`${apiBaseUrl}/tasks`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch tasks');
                }
                return response.json();
            })
            .then(data => {
                tasks = data;
                renderTasks();
                hideLoading();
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
                showNotification('Error fetching tasks. Please try again.', 'error');
                hideLoading();
            });
    }
    
    // Render tasks based on current filter
    function renderTasks() {
        let filteredTasks = tasks;
        
        if (currentFilter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        taskList.innerHTML = filteredTasks.map(task => `
            <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''}">
                <div class="task-priority">${capitalize(task.priority)} Priority</div>
                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                <p class="task-description">${escapeHtml(task.description || 'No description provided.')}</p>
                <div class="task-meta">
                    <span>Due: ${formatDate(task.dueDate)}</span>
                    <div class="task-actions-btn">
                        <button class="action-btn toggle-btn" data-id="${task.id}" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                            <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="action-btn edit-btn" data-id="${task.id}" title="Edit task">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${task.id}" title="Delete task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to action buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', toggleTaskStatus);
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', editTask);
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', deleteTask);
        });
    }
    
    // Toggle task completed status
    function toggleTaskStatus() {
        const taskId = this.dataset.id;
        const task = tasks.find(t => t.id == taskId);
        
        if (!task) return;
        
        showLoading();
        
        fetch(`${apiBaseUrl}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed: !task.completed })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update task');
                }
                return response.json();
            })
            .then(updatedTask => {
                const index = tasks.findIndex(t => t.id == taskId);
                tasks[index] = updatedTask;
                renderTasks();
                showNotification(`Task marked as ${updatedTask.completed ? 'completed' : 'active'}.`, 'success');
                hideLoading();
            })
            .catch(error => {
                console.error('Error updating task:', error);
                showNotification('Error updating task. Please try again.', 'error');
                hideLoading();
            });
    }
    
    // Edit task
    function editTask() {
        const taskId = this.dataset.id;
        const task = tasks.find(t => t.id == taskId);
        
        if (!task) return;
        
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        
        if (task.dueDate) {
            document.getElementById('taskDueDate').value = task.dueDate.split('T')[0];
        }
        
        if (taskForm.style.display === 'none' || !taskForm.style.display) {
            toggleTaskForm();
        }
        
        document.getElementById('saveTaskBtn').innerText = 'Update Task';
    }
    
    // Delete task
    function deleteTask() {
        const taskId = this.dataset.id;
        
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        showLoading();
        
        fetch(`${apiBaseUrl}/tasks/${taskId}`, {
            method: 'DELETE'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete task');
                }
                
                tasks = tasks.filter(task => task.id != taskId);
                renderTasks();
                showNotification('Task deleted successfully.', 'success');
                hideLoading();
            })
            .catch(error => {
                console.error('Error deleting task:', error);
                showNotification('Error deleting task. Please try again.', 'error');
                hideLoading();
            });
    }
    
    // Handle task form submission (create or update)
    function handleTaskSubmit(e) {
        e.preventDefault();
        
        const taskId = document.getElementById('taskId').value;
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;
        
        if (!title.trim()) {
            showNotification('Task title is required.', 'error');
            return;
        }
        
        const taskData = {
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null
        };
        
        showLoading();
        
        // Update existing task
        if (taskId) {
            fetch(`${apiBaseUrl}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update task');
                    }
                    return response.json();
                })
                .then(updatedTask => {
                    const index = tasks.findIndex(t => t.id == taskId);
                    tasks[index] = updatedTask;
                    renderTasks();
                    resetForm();
                    toggleTaskForm();
                    showNotification('Task updated successfully.', 'success');
                    hideLoading();
                })
                .catch(error => {
                    console.error('Error updating task:', error);
                    showNotification('Error updating task. Please try again.', 'error');
                    hideLoading();
                });
            return;
        }
        
        // Create new task
        fetch(`${apiBaseUrl}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to create task');
                }
                return response.json();
            })
            .then(newTask => {
                tasks.push(newTask);
                renderTasks();
                resetForm();
                toggleTaskForm();
                showNotification('Task created successfully.', 'success');
                hideLoading();
            })
            .catch(error => {
                console.error('Error creating task:', error);
                showNotification('Error creating task. Please try again.', 'error');
                hideLoading();
            });
    }
    
    // Toggle task form visibility
    function toggleTaskForm() {
        if (taskForm.style.display === 'block') {
            taskForm.style.display = 'none';
            resetForm();
        } else {
            taskForm.style.display = 'block';
        }
    }
    
    // Reset task form
    function resetForm() {
        document.getElementById('taskId').value = '';
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskPriority').value = 'low';
        document.getElementById('taskDueDate').value = '';
        document.getElementById('saveTaskBtn').innerText = 'Save Task';
    }
    
    // Show loading spinner
    function showLoading() {
        loadingSpinner.style.display = 'flex';
    }
    
    // Hide loading spinner
    function hideLoading() {
        loadingSpinner.style.display = 'none';
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = 'notification ' + type;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    // Helper: Capitalize first letter
    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Helper: Format date
    function formatDate(dateString) {
        if (!dateString) return 'No due date';
        
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    // Helper: Escape HTML to prevent XSS
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});