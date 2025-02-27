document.addEventListener('DOMContentLoaded', function() {
    loadTasksFromLocalStorage(); // Load tasks from local storage on page load

    // Add new task
    document.getElementById('add-btn').addEventListener('click', function() {
        const taskInput = document.getElementById('task-input');
        const prioritySelect = document.getElementById('priority-select');
        const taskText = taskInput.value.trim();
        const priority = prioritySelect.value;

        if (taskText !== "") {
            addTaskToList(taskText, priority, false); // Add task to the list
            saveTaskToLocalStorage(taskText, priority); // Save task to local storage
            taskInput.value = ""; // Clear input fields
            updateRemainingTasks(); // Update remaining tasks count
        }
    });

    // View switch controls
    document.getElementById('mobile-view-btn').addEventListener('click', function() {
        document.body.classList.add('mobile-view');
        document.body.classList.remove('pc-view');
    });

    document.getElementById('pc-view-btn').addEventListener('click', function() {
        document.body.classList.add('pc-view');
        document.body.classList.remove('mobile-view');
    });

    // Clear completed tasks
    document.getElementById('clear-completed-btn').addEventListener('click', function() {
        const completedTasks = document.querySelectorAll('li.completed');
        completedTasks.forEach(task => task.remove()); // Remove completed tasks from the DOM
        updateLocalStorage(); // Update local storage
        updateRemainingTasks(); // Update remaining tasks count
    });

    // Clear all tasks
    document.getElementById('clear-all-btn').addEventListener('click', function() {
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = ''; // Clear all tasks from the DOM
        localStorage.removeItem('tasks'); // Clear all tasks from local storage
        updateRemainingTasks(); // Update remaining tasks count
    });

    // Filter tasks
    document.getElementById('filter-all').addEventListener('click', function() {
        filterTasks('all');
    });

    document.getElementById('filter-active').addEventListener('click', function() {
        filterTasks('active');
    });

    document.getElementById('filter-completed').addEventListener('click', function() {
        filterTasks('completed');
    });

    // Load tasks from localStorage
    function loadTasksFromLocalStorage() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(task => addTaskToList(task.text, task.priority, task.completed));
        sortTasksByPriority(); // Sort tasks after loading
        updateRemainingTasks(); // Update remaining tasks count
    }

    // Add these variables at the top of your script
    let lastAction = null;
    let undoTimeout = null;

    // Add this function to handle showing the popup
    function showUndoPopup(message, undoCallback) {
        const popup = document.getElementById('undo-popup');
        const messageElement = document.getElementById('undo-message');
        const undoButton = document.getElementById('undo-button');
        
        // Clear any existing timeout
        if (undoTimeout) {
            clearTimeout(undoTimeout);
        }
        
        // Set the message and show popup
        messageElement.textContent = message;
        popup.classList.add('show');
        
        // Store the undo callback
        lastAction = undoCallback;
        
        // Auto-hide popup after 5 seconds
        undoTimeout = setTimeout(() => {
            popup.classList.remove('show');
            lastAction = null;
        }, 5000);
        
        // Clear existing event listeners
        undoButton.replaceWith(undoButton.cloneNode(true));
        
        // Add new event listener
        document.getElementById('undo-button').addEventListener('click', () => {
            if (lastAction) {
                lastAction();
                lastAction = null;
            }
            popup.classList.remove('show');
            clearTimeout(undoTimeout);
        });
    }

    // Modify your addTaskToList function to include click handling
    function addTaskToList(text, priority = 'low', completed = false) {
        const taskList = document.getElementById('task-list');
        const li = document.createElement('li');
        
        if (completed) {
            li.classList.add('completed');
        }

        // Create task content first
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = text;

        const prioritySpan = document.createElement('span');
        prioritySpan.className = `priority ${priority}`;
        prioritySpan.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);

        const renameBtn = document.createElement('button');
        renameBtn.className = 'rename-task-btn';
        renameBtn.textContent = 'Rename';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';

        // Append all elements
        li.appendChild(taskText);
        li.appendChild(prioritySpan);
        li.appendChild(renameBtn);
        li.appendChild(removeBtn);

        // Add click handler for completion toggle
        li.addEventListener('click', function(e) {
            // Only toggle if clicking the task area (not buttons)
            if (!e.target.closest('.rename-task-btn') && 
                !e.target.closest('.remove-btn') && 
                !e.target.closest('.edit-input')) {
                
                const wasCompleted = this.classList.contains('completed');
                this.classList.toggle('completed');
                
                showUndoPopup(
                    wasCompleted ? 'Task marked as incomplete' : 'Task marked as complete',
                    () => {
                        this.classList.toggle('completed');
                        updateLocalStorage();
                        updateRemainingTasks();
                    }
                );
                
                updateLocalStorage();
                updateRemainingTasks();
            }
        });

        // Add rename functionality
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent task completion toggle
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'edit-input';
            input.value = taskText.textContent;
            const originalText = taskText.textContent;

            taskText.replaceWith(input);
            input.focus();

            input.addEventListener('blur', function() {
                const newText = this.value.trim();
                if (newText && newText !== originalText) {
                    taskText.textContent = newText;
                    input.replaceWith(taskText);
                    updateLocalStorage();
                } else {
                    input.replaceWith(taskText);
                }
            });

            input.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    input.blur();
                }
                if (e.key === 'Escape') {
                    input.replaceWith(taskText);
                }
            });
        });

        // Add remove functionality
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent task completion toggle
            const taskData = {
                text: taskText.textContent,
                priority: prioritySpan.textContent.toLowerCase(),
                completed: li.classList.contains('completed')
            };
            
            li.remove();
            updateLocalStorage();
            updateRemainingTasks();
            
            showUndoPopup(
                'Task removed',
                () => {
                    const newLi = addTaskToList(taskData.text, taskData.priority.toLowerCase(), taskData.completed);
                    updateLocalStorage();
                    updateRemainingTasks();
                }
            );
        });

        taskList.appendChild(li);
        sortTasksByPriority();
        return li;
    }

    // Save tasks to localStorage
    function saveTaskToLocalStorage(taskText, priority) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.push({ text: taskText, priority: priority, completed: false });
        localStorage.setItem('tasks', JSON.stringify(tasks)); // Save updated tasks to local storage
    }

    // Update tasks in localStorage
    function updateLocalStorage() {
        const taskList = document.querySelectorAll('#task-list li');
        const tasks = [];
        taskList.forEach(task => {
            tasks.push({
                text: task.querySelector('.task-text').textContent,
                priority: task.querySelector('.priority').textContent.toLowerCase(),
                completed: task.classList.contains('completed')
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Update remaining tasks count
    function updateRemainingTasks() {
        const remaining = document.querySelectorAll('#task-list li:not(.completed)').length;
        document.getElementById('task-count').textContent = remaining; // Update remaining tasks display
    }

    // Filter tasks by status
    function filterTasks(status) {
        const tasks = document.querySelectorAll('#task-list li');
        tasks.forEach(task => {
            if (status === 'all') {
                task.style.display = 'flex';
            } else if (status === 'active' && !task.classList.contains('completed')) {
                task.style.display = 'flex';
            } else if (status === 'completed' && task.classList.contains('completed')) {
                task.style.display = 'flex';
            } else {
                task.style.display = 'none';
            }
        });
    }

    // Add these variables at the top with your other declarations
    let isRenameMode = false;
    let selectedTaskForRename = null;

    // Add this event listener with your other initialization code
    document.getElementById('rename-btn').addEventListener('click', toggleRenameMode);

    // Add these functions
    function toggleRenameMode() {
        isRenameMode = !isRenameMode;
        const renameBtn = document.getElementById('rename-btn');
        renameBtn.textContent = isRenameMode ? 'Cancel Rename' : 'Rename';
        renameBtn.style.backgroundColor = isRenameMode ? '#f44336' : '';
        
        if (!isRenameMode) {
            selectedTaskForRename = null;
        }
    }

    function makeTaskEditable(li) {
        const taskText = li.querySelector('.task-text');
        const originalText = taskText.textContent;
        
        // Create input for editing
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        input.classList.add('edit-input');
        
        taskText.replaceWith(input);
        input.focus();
        
        input.addEventListener('blur', function() {
            const newText = this.value.trim();
            if (newText && newText !== originalText) {
                taskText.textContent = newText;
                input.replaceWith(taskText);
                updateLocalStorage();
            } else {
                input.replaceWith(taskText);
            }
        });
        
        input.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                input.blur();
            }
            if (e.key === 'Escape') {
                input.replaceWith(taskText);
            }
        });
    }

    // Modify your remove task functionality
    function removeTask(li) {
        const taskList = document.getElementById('task-list');
        const taskText = li.querySelector('.task-text').textContent;
        const taskData = {
            text: taskText,
            priority: li.querySelector('.priority').textContent,
            completed: li.classList.contains('completed')
        };
        
        li.remove();
        updateLocalStorage();
        updateRemainingTasks();
        
        // Show undo popup
        showUndoPopup(
            'Task removed',
            () => {
                const newLi = addTaskToList(taskData.text, taskData.priority.toLowerCase(), taskData.completed);
                updateLocalStorage();
                updateRemainingTasks();
            }
        );
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" class="checkbox">
            <span class="task-text">${task.text}</span>
            <span class="priority-badge ${task.priority}">${task.priority}</span>
            <button class="rename-task-btn">Rename</button>
            <button class="delete-btn">Delete</button>
        `;

        const checkbox = li.querySelector('.checkbox');
        checkbox.checked = task.completed;
        if (task.completed) {
            li.classList.add('completed');
        }

        // Add rename functionality
        const renameBtn = li.querySelector('.rename-task-btn');
        renameBtn.addEventListener('click', () => {
            const taskText = li.querySelector('.task-text');
            const originalText = taskText.textContent;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalText;
            input.className = 'edit-input';
            
            taskText.replaceWith(input);
            input.focus();
            
            input.addEventListener('blur', function() {
                const newText = this.value.trim();
                if (newText && newText !== originalText) {
                    taskText.textContent = newText;
                    input.replaceWith(taskText);
                    updateLocalStorage();
                } else {
                    input.replaceWith(taskText);
                }
            });
            
            input.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    input.blur();
                }
                if (e.key === 'Escape') {
                    input.replaceWith(taskText);
                }
            });
        });

        // ... rest of your existing createTaskElement code ...
        
        return li;
    }

    // Add this function to sort tasks by priority
    function sortTasksByPriority() {
        const taskList = document.getElementById('task-list');
        const tasks = Array.from(taskList.children);
        
        const priorityOrder = {
            'High': 3,
            'Medium': 2,
            'Low': 1
        };
        
        tasks.sort((a, b) => {
            const priorityA = a.querySelector('.priority').textContent;
            const priorityB = b.querySelector('.priority').textContent;
            return priorityOrder[priorityB] - priorityOrder[priorityA];
        });
        
        tasks.forEach(task => taskList.appendChild(task));
    }

    // Update tasks in localStorage
    function updateTaskInLocalStorage() {
        const taskList = document.querySelectorAll('#task-list li');
        const tasks = [];
        taskList.forEach(task => {
            tasks.push({
                text: task.querySelector('.task-text').textContent,
                priority: task.querySelector('.priority').textContent.toLowerCase(),
                completed: task.classList.contains('completed')
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
});