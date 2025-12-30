const puppeteer = require("puppeteer-core");
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = '/home/browseruser/.claude/.credentials.json';
const SHARED_CREDENTIALS_PATH = '/opt/claude-credentials/.credentials.json';

(async () => {
    let browser = null;
    let ptyProc = null;

    try {
        console.log("=== OAuth Direct (no unbuffer) ===\n");

        // Start claude setup-token directly
        console.log("Starting claude setup-token...");
        ptyProc = pty.spawn('claude', ['setup-token'], {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd: '/home/browseruser',
            env: {
                HOME: '/home/browseruser',
                DISPLAY: ':1',
                BROWSER: 'echo',
                TERM: 'xterm-256color',
                PATH: process.env.PATH
            }
        });

        let output = '';
        let oauthUrl = null;
        let readyForCode = false;

        ptyProc.onData((data) => {
            output += data;
            // Clean escape codes for matching
            const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

            if (clean.includes('claude.ai/oauth/authorize') || data.includes('claude.ai/oauth/authorize')) {
                const m = output.match(/https:\/\/claude\.ai\/oauth\/authorize[^\s\x1b\n]+/);
                if (m && !oauthUrl) {
                    oauthUrl = m[0].replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
                    console.log("*** OAuth URL found ***");
                }
            }

            if (clean.includes('Paste code') || clean.includes('code here')) {
                readyForCode = true;
                console.log("*** Ready for code ***");
            }

            if (clean.includes('Success') || clean.includes("You're all set")) {
                console.log("*** SUCCESS in output! ***");
            }
        });

        // Wait for URL
        console.log("Waiting for OAuth URL...");
        for (let i = 0; i < 60 && !oauthUrl; i++) {
            await new Promise(r => setTimeout(r, 1000));
            if (i % 10 === 0 && i > 0) console.log(`  ${i}s...`);
        }
        if (!oauthUrl) throw new Error("No OAuth URL");

        console.log("OAuth URL:", oauthUrl.substring(0, 80) + "...\n");

        // Connect to browser
        const res = await fetch("http://localhost:9222/json/version");
        const data = await res.json();
        browser = await puppeteer.connect({
            browserWSEndpoint: data.webSocketDebuggerUrl,
            defaultViewport: null
        });
        const pages = await browser.pages();
        const page = pages[0];

        const client = await page.createCDPSession();
        await client.send('Network.enable');

        // Navigate to OAuth page
        console.log("Navigating to OAuth page...");
        await page.goto(oauthUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // Click Autorizar
        const buttonBox = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            for (const btn of btns) {
                const text = btn.textContent.trim().toLowerCase();
                if (text === "autorizar" || text === "authorize") {
                    const rect = btn.getBoundingClientRect();
                    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
                }
            }
            return null;
        });

        if (!buttonBox) throw new Error("Button not found");

        console.log("Clicking Autorizar...");
        await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: buttonBox.x, y: buttonBox.y, button: 'left', clickCount: 1 });
        await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: buttonBox.x, y: buttonBox.y, button: 'left', clickCount: 1 });

        // Wait for callback page
        console.log("Waiting for callback page...");
        await new Promise(r => setTimeout(r, 5000));

        // Get code from callback page
        const codeFromPage = await page.evaluate(() => {
            const text = document.body.innerText;
            const match = text.match(/([A-Za-z0-9_-]{40,}#[A-Za-z0-9_-]+)/);
            return match ? match[1] : null;
        });

        if (!codeFromPage) throw new Error("No code found");
        console.log("Code from page:", codeFromPage);

        // Wait for PTY to be ready
        console.log("Waiting for code prompt...");
        for (let i = 0; i < 30 && !readyForCode; i++) {
            await new Promise(r => setTimeout(r, 1000));
        }

        // Send code via PTY with slight delay
        console.log("Sending code...");
        await new Promise(r => setTimeout(r, 3000));

        // Type code with human-like delay
        for (let i = 0; i < codeFromPage.length; i++) {
            ptyProc.write(codeFromPage[i]);
            await new Promise(r => setTimeout(r, 10));
        }

        await new Promise(r => setTimeout(r, 500));
        console.log("Sending Enter...");
        ptyProc.write('\r');

        // Wait for authentication
        console.log("Waiting for authentication...");
        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 1000));

            try {
                if (fs.existsSync(CREDENTIALS_PATH)) {
                    const creds = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
                    if (creds.includes('accessToken')) {
                        const parsed = JSON.parse(creds);

                        console.log("\n========================================");
                        console.log("           SUCCESS!");
                        console.log("========================================");
                        console.log("Access:", parsed.claudeAiOauth?.accessToken?.substring(0, 60) + "...");
                        console.log("Refresh:", parsed.claudeAiOauth?.refreshToken?.substring(0, 60) + "...");

                        const dir = path.dirname(SHARED_CREDENTIALS_PATH);
                        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                        fs.copyFileSync(CREDENTIALS_PATH, SHARED_CREDENTIALS_PATH);
                        console.log("Copied to:", SHARED_CREDENTIALS_PATH);
                        console.log("========================================\n");

                        ptyProc.kill();
                        browser.disconnect();
                        process.exit(0);
                    }
                }
            } catch (e) {}

            if (i % 20 === 0 && i > 0) console.log(`  ${i}s...`);
        }

        console.log("\n--- No credentials ---");
        console.log("Output:", output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').slice(-2000));
        process.exit(1);

    } catch (err) {
        console.error("\nERROR:", err.message);
        if (ptyProc) ptyProc.kill();
        if (browser) browser.disconnect();
        process.exit(1);
    }
})();
