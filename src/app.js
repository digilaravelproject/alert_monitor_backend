const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middlewares/errorMiddleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files from the public folder
// Located in the parent directory (..) relative to this file (src/app.js)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Register Routes
app.use('/api', userRoutes);

// Route for super-admin frontend
app.get(['/super-admin', '/super-admin/login'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'super_admin.html'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
