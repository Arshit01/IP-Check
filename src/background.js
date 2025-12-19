/**
 * IP Check - Background Service Worker
 * "Invisible Window" Scraper with Cloudflare Bypass (Waiting Logic).
 */

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'reputation-stream') {
        port.onMessage.addListener(async (msg) => {
            if (msg.ip) {
                // Trigger AbuseIPDB
                scrapeAbuseIPDB(msg.ip).then(data => {
                    port.postMessage({ type: 'partial_result', provider: 'abuseIpDb', data });
                });

                // Trigger VirusTotal
                scrapeVirusTotal(msg.ip).then(data => {
                    port.postMessage({ type: 'partial_result', provider: 'virusTotal', data });
                });
            }
        });
    }
});

// Handle One-off Messages (e.g. Open Background Tab)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'OPEN_IN_BACKGROUND_TAB' && request.url) {
        chrome.tabs.create({ url: request.url, active: false });
    }
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- ABUSEIPDB SCRAPER ---
async function scrapeAbuseIPDB(ip) {
    return scrapeWithWindow(`https://www.abuseipdb.com/check/${ip}`, async () => {

        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        let attempts = 0;
        while (attempts < 15) { // 15s timeout
            const title = document.title;
            const text = document.body.innerText;

            // Check for Blocking/Challenge
            if (title.includes('Just a moment') || title.includes('Cloudflare') || text.includes('Verify you are human')) {
                await sleep(1000);
                attempts++;
                continue;
            }

            // Check for Success Content
            const scoreMatch = text.match(/Confidence of Abuse is\s*(\d+)%/i);
            const notFound = text.includes('was not found in our database');

            if (scoreMatch || notFound) {
                let score = 0;
                if (scoreMatch) score = parseInt(scoreMatch[1], 10);

                const reportsMatch = text.match(/reported\s*([\d,]+)\s*times/i);
                let reports = '0';
                if (reportsMatch) reports = reportsMatch[1];

                let color = '#34d399';
                if (score > 0 && score < 50) color = '#fbbf24';
                if (score >= 50) color = '#f87171';

                // Extract Country && Domain
                let country = '?';
                let domain = '-';
                try {
                    const table = document.querySelector('.table');
                    if (table) {
                        const rows = table.querySelectorAll('tr');
                        for (const row of rows) {
                            const header = row.querySelector('th');
                            if (header) {
                                const headerText = header.innerText.toLowerCase();
                                if (headerText.includes('country')) {
                                    const dataCell = row.querySelector('td');
                                    if (dataCell) country = dataCell.innerText.trim();
                                }
                                if (headerText.includes('domain name')) {
                                    const dataCell = row.querySelector('td');
                                    if (dataCell) domain = dataCell.innerText.trim();
                                }
                            }
                        }
                    }
                } catch (e) { console.error('AbuseIPDB scrape error', e); }

                return { score: `${score}%`, reports, color, country, domain };
            }
            await sleep(1000);
            attempts++;
        }
        return { score: 'Captcha?', reports: '0', color: '#f87171' };
    });
}

