const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const BotSwarmManager = require('./botSwarmManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize bot swarm manager
const swarmManager = new BotSwarmManager();

// Middleware
app.use(helmet());
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        activeSwarms: swarmManager.getActiveSwarmCount(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Roblox Game Joiner Bot API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            startSwarm: 'POST /api/start-swarm',
            stopSwarm: 'POST /api/stop-swarm',
            swarmStatus: 'GET /api/swarm-status/:sessionId',
            verifyAccount: 'POST /api/verify-account'
        }
    });
});

// POST /api/start-swarm - Start a bot swarm
app.post('/api/start-swarm', async (req, res) => {
    try {
        const {
            placeId,
            botCount,
            duration,
            mode,
            autoLeave,
            randomActivity,
            accounts,
            maxConcurrent
        } = req.body;

        // Validation
        if (!placeId) {
            return res.status(400).json({ error: 'placeId is required' });
        }

        if (!botCount || botCount < 1 || botCount > 10000) {
            return res.status(400).json({ error: 'botCount must be between 1 and 10000' });
        }

        if (!accounts || accounts.length === 0) {
            return res.status(400).json({ error: 'At least one account is required' });
        }

        console.log(`Starting swarm: ${botCount} bots → Place ${placeId}`);

        const sessionId = uuidv4();

        // Start the bot swarm
        swarmManager.startSwarm({
            sessionId,
            placeId,
            botCount,
            duration: duration || 60,
            mode: mode || 'instant',
            autoLeave: autoLeave !== false,
            randomActivity: randomActivity === true,
            accounts,
            maxConcurrent: maxConcurrent || 100
        });

        res.json({
            success: true,
            sessionId,
            message: `Bot swarm initiated with ${botCount} bots`,
            estimatedCompletionTime: Math.ceil((botCount / (maxConcurrent || 100)) * 10)
        });

    } catch (error) {
        console.error('Error starting swarm:', error);
        res.status(500).json({ 
            error: 'Failed to start swarm',
            message: error.message 
        });
    }
});

// POST /api/stop-swarm - Stop all active swarms
app.post('/api/stop-swarm', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (sessionId) {
            swarmManager.stopSwarm(sessionId);
            res.json({ success: true, message: `Swarm ${sessionId} stopped` });
        } else {
            swarmManager.stopAllSwarms();
            res.json({ success: true, message: 'All swarms stopped' });
        }

    } catch (error) {
        console.error('Error stopping swarm:', error);
        res.status(500).json({ 
            error: 'Failed to stop swarm',
            message: error.message 
        });
    }
});

// GET /api/swarm-status/:sessionId - Get swarm status
app.get('/api/swarm-status/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const status = swarmManager.getSwarmStatus(sessionId);

        if (!status) {
            return res.status(404).json({ error: 'Swarm session not found' });
        }

        res.json(status);

    } catch (error) {
        console.error('Error getting swarm status:', error);
        res.status(500).json({ 
            error: 'Failed to get swarm status',
            message: error.message 
        });
    }
});

// POST /api/verify-account - Verify a Roblox account cookie
app.post('/api/verify-account', async (req, res) => {
    try {
        const { cookie } = req.body;

        if (!cookie) {
            return res.status(400).json({ error: 'Cookie is required' });
        }

        const noblox = require('noblox.js');
        
        await noblox.setCookie(cookie);
        const user = await noblox.getCurrentUser();

        res.json({
            success: true,
            valid: true,
            user: {
                id: user.UserId,
                username: user.UserName
            }
        });

    } catch (error) {
        res.json({
            success: true,
            valid: false,
            message: 'Invalid or expired cookie'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Roblox Game Joiner API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    swarmManager.stopAllSwarms();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    swarmManager.stopAllSwarms();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const BotSwarmManager = require('./botSwarmManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize bot swarm manager
const swarmManager = new BotSwarmManager();

// Middleware
app.use(helmet());
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        activeSwarms: swarmManager.getActiveSwarmCount(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Roblox Game Joiner Bot API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            startSwarm: 'POST /api/start-swarm',
            stopSwarm: 'POST /api/stop-swarm',
            swarmStatus: 'GET /api/swarm-status/:sessionId',
            verifyAccount: 'POST /api/verify-account'
        }
    });
});

// POST /api/start-swarm - Start a bot swarm
app.post('/api/start-swarm', async (req, res) => {
    try {
        const {
            placeId,
            botCount,
            duration,
            mode,
            autoLeave,
            randomActivity,
            accounts,
            maxConcurrent
        } = req.body;

        // Validation
        if (!placeId) {
            return res.status(400).json({ error: 'placeId is required' });
        }

        if (!botCount || botCount < 1 || botCount > 10000) {
            return res.status(400).json({ error: 'botCount must be between 1 and 10000' });
        }

        if (!accounts || accounts.length === 0) {
            return res.status(400).json({ error: 'At least one account is required' });
        }

        console.log(`Starting swarm: ${botCount} bots → Place ${placeId}`);

        const sessionId = uuidv4();

        // Start the bot swarm
        swarmManager.startSwarm({
            sessionId,
            placeId,
            botCount,
            duration: duration || 60,
            mode: mode || 'instant',
            autoLeave: autoLeave !== false,
            randomActivity: randomActivity === true,
            accounts,
            maxConcurrent: maxConcurrent || 100
        });

        res.json({
            success: true,
            sessionId,
            message: `Bot swarm initiated with ${botCount} bots`,
            estimatedCompletionTime: Math.ceil((botCount / (maxConcurrent || 100)) * 10)
        });

    } catch (error) {
        console.error('Error starting swarm:', error);
        res.status(500).json({ 
            error: 'Failed to start swarm',
            message: error.message 
        });
    }
});

// POST /api/stop-swarm - Stop all active swarms
app.post('/api/stop-swarm', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (sessionId) {
            swarmManager.stopSwarm(sessionId);
            res.json({ success: true, message: `Swarm ${sessionId} stopped` });
        } else {
            swarmManager.stopAllSwarms();
            res.json({ success: true, message: 'All swarms stopped' });
        }

    } catch (error) {
        console.error('Error stopping swarm:', error);
        res.status(500).json({ 
            error: 'Failed to stop swarm',
            message: error.message 
        });
    }
});

// GET /api/swarm-status/:sessionId - Get swarm status
app.get('/api/swarm-status/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const status = swarmManager.getSwarmStatus(sessionId);

        if (!status) {
            return res.status(404).json({ error: 'Swarm session not found' });
        }

        res.json(status);

    } catch (error) {
        console.error('Error getting swarm status:', error);
        res.status(500).json({ 
            error: 'Failed to get swarm status',
            message: error.message 
        });
    }
});

// POST /api/verify-account - Verify a Roblox account cookie
app.post('/api/verify-account', async (req, res) => {
    try {
        const { cookie } = req.body;

        if (!cookie) {
            return res.status(400).json({ error: 'Cookie is required' });
        }

        const noblox = require('noblox.js');
        
        await noblox.setCookie(cookie);
        const user = await noblox.getCurrentUser();

        res.json({
            success: true,
            valid: true,
            user: {
                id: user.UserId,
                username: user.UserName
            }
        });

    } catch (error) {
        res.json({
            success: true,
            valid: false,
            message: 'Invalid or expired cookie'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Roblox Game Joiner API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    swarmManager.stopAllSwarms();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    swarmManager.stopAllSwarms();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
