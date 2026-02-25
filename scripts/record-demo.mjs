import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = resolve(__dirname, '..', 'build', 'chrome', 'dev');
const OUTPUT_DIR = resolve(__dirname, '..', 'demo');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'bbc-demo.mp4');

const DISPLAY = ':99';
const WIDTH = 1280;
const HEIGHT = 800;

mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function smoothScroll(pg, distance, duration) {
    const steps = 20;
    const stepDistance = distance / steps;
    const stepDelay = duration / steps;
    for (let i = 0; i < steps; i++) {
        await pg.evaluate((d) => window.scrollBy(0, d), stepDistance);
        await sleep(stepDelay);
    }
}

async function safeGoto(pg, url, timeout = 30000) {
    try {
        await pg.goto(url, { waitUntil: 'domcontentloaded', timeout });
        await sleep(3000);
    } catch (err) {
        console.log(`  Navigation warning (non-fatal): ${err.message.slice(0, 100)}`);
        await sleep(2000);
    }
}

async function closeUnwantedTabs(browser, keepPage) {
    const allPages = await browser.pages();
    for (const p of allPages) {
        if (p === keepPage) continue;
        const url = p.url();
        if (url.includes('duckduckgo.com') || url === 'about:blank' || url === 'chrome://new-tab-page/') {
            console.log(`  Auto-closing tab: ${url.slice(0, 60)}`);
            await p.close().catch(() => {});
        }
    }
    await keepPage.bringToFront();
}

console.log('Starting Xvfb virtual display...');
const xvfb = spawn('Xvfb', [DISPLAY, '-screen', '0', `${WIDTH}x${HEIGHT}x24`, '-ac'], {
    stdio: 'ignore',
});
await sleep(1500);
process.env.DISPLAY = DISPLAY;

console.log('Starting ffmpeg screen recording...');
const ffmpeg = spawn(
    'ffmpeg',
    [
        '-y',
        '-f',
        'x11grab',
        '-video_size',
        `${WIDTH}x${HEIGHT}`,
        '-framerate',
        '15',
        '-i',
        DISPLAY,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '28',
        OUTPUT_FILE,
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] },
);
await sleep(1500);

console.log('Launching Chrome with DuckDuckGo extension...');
const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 60000,
    executablePath: '/home/ubuntu/.cache/puppeteer/chrome/linux-145.0.7632.46/chrome-linux64/chrome',
    args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        `--window-size=${WIDTH},${HEIGHT}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-infobars',
        '--disable-session-crashed-bubble',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
    ],
    defaultViewport: null,
    env: { ...process.env, DISPLAY },
});

try {
    // Wait for extension to fully initialize and open any welcome tabs
    console.log('Waiting for extension initialization...');
    await sleep(5000);

    // Close all DDG/blank tabs, get a clean page
    let allPages = await browser.pages();
    console.log(`Found ${allPages.length} tabs after init`);
    for (const p of allPages) {
        console.log(`  Tab: ${p.url().slice(0, 80)}`);
    }

    // Find or create a page to use, close DDG tabs
    let page = null;
    for (const p of allPages) {
        const url = p.url();
        if (url.includes('duckduckgo.com')) {
            // Navigate this tab away from DDG instead of closing it
            if (!page) {
                page = p;
            } else {
                await p.close().catch(() => {});
            }
        }
    }
    if (!page) {
        page = allPages[0];
    }

    // Close all other tabs
    allPages = await browser.pages();
    for (const p of allPages) {
        if (p !== page) await p.close().catch(() => {});
    }
    await page.bringToFront();

    // Auto-close any new DDG tabs the extension might open
    browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
            const newPage = await target.page();
            if (newPage) {
                const url = newPage.url();
                if (url.includes('duckduckgo.com')) {
                    console.log(`  Auto-closing new DDG tab: ${url.slice(0, 60)}`);
                    await sleep(200);
                    await newPage.close().catch(() => {});
                    await page.bringToFront().catch(() => {});
                }
            }
        }
    });

    // -- Scene 1: Browse BBC homepage --
    console.log('Scene 1: Navigating to bbc.com...');
    await safeGoto(page, 'https://www.bbc.com');
    await closeUnwantedTabs(browser, page);
    await sleep(2000);

    console.log('  Scrolling through BBC homepage...');
    await smoothScroll(page, 500, 2000);
    await sleep(1500);
    await smoothScroll(page, 500, 2000);
    await sleep(1500);

    console.log('  Scrolling back to top...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(2000);

    // -- Scene 2: Open extension popup to show privacy dashboard --
    console.log('Scene 2: Opening the DuckDuckGo privacy dashboard...');
    const targets = browser.targets();
    const extensionTarget = targets.find(
        (t) => t.type() === 'service_worker' && t.url().includes('chrome-extension://'),
    );
    if (extensionTarget) {
        const extensionId = extensionTarget.url().split('/')[2];
        console.log(`  Extension ID: ${extensionId}`);

        const popupPage = await browser.newPage();
        await popupPage.setViewport({ width: 380, height: 600 });
        try {
            await popupPage.goto(`chrome-extension://${extensionId}/dashboard/html/browser.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 10000,
            });
        } catch (err) {
            console.log(`  Popup load warning: ${err.message.slice(0, 80)}`);
        }
        await sleep(4000);
        await popupPage.close();
    } else {
        console.log('  Could not find extension service worker target');
    }
    await closeUnwantedTabs(browser, page);
    await sleep(1500);

    // -- Scene 3: Navigate to BBC News --
    console.log('Scene 3: Navigating to BBC News...');
    await safeGoto(page, 'https://www.bbc.com/news');
    await closeUnwantedTabs(browser, page);
    await sleep(2000);
    await smoothScroll(page, 400, 1500);
    await sleep(2000);
    await smoothScroll(page, 400, 1500);
    await sleep(2000);

    // -- Scene 4: Navigate to BBC Sport --
    console.log('Scene 4: Navigating to BBC Sport...');
    await safeGoto(page, 'https://www.bbc.com/sport');
    await closeUnwantedTabs(browser, page);
    await sleep(2000);
    await smoothScroll(page, 400, 1500);
    await sleep(2000);

    console.log('Final pause...');
    await sleep(2000);
} catch (err) {
    console.error('Error during recording:', err.message);
} finally {
    console.log('Stopping recording...');
    await browser.close().catch(() => {});
    await sleep(1000);

    ffmpeg.stdin.write('q');
    await new Promise((r) => {
        ffmpeg.on('close', r);
        setTimeout(() => {
            ffmpeg.kill('SIGINT');
            r();
        }, 5000);
    });

    xvfb.kill();
    console.log(`Demo recorded to: ${OUTPUT_FILE}`);
}
