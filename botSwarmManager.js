const noblox = require('noblox.js');

class BotSwarmManager {
    constructor() {
        this.activeSwarms = new Map();
        this.botInstances = new Map();
    }

    // Start a new bot swarm
    async startSwarm(config) {
        const {
            sessionId,
            placeId,
            botCount,
            duration,
            mode,
            autoLeave,
            randomActivity,
            accounts,
            maxConcurrent
        } = config;

        // Create swarm session
        const swarm = {
            sessionId,
            placeId,
            botCount,
            duration,
            mode,
            autoLeave,
            randomActivity,
            startTime: Date.now(),
            status: 'running',
            stats: {
                active: 0,
                totalJoins: botCount,
                spawning: 0,
                inGame: 0,
                failed: 0,
                completed: 0
            },
            bots: []
        };

        this.activeSwarms.set(sessionId, swarm);

        console.log(`Swarm ${sessionId}: Starting with ${botCount} bots`);

        // Start spawning bots based on mode
        switch (mode) {
            case 'instant':
                await this.spawnInstant(swarm, accounts, maxConcurrent);
                break;
            case 'wave':
                await this.spawnWave(swarm, accounts, maxConcurrent);
                break;
            case 'steady':
                await this.spawnSteady(swarm, accounts, maxConcurrent);
                break;
            default:
                await this.spawnInstant(swarm, accounts, maxConcurrent);
        }

        return sessionId;
    }

    // Spawn all bots instantly (in batches)
    async spawnInstant(swarm, accounts, maxConcurrent) {
        const batches = Math.ceil(swarm.botCount / maxConcurrent);
        
        for (let batch = 0; batch < batches; batch++) {
            const batchSize = Math.min(maxConcurrent, swarm.botCount - (batch * maxConcurrent));
            const promises = [];

            for (let i = 0; i < batchSize; i++) {
                const botIndex = (batch * maxConcurrent) + i;
                const account = accounts[botIndex % accounts.length];
                
                promises.push(this.spawnBot(swarm, account, botIndex));
            }

            await Promise.allSettled(promises);
            
            // Small delay between batches
            if (batch < batches - 1) {
                await this.sleep(2000);
            }
        }
    }

    // Spawn bots in waves over 30 seconds
    async spawnWave(swarm, accounts, maxConcurrent) {
        const waves = 3;
        const botsPerWave = Math.ceil(swarm.botCount / waves);
        const waveDelay = 10000; // 10 seconds between waves

        for (let wave = 0; wave < waves; wave++) {
            const waveStart = wave * botsPerWave;
            const waveEnd = Math.min(waveStart + botsPerWave, swarm.botCount);
            const promises = [];

            for (let i = waveStart; i < waveEnd; i++) {
                const account = accounts[i % accounts.length];
                promises.push(this.spawnBot(swarm, account, i));

                // Limit concurrent spawns within wave
                if (promises.length >= maxConcurrent) {
                    await Promise.allSettled(promises);
                    promises.length = 0;
                    await this.sleep(1000);
                }
            }

            await Promise.allSettled(promises);

            // Wait before next wave
            if (wave < waves - 1) {
                await this.sleep(waveDelay);
            }
        }
    }

    // Spawn bots steadily over time
    async spawnSteady(swarm, accounts, maxConcurrent) {
        const totalDuration = swarm.duration * 1000;
        const interval = totalDuration / swarm.botCount;
        
        for (let i = 0; i < swarm.botCount; i++) {
            if (swarm.status !== 'running') break;

            const account = accounts[i % accounts.length];
            this.spawnBot(swarm, account, i);

            // Wait before spawning next bot
            await this.sleep(interval);
        }
    }

    // Spawn a single bot
    async spawnBot(swarm, account, botIndex) {
        const botId = `${swarm.sessionId}-bot-${botIndex}`;
        
        try {
            swarm.stats.spawning++;

            const bot = {
                id: botId,
                sessionId: swarm.sessionId,
                accountNickname: account.nickname,
                cookie: account.cookie,
                status: 'spawning',
                joinTime: null,
                leaveTime: null
            };

            this.botInstances.set(botId, bot);
            swarm.bots.push(bot);

            console.log(`Bot ${botIndex + 1}/${swarm.botCount}: Spawning...`);

            // Authenticate with Roblox
            await noblox.setCookie(account.cookie);
            const user = await noblox.getCurrentUser();
            bot.username = user.UserName;
            bot.userId = user.UserId;

            // Join the game
            await this.joinGame(bot, swarm.placeId);

            bot.status = 'in-game';
            bot.joinTime = Date.now();
            swarm.stats.spawning--;
            swarm.stats.inGame++;
            swarm.stats.active++;

            console.log(`Bot ${bot.username}: Joined game successfully`);

            // Simulate random activity if enabled
            if (swarm.randomActivity) {
                this.simulateActivity(bot, swarm);
            }

            // Auto-leave after duration
            if (swarm.autoLeave) {
                setTimeout(() => {
                    this.leaveGame(bot, swarm);
                }, swarm.duration * 1000);
            }

        } catch (error) {
            console.error(`Bot ${botIndex + 1}: Failed to spawn - ${error.message}`);
            swarm.stats.spawning--;
            swarm.stats.failed++;
        }
    }

