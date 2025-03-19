const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev')); // Logging

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create a log stream for HTTP requests
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'), 
    { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));

// In-memory data store
let tasks = [
    {
        id: uuidv4(),
        title: 'Complete project documentation',
        description: 'Write comprehensive documentation for the TaskFlow project',
        priority: 'high',
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    },
    {
        id: uuidv4(),
        title: 'Schedule team meeting',
        description: 'Plan the weekly team sync to discuss project progress',
        priority: 'medium',
        completed: true,
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
    },
    {
        id: uuidv4(),
        title: 'Research new technologies',
        description: 'Look into potential new tools and frameworks for upcoming projects',
        priority: 'low',
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
    }
];

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: true,
        message: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.message : null
    });
};

// Validation middleware
const validateTask = (req, res, next) => {
    const { title, priority } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({
            error: true,
            message: 'Task title is required and must be a non-empty string'
        });
    }
    
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({
            error: true,
            message: 'Priority must be either "low", "medium", or "high"'
        });
    }
    
    next();
};

const simulateLatency = (req, res, next) => {
    const delay = Math.floor(Math.random() * 300) + 200; 
    setTimeout(next, delay);
};

// Routes
// GET /api/tasks - Get all tasks
app.get('/api/tasks', simulateLatency, (req, res) => {
    try {
        res.json(tasks);
    } catch (err) {
        next(err);
    }
});


app.get('/api/tasks/:id', simulateLatency, (req, res) => {
    try {
        const task = tasks.find(t => t.id === req.params.id);
        
        if (!task) {
            return res.status(404).json({
                error: true,
                message: 'Task not found'
            });
        }
        
        res.json(task);
    } catch (err) {
        next(err);
    }
});

app.post('/api/tasks', simulateLatency, validateTask, (req, res) => {
    try {
        const newTask = {
            id: uuidv4(),
            title: req.body.title,
            description: req.body.description || '',
            priority: req.body.priority || 'medium',
            completed: false,
            createdAt: new Date().toISOString(),
            dueDate: req.body.dueDate || null
        };
        
        tasks.push(newTask);
        
       
        fs.appendFileSync(
            path.join(logsDir, 'tasks.log'),
            `${new Date().toISOString()} - Task created: ${JSON.stringify(newTask)}\n`
        );
        
        res.status(201).json(newTask);
    } catch (err) {
        next(err);
    }
});


app.put('/api/tasks/:id', simulateLatency, validateTask, (req, res) => {
    try {
        const taskIndex = tasks.findIndex(t => t.id === req.params.id);
        
        if (taskIndex === -1) {
            return res.status(404).json({
                error: true,
                message: 'Task not found'
            });
        }
        
        const updatedTask = {
            ...tasks[taskIndex],
            title: req.body.title,
            description: req.body.description !== undefined ? req.body.description : tasks[taskIndex].description,
            priority: req.body.priority || tasks[taskIndex].priority,
            dueDate: req.body.dueDate || tasks[taskIndex].dueDate,
            updatedAt: new Date().toISOString()
        };
        
        tasks[taskIndex] = updatedTask;
        
        // Log the task update
        fs.appendFileSync(
            path.join(logsDir, 'tasks.log'),
            `${new Date().toISOString()} - Task updated: ${JSON.stringify(updatedTask)}\n`
        );
        
        res.json(updatedTask);
    } catch (err) {
        next(err);
    }
});


app.patch('/api/tasks/:id', simulateLatency, (req, res) => {
    try {
        const taskIndex = tasks.findIndex(t => t.id === req.params.id);
        
        if (taskIndex === -1) {
            return res.status(404).json({
                error: true,
                message: 'Task not found'
            });
        }
        
        const updatedTask = {
            ...tasks[taskIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        tasks[taskIndex] = updatedTask;
        
        // Log for task patch
        fs.appendFileSync(
            path.join(logsDir, 'tasks.log'),
            `${new Date().toISOString()} - Task patched: ${JSON.stringify(updatedTask)}\n`
        );
        
        res.json(updatedTask);
    } catch (err) {
        next(err);
    }
});


app.delete('/api/tasks/:id', simulateLatency, (req, res) => {
    try {
        const taskIndex = tasks.findIndex(t => t.id === req.params.id);
        
        if (taskIndex === -1) {
            return res.status(404).json({
                error: true,
                message: 'Task not found'
            });
        }
        
        const deletedTask = tasks[taskIndex];
        tasks = tasks.filter(t => t.id !== req.params.id);
        
        // Log the task deletion
        fs.appendFileSync(
            path.join(logsDir, 'tasks.log'),
            `${new Date().toISOString()} - Task deleted: ${JSON.stringify(deletedTask)}\n`
        );
        
        res.json({
            success: true,
            message: 'Task deleted successfully',
            taskId: req.params.id
        });
    } catch (err) {
        next(err);
    }
});

// index.html from public folder will run port 3000
app.use(express.static('public'));

// end point for API documentation
app.get('/api/docs', (req, res) => {
    res.json({
        description: 'TaskFlow API - A RESTful API for managing tasks',
        version: '1.0.0',
        endpoints: [
            {
                method: 'GET',
                path: '/api/tasks',
                description: 'Get all tasks'
            },
            {
                method: 'GET',
                path: '/api/tasks/:id',
                description: 'Get a specific task by ID'
            },
            {
                method: 'POST',
                path: '/api/tasks',
                description: 'Create a new task',
                body: {
                    title: 'string (required)',
                    description: 'string (optional)',
                    priority: 'string (low, medium, high) (optional)',
                    dueDate: 'ISO date string (optional)'
                }
            },
            {
                method: 'PUT',
                path: '/api/tasks/:id',
                description: 'Update an existing task',
                body: {
                    title: 'string (required)',
                    description: 'string (optional)',
                    priority: 'string (low, medium, high) (optional)',
                    dueDate: 'ISO date string (optional)'
                }
            },
            {
                method: 'PATCH',
                path: '/api/tasks/:id',
                description: 'Partially update a task',
                body: {
                    title: 'string (optional)',
                    description: 'string (optional)',
                    priority: 'string (low, medium, high) (optional)',
                    completed: 'boolean (optional)',
                    dueDate: 'ISO date string (optional)'
                }
            },
            {
                method: 'DELETE',
                path: '/api/tasks/:id',
                description: 'Delete a task'
            }
        ]
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// error handler
app.use(errorHandler);

// Handle 404 - route not found
app.use((req, res) => {
    res.status(404).json({
        error: true,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/api/docs`);
});

// Handle server shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;