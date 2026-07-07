import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFile = path.join(__dirname, '..', 'bot-state.json');
const pidFile   = path.join(__dirname, '..', 'bot-pid.json');
const botFile   = path.join(__dirname, '..', 'bot.js');

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
    } catch {}
};

const clearPid = () => {
    try { if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile); } catch {}
};

const getSavedPid = () => {
    try {
        if (fs.existsSync(pidFile)) {
            return JSON.parse(fs.readFileSync(pidFile, 'utf8')).pid || null;
        }
    } catch {}
    return null;
};

const isProcessRunning = (pid) => {
    try { process.kill(pid, 0); return true; } catch { return false; }
};

const killProcess = (pid) => {
    try { process.kill(pid, 'SIGKILL'); } catch {}
};

// ─── Public helper (used by other controllers) ────────────────────────────────

export const getBotStatusPayload = () => {
    try {
        if (fs.existsSync(stateFile)) {
            const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            return {
                status: state.status || 'offline',
                qr:     state.qr    || null,
                phone:  state.phone || null,
            };
        }
    } catch (e) {
        console.error('[botController] Failed to read bot state:', e.message);
    }
    return { status: 'offline', qr: null, phone: null };
};

// ─── Start Bot ────────────────────────────────────────────────────────────────

export const startBot = async (req, res) => {
    // Check if a bot process we previously spawned is still running
    const savedPid = getSavedPid();
    if (savedPid && isProcessRunning(savedPid)) {
        const current = getBotStatusPayload();
        return res.json({ success: true, message: 'Bot is already running.', ...current });
    }

    // Check state file (bot may have been started externally)
    const current = getBotStatusPayload();
    if (['online', 'connecting', 'authenticated', 'starting'].includes(current.status)) {
        return res.json({ success: true, message: 'Bot is already running.', ...current });
    }

    try {
        writeState('starting');

        // Clean up stale auth session so bot always shows a fresh QR
        // (ignore errors if files are locked by an orphaned Chrome process)
        const authDataDir = path.join(__dirname, '..', 'auth_data');
        if (fs.existsSync(authDataDir)) {
            try {
                fs.rmSync(authDataDir, { recursive: true, force: true });
                console.log('[bot] Cleared auth_data for fresh QR');
            } catch (e) {
                console.warn('[bot] Could not clear auth_data (may be locked):', e.message);
            }
        }

        // Redirect bot stderr to a log file so we can diagnose failures
        const logFile  = path.join(__dirname, '..', 'bot-error.log');
        const logStream = fs.openSync(logFile, 'a');

        // Spawn as fully detached so it survives server/nodemon restarts
        const child = spawn('node', [botFile], {
            detached: true,
            stdio:    ['ignore', logStream, logStream],   // stdin ignored, stdout+stderr → log
            env:      { ...process.env }
        });

        // MUST handle 'error' BEFORE calling unref() — an unhandled 'error' event
        // on any Node.js EventEmitter crashes the process, even after unref()
        child.on('error', (err) => {
            console.error('[bot] Spawn error:', err.message);
            writeState('offline');
            clearPid();
            try { fs.closeSync(logStream); } catch {}
        });

        child.unref(); // allow server to restart without killing the bot

        if (!child.pid) {
            writeState('offline');
            try { fs.closeSync(logStream); } catch {}
            return res.status(500).json({ success: false, message: 'Failed to spawn bot process' });
        }

        savePid(child.pid);
        console.log(`[bot] Spawned PID ${child.pid} — stderr → bot-error.log`);

        // Give bot time to write its initial state (Puppeteer startup is slow)
        await new Promise(r => setTimeout(r, 1200));

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
    // Immediately mark offline so the next poll returns correct state
    writeState('offline', null, null);

    const savedPid = getSavedPid();
    if (savedPid && isProcessRunning(savedPid)) {
        console.log(`[bot] Killing PID ${savedPid}`);
        killProcess(savedPid);
        // Wait briefly then verify
        await new Promise(r => setTimeout(r, 600));
        if (isProcessRunning(savedPid)) {
            killProcess(savedPid); // second attempt
        }
    }

    clearPid();
    return res.json({ success: true, message: 'Bot stopped' });
};

// ─── Get Status ───────────────────────────────────────────────────────────────

export const getBotStatus = async (req, res) => {
    res.json(getBotStatusPayload());
};


