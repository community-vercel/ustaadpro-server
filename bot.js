import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import whatsapp from 'whatsapp-web.js';
const { Client, LocalAuth } = whatsapp;
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { 
    getCategories, 
    getServicesForCategory, 
    resolveCategory, 
    buildCategoryMenu, 
    buildServicesMenu, 
    buildOptionsMenu,
    HARDCODED_HOME,
    HARDCODED_CLEANING
} from './services/whatsappService.js';
import { validateAndParseDate, validateTime, validateAddress } from './utils/validators.js';
import { buildConfirmationPreview } from './utils/helpers.js';
import { processImageForDB } from './utils/imageHandler.js';
import Booking from './models/botBooking.js';
import Session from './models/botSession.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const browserCandidates = [
    // ── Env override (set PUPPETEER_EXECUTABLE_PATH on any platform) ──
    process.env.PUPPETEER_EXECUTABLE_PATH,
    // ── Linux / Ubuntu / Debian (production VPS) ──
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/usr/lib/chromium-browser/chromium-browser',
    // ── Windows (local development) ──
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const browserExecutablePath = browserCandidates.find(candidate =>
    fs.existsSync(candidate)
);

// ═══════════════════════════════════════
// 🤖 WHATSAPP CLIENT
// ═══════════════════════════════════════
let isShuttingDown = false;

const setBotState = (status, qr = null, phone = null) => {
    global.botStatus = status;
    global.botQR = qr;
    global.botPhone = phone;
    
    // Write state to file so server.js can read it across processes
    try {
        fs.writeFileSync(path.join(__dirname, 'bot-state.json'), JSON.stringify({ status, qr, phone }));
    } catch (err) {
        console.error('Failed to write bot state to file:', err);
    }
};

const shutdownBot = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    setBotState('stopping');
    console.log(`🛑 Received ${signal}; shutting down bot...`);

    try {
        await client.destroy();
    } catch (error) {
        console.error('Error while stopping bot client:', error);
    }

    process.exit(0);
};

const client = new Client({
    authStrategy: new LocalAuth({ 
        clientId: 'raja-sajawal-home-services', 
        dataPath: path.join(__dirname, 'auth_data') 
    }),
    authTimeoutMs: 120000,
    qrMaxRetries: 5,
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1017054665.html',
    },
    puppeteer: {
        ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
        headless: true,
        defaultViewport: null,
        timeout: 120000,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--no-first-run', '--disable-gpu', '--disable-extensions'
        ]
    }
});
setBotState('starting');

client.on('qr', async (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Scan QR code to start:');
    try {
        const qrImageBase64 = await QRCode.toDataURL(qr);
        setBotState('connecting', qrImageBase64);
    } catch (err) {
        console.error('Failed to generate QR image:', err);
        setBotState('connecting', null);
    }
});

client.on('ready', () => {
    setBotState('online', null, client.info?.wid?.user || 'Connected');
    console.log('✅ Bot Ready!');
});

client.on('authenticated', () => {
    setBotState('authenticated');
    console.log('✅ Authenticated!');
});

client.on('disconnected', async (reason) => {
    if (isShuttingDown) return;
    setBotState('offline');
    console.log('⚠️ Disconnected:', reason);

    if (process.env.NODE_ENV === 'development') {
        return;
    }

    setTimeout(async () => {
        try { await client.initialize(); } catch (e) { process.exit(1); }
    }, 10000);
});

// ═══════════════════════════════════════
// MEMORY SESSIONS (Fast + DB backup)
// ═══════════════════════════════════════
let userSessions = {};

