import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFile = path.join(__dirname, '..', 'bot-state.json');
const pidFile = path.join(__dirname, '..', 'bot-pid.json');
const botFile = path.join(__dirname, '..', 'bot.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const writeState = (status, qr = null, phone = null) => {
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ status, qr, phone }));
    } catch (err) {
        console.error('[botController] Failed to write bot state:', err.message);
    }
};

const savePid = (pid) => {
    try {
        fs.writeFileSync(pidFile, JSON.stringify({ pid }));
    } catch { }
};

const clearPid = () => {
    try { if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile); } catch { }
};

const getSavedPid = () => {
    try {
        if (fs.existsSync(pidFile)) {
            return JSON.parse(fs.readFileSync(pidFile, 'utf8')).pid || null;
        }
    } catch { }
    return null;
};

const isProcessRunning = (pid) => {
    try { process.kill(pid, 0); return true; } catch { return false; }
};

/**
 * On Windows, kill the entire process tree rooted at `pid`
 * (covers both the node bot.js process and its Chrome child).
 * Falls back to a simple SIGKILL on non-Windows.
 */
const killProcessTree = (pid) => {
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        } else {
            process.kill(-pid, 'SIGKILL');
        }
    } catch (e) {
        // Process may already be dead — that's fine
        console.warn(`[botController] killProcessTree(${pid}):`, e.message);
    }
};

/**
 * Wait up to `maxMs` for the process to disappear, polling every `intervalMs`.
 */
const waitForProcessDeath = async (pid, maxMs = 5000, intervalMs = 300) => {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
        if (!isProcessRunning(pid)) return true;
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return !isProcessRunning(pid);
};

/**
 * Try to delete auth_data, retrying a few times in case Chrome is still
 * releasing file handles after being killed.
 */
const clearAuthData = async (authDataDir) => {
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            fs.rmSync(authDataDir, { recursive: true, force: true });
            console.log('[bot] Cleared auth_data for fresh QR');
            return true;
        } catch (e) {
            console.warn(`[bot] auth_data clear attempt ${attempt} failed:`, e.message);
            await new Promise(r => setTimeout(r, 800));
        }
    }
    return false;
};

// ─── Public helper (used by other controllers) ────────────────────────────────

export const getBotStatusPayload = () => {
    try {
        if (fs.existsSync(stateFile)) {
            const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            return {
                status: state.status || 'offline',
                qr: state.qr || null,
                phone: state.phone || null,
            };
        }
    } catch (e) {
        console.error('[botController] Failed to read bot state:', e.message);
    }
    return { status: 'offline', qr: null, phone: null };
};

// ─── Internal: stop any running bot ──────────────────────────────────────────

const stopBotInternal = async () => {
    const savedPid = getSavedPid();
    if (savedPid && isProcessRunning(savedPid)) {
        console.log(`[bot] Killing process tree for PID ${savedPid}…`);
        killProcessTree(savedPid);
        const died = await waitForProcessDeath(savedPid, 6000);
        if (!died) {
            console.warn(`[bot] PID ${savedPid} still alive after 6 s — forcing again`);
            killProcessTree(savedPid);
            await waitForProcessDeath(savedPid, 3000);
        }
    }
    clearPid();
};

// ─── Start Bot ────────────────────────────────────────────────────────────────

export const startBot = async (req, res) => {
    const savedPid = getSavedPid();
    const current = getBotStatusPayload();

    // Only 'online' means the bot is genuinely working — return early
    if (current.status === 'online' && savedPid && isProcessRunning(savedPid)) {
        return res.json({ success: true, message: 'Bot is already running.', ...current });
    }

    // If stuck at 'authenticated', 'connecting', or 'starting' with a dead/missing process,
    // kill whatever is left and do a clean restart so Chrome is freed
    if (['authenticated', 'connecting', 'starting'].includes(current.status) || (savedPid && isProcessRunning(savedPid))) {
        console.log(`[bot] Stuck at "${current.status}" — killing old process tree and restarting…`);
        await stopBotInternal();
        // Give the OS time to release file handles
        await new Promise(r => setTimeout(r, 2000));
    }

    try {
        writeState('starting');

        // Kill any leftover processes and clear auth_data for a fresh QR
        const authDataDir = path.join(__dirname, '..', 'auth_data');
        if (fs.existsSync(authDataDir)) {
            const cleared = await clearAuthData(authDataDir);
            if (!cleared) {
                console.warn('[bot] auth_data still locked — bot will attempt to reuse the existing session');
            }
        }

        // Redirect bot output to a log file for diagnostics
        const logFile = path.join(__dirname, '..', 'bot-error.log');
        const logStream = fs.openSync(logFile, 'a');

        // Spawn as fully detached so it survives server/nodemon restarts
        const child = spawn('node', [botFile], {
            detached: true,
            stdio: ['ignore', logStream, logStream],
            env: { ...process.env }
        });

        child.on('error', (err) => {
            console.error('[bot] Spawn error:', err.message);
            writeState('offline');
            clearPid();
            try { fs.closeSync(logStream); } catch { }
        });

        child.unref();

        if (!child.pid) {
            writeState('offline');
            try { fs.closeSync(logStream); } catch { }
            return res.status(500).json({ success: false, message: 'Failed to spawn bot process' });
        }

        savePid(child.pid);
        console.log(`[bot] Spawned PID ${child.pid} — output → bot-error.log`);

        // Give bot time to write its initial state (Puppeteer startup is slow)
        await new Promise(r => setTimeout(r, 1500));

        const updated = getBotStatusPayload();
        return res.json({ success: true, message: 'Bot started.', ...updated });
    } catch (err) {
        console.error('[bot] Failed to spawn bot:', err.message);
        writeState('offline');
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Stop Bot ─────────────────────────────────────────────────────────────────

export const stopBot = async (req, res) => {
    writeState('offline', null, null);
    await stopBotInternal();
    return res.json({ success: true, message: 'Bot stopped' });
};

// ─── Get Status ───────────────────────────────────────────────────────────────

export const getBotStatus = async (req, res) => {
    res.json(getBotStatusPayload());
};