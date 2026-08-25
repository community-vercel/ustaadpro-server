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

const hasSavedSession = () => {
    try {
        const authDataDir = path.join(__dirname, '..', 'auth_data');
        if (!fs.existsSync(authDataDir)) return false;
        const files = fs.readdirSync(authDataDir);
        return files.some(file => file.startsWith('session-'));
    } catch {
        return false;
    }
};

/**
 * Try to delete auth_data, retrying a few times in case Chrome is still
 * releasing file handles after being killed.
 */
const clearAuthData = async (authDataDir) => {
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            fs.rmSync(authDataDir, { recursive: true, force: true });
            console.log('[bot] Cleared auth_data session');
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

const spawnBotProcessInternal = async () => {
    const savedPid = getSavedPid();
    if (['authenticated', 'connecting', 'starting'].includes(getBotStatusPayload().status) || (savedPid && isProcessRunning(savedPid))) {
        console.log('[bot] Stopping active or stuck bot process before spawning new process...');
        await stopBotInternal();
        await new Promise(r => setTimeout(r, 2000));
    }

    writeState('starting');

    const logFile = path.join(__dirname, '..', 'bot-error.log');
    const logStream = fs.openSync(logFile, 'a');

    const child = spawn(process.execPath, [botFile], {
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
        throw new Error('Failed to spawn bot process');
    }

    savePid(child.pid);
    console.log(`[bot] Spawned PID ${child.pid} — output → bot-error.log`);

    await new Promise(r => setTimeout(r, 3000));
    return getBotStatusPayload();
};

// ─── Start Bot ────────────────────────────────────────────────────────────────

export const startBot = async (req, res) => {
    const savedPid = getSavedPid();
    const current = getBotStatusPayload();

    // Only 'online' means the bot is genuinely working — return early
    if (current.status === 'online' && savedPid && isProcessRunning(savedPid)) {
        return res.json({ success: true, message: 'Bot is already running.', ...current });
    }

    try {
        const updated = await spawnBotProcessInternal();
        return res.json({ success: true, message: 'Bot started.', ...updated });
    } catch (err) {
        console.error('[bot] Failed to spawn bot:', err.message);
        writeState('offline');
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Stop / Disconnect Bot ───────────────────────────────────────────────────

export const stopBot = async (req, res) => {
    writeState('offline', null, null);
    await stopBotInternal();

    // Clear auth_data on manual disconnect from admin panel
    const authDataDir = path.join(__dirname, '..', 'auth_data');
    if (fs.existsSync(authDataDir)) {
        const cleared = await clearAuthData(authDataDir);
        if (cleared) {
            console.log('[bot] Cleared auth_data on manual disconnect');
        }
    }

    return res.json({ success: true, message: 'Bot stopped and session cleared' });
};

// ─── Get Status ───────────────────────────────────────────────────────────────

export const getBotStatus = async (req, res) => {
    res.json(getBotStatusPayload());
};

// ─── Startup: reset state or auto-restore session ─────────────────────────────
// Called once from server.js on startup.

export const resetStateIfDead = async () => {
    try {
        const savedPid = getSavedPid();
        const state = getBotStatusPayload();
        const pidRunning = savedPid && isProcessRunning(savedPid);

        if (pidRunning) {
            console.log(`[bot] Startup check: state is "${state.status}" and PID ${savedPid} is alive.`);
            return;
        }

        // If process is dead, check if a saved session exists in auth_data
        if (hasSavedSession()) {
            console.log('[bot] Startup check: Saved session found in auth_data — auto-restoring bot process...');
            await spawnBotProcessInternal();
        } else {
            console.log('[bot] Startup check: No running process and no saved session — setting state to offline.');
            writeState('offline', null, null);
            clearPid();
        }
    } catch (e) {
        console.error('[bot] resetStateIfDead error:', e.message);
        writeState('offline', null, null);
        clearPid();
    }
};

// ─── Diagnostics ──────────────────────────────────────────────────────────────
// GET /api/bot/diagnostics — use this to remotely confirm Chrome is found,
// Node version, OS platform, and the current bot state. No SSH needed.

export const getBotDiagnostics = (req, res) => {
    // Resolve which Chrome candidate exists
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/lib/chromium-browser/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ].filter(Boolean);

    const foundChrome = candidates.find(p => {
        try { return fs.existsSync(p); } catch { return false; }
    }) || null;

    const savedPid = getSavedPid();
    const botState = getBotStatusPayload();

    res.json({
        platform: process.platform,
        nodeVersion: process.version,
        nodeExecPath: process.execPath,
        puppeteerExecPathEnv: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        chromeCandidates: candidates,
        chromeFoundAt: foundChrome,
        botState,
        savedPid,
        pidAlive: savedPid ? isProcessRunning(savedPid) : false,
    });
};