// ═══════════════════════════════════════
// 💬 MAIN MESSAGE HANDLER
// ═══════════════════════════════════════
client.on('message', async (msg) => {
    const userId = msg.from;
    const incomingText = msg.body ? msg.body.trim() : "";

    try {
        // ═══════════ GREETING / RESTART ═══════════
        if (
            !userSessions[userId] ||
            incomingText.toLowerCase() === 'hi' ||
            incomingText.toLowerCase() === 'hello' ||
            incomingText.toLowerCase() === 'restart'
        ) {
            const categories = await getCategories();
            
            userSessions[userId] = {
                state: 'SELECT_CATEGORY',
                orderDetails: {},
                categoryMenu: categories,
                currentCategory: null,
                currentServiceKey: null,
                currentServiceType: null,
                changeDateTemp: null
            };

            await client.sendMessage(userId,
                `Assalam-o-Alaikum! Welcome to *Ustad Pro Home Services*!\n\n` +
                `Which service do you need?\n` +
                `Please select a number from below:\n\n` +
                buildCategoryMenu(categories)
            );
            return;
        }

        const session = userSessions[userId];
        if (!session) return;

        switch (session.state) {

            // ═══════════ SELECT CATEGORY ═══════════
            case 'SELECT_CATEGORY': {
                const categories = session.categoryMenu || await getCategories();
                const selected = resolveCategory(categories, incomingText);

                if (selected) {
                    const services = await getServicesForCategory(selected);
                    
                    session.state = 'CATEGORY_SERVICES';
                    session.currentCategory = selected;
                    session.currentServiceType = selected;
                    session.orderDetails.mainCategory = selected;

                    await client.sendMessage(userId,
                        `*${selected}*\n\n` +
                        `Please type the number of your required service:\n\n` +
                        buildServicesMenu(services)
                    );
                } else {
                    await client.sendMessage(userId,
                        `Invalid Input!\n\n` +
                        `Please type one of the numbers below:\n\n` +
                        buildCategoryMenu(categories)
                    );
                }
                break;
            }

            // ═══════════ CATEGORY SERVICES ═══════════
            case 'CATEGORY_SERVICES': {
                const category = session.currentCategory;
                const services = await getServicesForCategory(category);
                const serviceCount = Object.keys(services).length;

                if (services[incomingText]) {
                    session.state = 'SERVICE_OPTIONS';
                    session.currentServiceKey = incomingText;
                    session.orderDetails.serviceType = services[incomingText].name;

                    await client.sendMessage(userId,
                        `${services[incomingText].msg}\n\n` +
                        `---------------------------------------\n` +
                        `Select a numeric option from above,\n` +
                        `or describe your issue in detail and send.`
                    );
                } else if (/^\d+$/.test(incomingText)) {
                    const menu = buildServicesMenu(services);
                    await client.sendMessage(userId,
                        `"${incomingText}" is not a valid option!\n\n` +
                        `${category} only has options 1 to ${serviceCount}:\n\n` +
                        `${menu}\n\n` +
                        `Please type a correct number from 1 to ${serviceCount}.`
                    );
                } else {
                    await client.sendMessage(userId,
                        `Please select a number from the menu!\n\n` +
                        `Type a number from 1 to ${serviceCount}:\n\n` +
                        buildServicesMenu(services)
                    );
                }
                break;
            }

            // ═══════════ SERVICE OPTIONS ═══════════
            case 'SERVICE_OPTIONS': {
                const category = session.currentCategory;
                const services = await getServicesForCategory(category);
                const currentService = services[session.currentServiceKey];

                if (!currentService) {
                    session.state = 'CATEGORY_SERVICES';
                    await client.sendMessage(userId,
                        `Service not available. Please select again:\n\n` +
                        buildServicesMenu(services)
                    );
                    return;
                }

                const totalOptions = Object.keys(currentService.options).length;
                const optionsMenuText = buildOptionsMenu(currentService);

                if (/^\d+$/.test(incomingText)) {
                    if (currentService.options[incomingText]) {
                        session.orderDetails.subService = currentService.options[incomingText];
                    } else {
                        await client.sendMessage(userId,
                            `"${incomingText}" is a wrong option!\n\n` +
                            `*${currentService.name}* has only ${totalOptions} options:\n\n` +
                            `${optionsMenuText}\n\n` +
                            `Please type a correct number from 1 to ${totalOptions},\n` +
                            `or describe your issue in detail and send.`
                        );
                        return;
                    }
                } else {
                    const customText = incomingText.trim();
                    if (customText.length < 5) {
                        await client.sendMessage(userId,
                            `Too short!\n\nDescribe your issue in more detail (min 5 characters).\n\n` +
                            `Or select a number from 1 to ${totalOptions}:\n\n${optionsMenuText}`
                        );
                        return;
                    }
                    session.orderDetails.subService = `Custom Issue: ${customText}`;
                }

                session.state = 'SELECT_DATE';
                await client.sendMessage(userId,
                    `Service Noted!\n\n` +
                    `Category: ${session.orderDetails.mainCategory}\n` +
                    `Service: ${session.orderDetails.serviceType}\n` +
                    `Detail: ${session.orderDetails.subService}\n\n` +
                    `---------------------------------------\n\n` +
                    `Date Selection:\n` +
                    `Please type the visit Date:\n\n` +
                    `- 15 June or 15th June 2025\n- 15/06/2025 or 15-06\n- Tomorrow / Kal / Aaj\n\n` +
                    `Past dates will not be accepted.`
                );
                break;
            }

            // ═══════════ SELECT DATE ═══════════
            case 'SELECT_DATE': {
                const result = validateAndParseDate(incomingText);
                if (result.error) {
                    await client.sendMessage(userId, result.message);
                    return;
                }
                session.orderDetails.date = result.formatted;
                session.state = 'SELECT_TIME';
                await client.sendMessage(userId,
                    `Date Confirmed: ${result.formatted}\n\n` +
                    `---------------------------------------\n\n` +
                    `Time Selection:\nPlease tell us the visit time:\n\n` +
                    `Example: 10:00 AM or 4:00 PM\n\n` +
                    `Services available 8:00 AM to 6:00 PM only.\nAM or PM is mandatory.`
                );
                break;
            }

            // ═══════════ SELECT TIME ═══════════
            case 'SELECT_TIME': {
                const result = validateTime(incomingText);
                if (result.error) {
                    await client.sendMessage(userId, result.message);
                    return;
                }
                session.orderDetails.time = incomingText;
                
                if (userId.endsWith('@c.us')) {
                    session.orderDetails.customerPhone = userId.split('@')[0];
                    session.state = 'SELECT_ADDRESS';
                    await client.sendMessage(userId,
                        `Time Confirmed: ${incomingText}\n\n` +
                        `---------------------------------------\n\n` +
                        `Address:\nPlease type your complete home address.\n\n` +
                        `Must include:\nHouse number, Street/Gali, Area and City name.\n\n` +
                        `Best Option: Share your Location Map!`
                    );
                } else {
                    session.state = 'SELECT_PHONE';
                    await client.sendMessage(userId,
                        `Time Confirmed: ${incomingText}\n\n` +
                        `---------------------------------------\n\n` +
                        `Please enter your phone number so our team can contact you:\n\n` +
                        `Example: 0300 1234567`
                    );
                }
                break;
            }

            // ═══════════ SELECT PHONE ═══════════
            case 'SELECT_PHONE': {
                const phoneStr = incomingText.replace(/[\s-]/g, '');
                if (phoneStr.length >= 11 && (phoneStr.startsWith('03') || phoneStr.startsWith('+92') || phoneStr.startsWith('92'))) {
                    session.orderDetails.customerPhone = phoneStr;
                    session.state = 'SELECT_ADDRESS';
                    await client.sendMessage(userId,
                        `Phone Confirmed: ${incomingText}\n\n` +
                        `---------------------------------------\n\n` +
                        `Address:\nPlease type your complete home address.\n\n` +
                        `Must include:\nHouse number, Street/Gali, Area and City name.\n\n` +
                        `Best Option: Share your Location Map!`
                    );
                } else {
                    await client.sendMessage(userId,
                        `Invalid Phone Number!\n\n` +
                        `Please enter a valid 11-digit mobile number:\n\n` +
                        `Example: 0300 1234567`
                    );
                }
                break;
            }

            // ═══════════ SELECT ADDRESS ═══════════
            case 'SELECT_ADDRESS': {
                if (msg.location) {
                    session.orderDetails.address = `Map Location: Lat ${msg.location.latitude}, Lng ${msg.location.longitude}`;
                    session.orderDetails.addressType = 'map';
                    session.state = 'UPLOAD_PIC';
                    await client.sendMessage(userId,
                        `Location Map Received! Thank you!\n\n` +
                        `---------------------------------------\n\n` +
                        `Media Upload (Optional):\nSend a picture of the issue now,\n` +
                        `or type No / Skip to continue.`
                    );
                    return;
                }

                const result = validateAddress(incomingText.trim());
                if (result.error) {
                    await client.sendMessage(userId, result.message);
                    return;
                }
                session.orderDetails.address = incomingText.trim();
                session.orderDetails.addressType = 'text';
                session.state = 'UPLOAD_PIC';
                await client.sendMessage(userId,
                    `Address Saved!\n${incomingText.trim()}\n\n` +
                    `---------------------------------------\n\n` +
                    `Media Upload (Optional):\nSend a picture of the issue now,\n` +
                    `or type No / Skip to continue.`
                );
                break;
            }

            // ═══════════ UPLOAD PIC ═══════════
            case 'UPLOAD_PIC': {
                let imageData = null, imageMime = null, hasImageText = 'No Picture';

                if (msg.hasMedia) {
                    try {
                        const media = await msg.downloadMedia();
                        if (media?.data) {
                            imageData = processImageForDB(media.data);
                            imageMime = media.mimetype;
                            hasImageText = 'Yes (Attached)';
                        }
                    } catch (err) {
                        console.error("Image error:", err);
                    }
                }

                session.orderDetails.hasImage = hasImageText;
                session.orderDetails.imageData = imageData;
                session.orderDetails.imageMime = imageMime;
                session.state = 'CONFIRMATION_MENU';

                const summary = buildConfirmationPreview({
                    orderDetails: session.orderDetails
                });
                await client.sendMessage(userId, summary);
                break;
            }

            // ═══════════ CONFIRMATION MENU ═══════════
            case 'CONFIRMATION_MENU':
                if (incomingText === '1') {
                    await Booking.create(userId, session.orderDetails);
                    
                    await client.sendMessage(userId,
                        `Thank you! Your Order Has Been Placed Successfully!\n\n` +
                        `================================\n` +
                        `Category: ${session.orderDetails.mainCategory}\n` +
                        `Service: ${session.orderDetails.serviceType}\n` +
                        `Date: ${session.orderDetails.date}\n` +
                        `Time: ${session.orderDetails.time}\n` +
                        `================================\n\n` +
                        `Our team will contact you soon.\n\n` +
                        `Thank you for using Ustad Pro Home Services!`
                    );
                    console.log("✅ Booking Confirmed:", session.orderDetails);
                    delete userSessions[userId];
                } else if (incomingText === '2') {
                    session.state = 'CHANGE_DATE_TIME';
                    session.changeDateTemp = null;
                    await client.sendMessage(userId,
                        `Change Date & Time:\n\nPlease type the new visit Date:\n\n` +
                        `- 15 June or 15th June 2025\n- 15/06/2025 or 15-06\n- Tomorrow / Kal / Aaj`
                    );
                } else if (incomingText === '3') {
                    session.state = 'CHANGE_ADDRESS';
                    await client.sendMessage(userId,
                        `Change Address:\n\nPlease type your new complete Address\n` +
                        `or share your Location Map:\n\n` +
                        `Must include House No, Street, Area and City.`
                    );
                } else if (incomingText === '4') {
                    delete userSessions[userId];
                    await client.sendMessage(userId,
                        `Order Cancelled.\n\nType Hi or Hello to book again.`
                    );
                } else {
                    await client.sendMessage(userId,
                        `Wrong Option!\n\nPlease select only 1, 2, 3 or 4:\n\n` +
                        `1. Confirm Order (All good)\n2. Change Date / Time\n` +
                        `3. Change Address\n4. Cancel & Start Again`
                    );
                }
                break;

            // ═══════════ CHANGE DATE & TIME ═══════════
            case 'CHANGE_DATE_TIME': {
                if (!session.changeDateTemp) {
                    const result = validateAndParseDate(incomingText);
                    if (result.error) { await client.sendMessage(userId, result.message); return; }
                    session.changeDateTemp = result.formatted;
                    await client.sendMessage(userId,
                        `Date Confirmed: ${result.formatted}\n\n` +
                        `Now type the new Time:\n\nExample: 10:00 AM or 4:00 PM\n\n` +
                        `Services available 8:00 AM to 6:00 PM only.`
                    );
                    return;
                }
                const result = validateTime(incomingText);
                if (result.error) { await client.sendMessage(userId, result.message); return; }
                session.orderDetails.date = session.changeDateTemp;
                session.orderDetails.time = incomingText;
                session.changeDateTemp = null;
                session.state = 'CONFIRMATION_MENU';
                await client.sendMessage(userId,
                    `Date & Time Updated!\nNew Date: ${session.orderDetails.date}\nNew Time: ${session.orderDetails.time}\n`
                );
                await client.sendMessage(userId, buildConfirmationPreview({ orderDetails: session.orderDetails }));
                break;
            }

            // ═══════════ CHANGE ADDRESS ═══════════
            case 'CHANGE_ADDRESS': {
                if (msg.location) {
                    session.orderDetails.address = `Map Location: Lat ${msg.location.latitude}, Lng ${msg.location.longitude}`;
                    session.orderDetails.addressType = 'map';
                } else {
                    const result = validateAddress(incomingText.trim());
                    if (result.error) { await client.sendMessage(userId, result.message); return; }
                    session.orderDetails.address = incomingText.trim();
                    session.orderDetails.addressType = 'text';
                }
                session.state = 'CONFIRMATION_MENU';
                await client.sendMessage(userId, `Address Updated!\n`);
                await client.sendMessage(userId, buildConfirmationPreview({ orderDetails: session.orderDetails }));
                break;
            }
        }

        // Persist session to DB
        try { await Session.upsert(userId, session); } catch {}
        
    } catch (error) {
        console.error('Message handling failed:', error);
        await client.sendMessage(userId,
            `Sorry, something went wrong. Please try again by typing Hi.`
        );
    }
});

// ═══════════════════════════════════════
// 🚀 INITIALIZE
// ═══════════════════════════════════════
process.once('SIGINT', () => { void shutdownBot('SIGINT'); });
process.once('SIGTERM', () => { void shutdownBot('SIGTERM'); });

client.initialize().catch((error) => {
    setBotState('offline');
    console.error('❌ Bot failed:', error);
    process.exit(1);
});
export { client };