// --- VIRUSTOTAL SCRAPER ---
async function scrapeVirusTotal(ip) {
    return scrapeWithWindow(`https://www.virustotal.com/gui/ip-address/${ip}`, async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        function getShadowDomText(root) {
            let t = '';
            try {
                if (root.nodeType === 3) t += root.textContent.trim() + ' ';
                else if (root.nodeType === 1) {
                    if (root.shadowRoot) t += getShadowDomText(root.shadowRoot);
                    if (root.childNodes) Array.from(root.childNodes).forEach(c => t += getShadowDomText(c));
                }
            } catch (e) { /* ignore */ }
            return t;
        }

        function deepQuery(root, selectors) {
            let current = root;
            try {
                for (const selector of selectors) {
                    if (!current) return null;
                    if (selector === 'SHADOW') current = current.shadowRoot;
                    else current = current.querySelector(selector);
                }
            } catch (e) { return null; }
            return current;
        }

        function findElementByText(root, text) {
            try {
                if (root.nodeType === 3) {
                    if (root.textContent.includes(text)) return root.parentNode;
                } else if (root.nodeType === 1) {
                    if (root.shadowRoot) {
                        const found = findElementByText(root.shadowRoot, text);
                        if (found) return found;
                    }
                    if (root.childNodes) {
                        for (const child of root.childNodes) {
                            const found = findElementByText(child, text);
                            if (found) return found;
                        }
                    }
                }
            } catch (e) { return null; }
            return null;
        }

        function findElementByTag(root, tagName) {
            const ELEMENT_NODE = 1;
            try {
                if (root.nodeType === ELEMENT_NODE) {
                    if (root.tagName.toLowerCase() === tagName.toLowerCase()) return root;
                    if (root.shadowRoot) {
                        const found = findElementByTag(root.shadowRoot, tagName);
                        if (found) return found;
                    }
                    if (root.childNodes) {
                        for (const child of root.childNodes) {
                            const found = findElementByTag(child, tagName);
                            if (found) return found;
                        }
                    }
                }
            } catch (e) { return null; }
            return null;
        }

        let attempts = 0;
        const MAX_ATTEMPTS = 15;

        try {
            while (attempts < MAX_ATTEMPTS) {
                const docTitle = document.title;
                const bodyText = document.body.innerText;

                if (docTitle.includes('Just a moment') || docTitle.includes('Cloudflare') || bodyText.includes('Verify you are human')) {
                    await sleep(1000);
                    attempts++;
                    continue;
                }

                let score = '...';
                let color = '#9ca3af';
                let country = '?';
                let domain = '-';
                let dateStr = '-';
                let timeAgo = null;

                const appRoot = document.querySelector("#view-container > default-layout > ip-address-view");

                // --- A. COUNTRY ---
                if (country === '?') {
                    const countryLink = deepQuery(appRoot, [
                        'SHADOW',
                        'div > div > div.col-12.col-md > vt-ui-ip-card',
                        'SHADOW',
                        'div > div.card-body.d-flex > div > div.hstack.gap-4 > a'
                    ]);
                    if (countryLink) country = countryLink.innerText.trim();
                }

                // --- B. SCORE ---
                if (score === '...') {
                    const scoreEl = deepQuery(appRoot, [
                        'SHADOW',
                        'div > div > div.col-12.col-md-auto > vt-ioc-score-widget',
                        'SHADOW',
                        'div > vt-ioc-score-widget-detections-chart',
                        'SHADOW',
                        'div > div'
                    ]);

                    if (scoreEl) {
                        const txt = scoreEl.innerText.trim();
                        // Look for "N / M" pattern
                        const match = txt.match(/(\d+)\s*\/\s*(\d+)/);
                        if (match) {
                            const positives = parseInt(match[1], 10);
                            const total = parseInt(match[2], 10);

                            color = '#34d399';
                            if (positives > 0) color = '#fbbf24';
                            if (positives >= 5) color = '#f87171';
                            score = `${positives}/${total}`;
                        } else {
                            if (!isNaN(parseInt(txt, 10))) {
                            }
                        }
                    }
                }

                // --- D. DOMAIN ---
                if (domain === '-') {
                    const whoisLink = deepQuery(appRoot, [
                        'SHADOW',
                        'div > div > div.col-12.col-md > vt-ui-ip-card',
                        'SHADOW',
                        'div > div.card-body.d-flex > div > div.hstack.gap-4 > div.vstack.gap-2.align-self-center.text-truncate.me-auto > div:nth-child(2) > span > a'
                    ]);

                    if (whoisLink) {
                        domain = whoisLink.innerText.trim();
                    }
                }

                // --- C. DATE ---
                const dateContainer = deepQuery(appRoot, [
                    'SHADOW', 'div > div > div.col-12.col-md > vt-ui-ip-card',
                    'SHADOW', 'div > div.card-body.d-flex > div > div.hstack.gap-4', 'div:nth-child(5)'
                ]);
                if (dateContainer) timeAgo = dateContainer.querySelector('vt-ui-time-ago');
                if (!timeAgo) {
                    const dateLabel = findElementByText(document.body, "Last Analysis Date");
                    if (dateLabel && dateLabel.nextElementSibling) timeAgo = dateLabel.nextElementSibling;
                }

                // --- PROCESS DATE OBJECT ---
                if (timeAgo) {
                    const tooltipDate = timeAgo.getAttribute('data-tooltip-text');
                    const relativeTime = timeAgo.innerText.trim() || timeAgo.shadowRoot?.textContent.trim();
                    let foundDateObj = null;
                    if (tooltipDate) {
                        foundDateObj = new Date(tooltipDate);
                    } else {
                        const unix = timeAgo.getAttribute('unixtime');
                        if (unix) foundDateObj = new Date(parseInt(unix, 10) * 1000);
                    }
                    if (foundDateObj && !isNaN(foundDateObj.getTime())) {
                        const options = {
                            timeZone: 'Asia/Kolkata',
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', hour12: false
                        };
                        const istDate = foundDateObj.toLocaleString('en-GB', options).replace(',', '');
                        dateStr = `${istDate} IST`;
                        if (relativeTime) dateStr += ` (${relativeTime})`;
                    }
                }

                // --- RETURN CONDITIONS ---
                const hasScore = score !== '...';
                const hasData = country !== '?' && dateStr !== '-';

                if (hasScore && hasData) return { score, color, country, domain, date: dateStr };
                if (hasScore && attempts > 10) return { score, color, country, domain, date: dateStr };
                if (attempts === MAX_ATTEMPTS - 1 && (hasScore || country !== '?')) return { score, color, country, domain, date: dateStr };

                await sleep(1000);
                attempts++;
            }
        } catch (globalErr) {
            console.error('VT Scraper Fatal:', globalErr);
            return { score: 'Err', color: '#f87171', country: 'Err', domain: 'Err', date: 'Err' };
        }
        return { score: 'Timeout', color: '#9ca3af' };
    });
}

// --- GENERIC WINDOW SCRAPER ---
async function scrapeWithWindow(url, func) {
    let windowId = null;
    try {
        const win = await chrome.windows.create({
            url: url,
            type: 'popup',
            state: 'minimized',
            focused: false
        });
        windowId = win.id;

        let tabId;
        if (win.tabs && win.tabs.length > 0) {
            tabId = win.tabs[0].id;
        } else {
            const tabs = await chrome.tabs.query({ windowId: windowId });
            tabId = tabs[0]?.id;
        }
        if (!tabId) throw new Error('No tab');

        await sleep(2000);
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: func
        });

        if (results && results[0] && results[0].result) {
            return results[0].result;
        }
    } catch (e) {
        console.error('Scrape Error:', e);
    } finally {
        if (windowId) chrome.windows.remove(windowId);
    }
    return { score: 'Err', color: '#9ca3af' };
}