    // Join a Roblox game
    async joinGame(bot, placeId) {
        // Note: noblox.js doesn't actually launch the game client
        // This would need additional tools like Selenium, Puppeteer, or
        // direct Roblox client automation

        // For demonstration, we simulate joining
        await this.sleep(Math.random() * 2000 + 1000); // Simulate join time

        // In a real implementation:
        // 1. Use Roblox game join API
        // 2. Launch Roblox client with proper parameters
        // 3. Handle authentication
        // 4. Monitor connection status

        return true;
    }

    // Leave a game
    leaveGame(bot, swarm) {
        if (bot.status === 'in-game') {
            bot.status = 'completed';
            bot.leaveTime = Date.now();
            swarm.stats.inGame--;
            swarm.stats.completed++;
            swarm.stats.active--;

            console.log(`Bot ${bot.username}: Left game`);

            // Check if swarm is complete
            if (swarm.stats.completed + swarm.stats.failed >= swarm.botCount) {
                this.completeSwarm(swarm.sessionId);
            }
        }
    }

    // Simulate random activity (movement, chat, etc.)
    async simulateActivity(bot, swarm) {
        // In a real implementation, this would:
        // 1. Send random movement commands
        // 2. Occasionally jump or interact
        // 3. Send chat messages (if enabled)
        // 4. Simulate realistic player behavior

        const activityInterval = setInterval(() => {
            if (bot.status !== 'in-game') {
                clearInterval(activityInterval);
                return;
            }

            // Simulate activity
            console.log(`Bot ${bot.username}: Performing activity...`);
        }, Math.random() * 10000 + 5000); // Every 5-15 seconds
    }

    // Complete a swarm
    completeSwarm(sessionId) {
        const swarm = this.activeSwarms.get(sessionId);
        if (swarm) {
            swarm.status = 'completed';
            swarm.endTime = Date.now();
            
            const duration = (swarm.endTime - swarm.startTime) / 1000;
            console.log(`Swarm ${sessionId}: Completed in ${duration.toFixed(1)}s`);
            console.log(`Stats: ${swarm.stats.completed} succeeded, ${swarm.stats.failed} failed`);

            // Clean up after 1 hour
            setTimeout(() => {
                this.activeSwarms.delete(sessionId);
                console.log(`Swarm ${sessionId}: Cleaned up`);
            }, 3600000);
        }
    }

    // Stop a specific swarm
    stopSwarm(sessionId) {
        const swarm = this.activeSwarms.get(sessionId);
        if (swarm) {
            swarm.status = 'stopped';
            
            // Force all bots to leave
            swarm.bots.forEach(bot => {
                if (bot.status === 'in-game') {
                    this.leaveGame(bot, swarm);
                }
            });

            console.log(`Swarm ${sessionId}: Stopped manually`);
        }
    }

    // Stop all swarms
    stopAllSwarms() {
        console.log('Stopping all active swarms...');
        this.activeSwarms.forEach((swarm, sessionId) => {
            this.stopSwarm(sessionId);
        });
    }

    // Get swarm status
    getSwarmStatus(sessionId) {
        const swarm = this.activeSwarms.get(sessionId);
        if (!swarm) return null;

        return {
            sessionId: swarm.sessionId,
            placeId: swarm.placeId,
            status: swarm.status,
            startTime: swarm.startTime,
            endTime: swarm.endTime,
            stats: swarm.stats,
            botsOnline: swarm.bots.filter(b => b.status === 'in-game').map(b => ({
                username: b.username,
                joinTime: b.joinTime
            }))
        };
    }

    // Get active swarm count
    getActiveSwarmCount() {
        return Array.from(this.activeSwarms.values())
            .filter(s => s.status === 'running').length;
    }

    // Sleep helper
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BotSwarmManager;
