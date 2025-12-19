/**
 * Reputation Card UI Component
 * Handles rendering, positioning, and interactions (drag/resize).
 */
export class ReputationCard {
    constructor() {
        this.HOST_ID = 'ip-rep-checker-overlay';
        this.TRIGGER_ID = 'ip-rep-trigger-btn';
        this.CARD_ID = 'ip-rep-card-panel';
        this.THEME_KEY = 'ip-rep-theme';

        this.host = null;
        this.currentIp = null;
        this.iconUrl = chrome.runtime.getURL('icons/icon256.png');
        this.currentIp = null;
        this.iconUrl = chrome.runtime.getURL('icons/icon256.png');
        this.theme = 'dark'; // Default, will be updated async


        // Drag State
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.initialLeft = 0;
        this.initialTop = 0;

        // Resize State (Card)
        this.isResizing = false;
        this.resizeDir = '';
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.initialWidth = 0;
        this.initialHeight = 0;
        this.initialResizeLeft = 0;
        this.initialResizeTop = 0;
        this.initialAutoWidth = 350;

        // Resize State (Columns)
        this.isColResizing = false;
        this.colResizeTh = null;
        this.colStartWidth = 0;
        this.colStartX = 0;

        // Bind methods
        this.handleGlobalMouseMove = this.handleGlobalMouseMove.bind(this);
        this.handleGlobalMouseUp = this.handleGlobalMouseUp.bind(this);
        this.toggleTheme = this.toggleTheme.bind(this);
    }

    init() {
        if (document.getElementById(this.HOST_ID)) return;

        this.host = document.createElement('div');
        this.host.id = this.HOST_ID;
        this.host.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 999999999;
            --ip-bg: #111827;
            --ip-text-main: #ffffff;
            --ip-text-muted: #9ca3af;
            --ip-border: #374151;
            --ip-row-bg: rgba(255,255,255,0.05);
            --ip-accent-bg: rgba(99,102,241,0.2);
            --ip-accent-text: #818cf8;
        `;
        // Async fetch theme
        chrome.storage.local.get([this.THEME_KEY], (result) => {
            if (result[this.THEME_KEY]) {
                this.theme = result[this.THEME_KEY];
                this.applyTheme(this.theme, false);
            } else {
                this.applyTheme('dark', false);
            }
        });


        const trigger = document.createElement('div');
        trigger.id = this.TRIGGER_ID;
        trigger.style.cssText = `
            position: absolute; display: none; cursor: pointer; pointer-events: auto;
            z-index: 999999999; transition: transform 0.2s;
        `;
        const img = document.createElement('img');
        img.src = this.iconUrl;
        img.style.cssText = 'width: 26px; height: 26px; display: block; border-radius: 4px;';
        trigger.appendChild(img);
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCard();
        });

        const card = document.createElement('div');
        card.id = this.CARD_ID;
        card.style.cssText = `
            position: absolute; display: none;
            width: auto; min-width: 300px;
            background: var(--ip-bg) !important; 
            color: var(--ip-text-main) !important;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            pointer-events: auto; z-index: 999999999;
            font-family: sans-serif; 
            border: 1px solid var(--ip-border) !important;
            overflow: hidden; user-select: none;
        `;

        this.host.appendChild(trigger);
        this.host.appendChild(card);
        document.body.appendChild(this.host);

        // Global Listeners for Drag/Resize
        document.addEventListener('mousemove', this.handleGlobalMouseMove);
        document.addEventListener('mouseup', this.handleGlobalMouseUp);

        // Hide on outside click
        document.addEventListener('mousedown', (e) => {
            if (!this.host) return;
            const target = e.target;
            // Check if clicking inside the host (card or trigger)
            if (!target.closest(`#${this.HOST_ID}`) && !this.isDragging && !this.isResizing && !this.isColResizing) {
                // Also check if we are toggling theme, don't hide
                if (target.dataset.toggle === 'theme') return;
                this.hideUI();
            }
        });
    }

    applyTheme(mode, save = true) {
        this.theme = mode;
        if (save) {
            chrome.storage.local.set({ [this.THEME_KEY]: mode });
        }

        if (!this.host) return;

        if (mode === 'light') {
            this.host.style.setProperty('--ip-bg', '#ffffff', 'important');
            this.host.style.setProperty('--ip-text-main', '#1f2937', 'important');
            this.host.style.setProperty('--ip-text-muted', '#6b7280', 'important');
            this.host.style.setProperty('--ip-border', '#e5e7eb', 'important');
            this.host.style.setProperty('--ip-row-bg', 'rgba(0,0,0,0.05)', 'important');
            this.host.style.setProperty('--ip-accent-bg', '#e0e7ff', 'important');
            this.host.style.setProperty('--ip-accent-text', '#4f46e5', 'important');
        } else {
            this.host.style.setProperty('--ip-bg', '#111827', 'important');
            this.host.style.setProperty('--ip-text-main', '#ffffff', 'important');
            this.host.style.setProperty('--ip-text-muted', '#9ca3af', 'important');
            this.host.style.setProperty('--ip-border', '#374151', 'important');
            this.host.style.setProperty('--ip-row-bg', 'rgba(255,255,255,0.05)', 'important');
            this.host.style.setProperty('--ip-accent-bg', 'rgba(99,102,241,0.2)', 'important');
            this.host.style.setProperty('--ip-accent-text', '#818cf8', 'important');
        }
    }

    toggleTheme(e) {
        e.stopPropagation();
        const newMode = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newMode, true);

        const iconContainer = this.host.querySelector('#ip-rep-theme-toggle');
        if (iconContainer) {
            iconContainer.innerHTML = this.getThemeIcon(newMode);
        }
    }

    getThemeIcon(mode) {
        if (mode === 'dark') {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
        } else {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
        }
    }

    showTrigger(x, y, ip) {
        this.init();
        this.currentIp = ip;

        const trigger = document.getElementById(this.TRIGGER_ID);
        const card = document.getElementById(this.CARD_ID);

        card.style.display = 'none';

        // Reset Card State
        card.style.width = 'auto';
        card.style.height = 'auto';
        card.style.fontSize = '';
        card.style.left = '';
        card.style.top = '';
        delete card.dataset.initialAutoWidth;

        trigger.style.top = `${y + window.scrollY - 45}px`;
        trigger.style.left = `${x + window.scrollX + 5}px`;
        trigger.style.display = 'flex';
    }

    showToast(x, y, message) {
        this.init();

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: absolute;
            top: ${y + window.scrollY - 30}px;
            left: ${x + window.scrollX}px;
            background: rgba(0,0,0,0.8);
            color: #d1d5db;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            pointer-events: none;
            z-index: 9999999999;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s, transform 0.3s;
            white-space: nowrap;
        `;

        this.host.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Fade Out & Remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-5px)';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }, 3000);
    }

    showCard() {
        const trigger = document.getElementById(this.TRIGGER_ID);
        const card = document.getElementById(this.CARD_ID);
        const rect = trigger.getBoundingClientRect();

        trigger.style.display = 'none';

        this.renderCardContent(card);

        // Position
        card.style.left = `${rect.left + window.scrollX}px`;
        card.style.top = `${rect.top + window.scrollY}px`;
        card.style.display = 'block';

        // Apply Logic Dimensions
        card.style.height = 'auto';
        card.style.minHeight = '150px';
        card.style.width = '440px';

        // Capture initial auto width logic
        const autoRect = card.getBoundingClientRect();
        this.initialAutoWidth = autoRect.width;
        card.style.fontSize = '14px';

        // Attach Column Resizers
        this.attachColumnResizers(card);

        // Trigger data fetch
        if (this.onShow) {
            this.onShow(this.currentIp);
        }
    }

    hideUI() {
        const trigger = document.getElementById(this.TRIGGER_ID);
        const card = document.getElementById(this.CARD_ID);
        if (trigger) trigger.style.display = 'none';
        if (card) card.style.display = 'none';
    }

    renderCardContent(card) {
        const closeId = 'ip-rep-close-btn';
        const headerId = 'ip-rep-header';
        const toggleId = 'ip-rep-theme-toggle';

        card.innerHTML = `
            <div id="${headerId}" style="border-bottom: 1px solid var(--ip-border) !important; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; cursor: move; white-space: nowrap;">
                <span style="font-weight: bold; font-size: 1em; color: var(--ip-text-main) !important;">🛡️ IP Check</span>
                <div style="display: flex; align-items: center; gap: 0.5em;">
                    <span style="background: var(--ip-accent-bg) !important; color: var(--ip-accent-text) !important; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.8em;">${this.currentIp}</span>
                    <div>
                        <div id="${toggleId}" data-toggle="theme" style="cursor: pointer; color: var(--ip-text-muted) !important; display: flex; transition: color 0.2s;">
                            ${this.getThemeIcon(this.theme)}
                        </div>
                    </div>
                    <div id="${closeId}" style="cursor: pointer; padding: 0.2em; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ip-text-muted) !important;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em; text-align: left; table-layout: fixed;">
                    <thead style="color: var(--ip-text-muted) !important; border-bottom: 1px solid var(--ip-border) !important;">
                        <tr>
                            <th style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word; position: relative;">Source</th>
                            <th style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word; position: relative;">Score</th>
                            <th style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word; position: relative;">Info</th>
                            <th style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word; position: relative;">Country</th>
                            <th style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word; position: relative;">Domain</th>
                            <th style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word; position: relative;">Date</th>
                        </tr>
                    </thead>
                    <tbody style="color: var(--ip-text-main) !important; white-space: normal;">
                        <!-- AbuseIPDB -->
                        <tr id="row-abuse" style="border-bottom: 1px solid var(--ip-row-bg) !important;">
                            <td style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word;">
                                <span id="btn-open-abuse" style="cursor: pointer; text-decoration: underline; text-decoration-style: dotted;">AbuseIPDB</span>
                            </td>
                            <td id="ip-rep-abuse-score" style="padding: 4px; font-weight: bold; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">Loading...</td>
                            <td id="ip-rep-abuse-reports" style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                            <td id="ip-rep-abuse-country" style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                            <td id="ip-rep-abuse-domain" style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                            <td style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                        </tr>
                        <!-- VirusTotal -->
                        <tr id="row-vt">
                            <td style="padding: 4px; min-width: 50px; max-width: 100px; word-wrap: break-word;">
                                <span id="btn-open-vt" style="cursor: pointer; text-decoration: underline; text-decoration-style: dotted;">VirusTotal</span>
                            </td>
                            <td id="ip-rep-vt-score" style="padding: 4px; font-weight: bold; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">Loading...</td>
                            <td id="ip-rep-vt-info" style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                            <td id="ip-rep-vt-country" style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                            <td id="ip-rep-vt-domain" style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                            <td id="ip-rep-vt-date" style="padding: 4px; color: var(--ip-text-muted) !important; min-width: 50px; max-width: 100px; word-wrap: break-word;">-</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        this.attachResizeHandles(card);

        document.getElementById(closeId).addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideUI();
        });
        const toggleBtn = document.getElementById(toggleId);
        if (toggleBtn) toggleBtn.addEventListener('click', this.toggleTheme);

        const btnAbuse = document.getElementById('btn-open-abuse');
        if (btnAbuse) {
            btnAbuse.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = `https://www.abuseipdb.com/check/${this.currentIp}`;
                chrome.runtime.sendMessage({ type: 'OPEN_IN_BACKGROUND_TAB', url });
            });
        }

        const btnVt = document.getElementById('btn-open-vt');
        if (btnVt) {
            btnVt.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = `https://www.virustotal.com/gui/ip-address/${this.currentIp}`;
                chrome.runtime.sendMessage({ type: 'OPEN_IN_BACKGROUND_TAB', url });
            });
        }

        const header = document.getElementById(headerId);
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest(`#${closeId}`)) return;
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            const cardRect = card.getBoundingClientRect();
            this.initialLeft = cardRect.left + window.scrollX;
            this.initialTop = cardRect.top + window.scrollY;
            e.preventDefault();
        });
    }

    renderRow(source, score, color, id) {
        return `
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; padding: 0.3em; background: var(--ip-row-bg) !important; border-radius: 4px;">
                <span style="color: var(--ip-text-main) !important;">${source}</span>
                <span id="${id}" style="font-weight: 600; color: ${color} !important;">${score}</span>
            </div>
        `;
    }

    updateData(data) {
        if (!data) return;

        // AbuseIPDB Update
        const abuseEl = this.host.querySelector('#ip-rep-abuse-score');
        if (abuseEl && data.abuseIpDb) {
            abuseEl.textContent = data.abuseIpDb.score;
            abuseEl.style.setProperty('color', data.abuseIpDb.color, 'important');

            this.host.querySelector('#ip-rep-abuse-reports').textContent = data.abuseIpDb.reports ? `${data.abuseIpDb.reports} rpts` : '0';
            this.host.querySelector('#ip-rep-abuse-country').textContent = data.abuseIpDb.country || '?';
            this.host.querySelector('#ip-rep-abuse-domain').textContent = data.abuseIpDb.domain || '-';
        }

        // VirusTotal Update
        const vtEl = this.host.querySelector('#ip-rep-vt-score');
        if (vtEl && data.virusTotal) {
            vtEl.textContent = data.virusTotal.score;
            vtEl.style.setProperty('color', data.virusTotal.color, 'important');

            this.host.querySelector('#ip-rep-vt-info').textContent = data.virusTotal.score.includes('/') ? 'Engines' : 'Analysis';
            this.host.querySelector('#ip-rep-vt-country').textContent = data.virusTotal.country || '?';
            this.host.querySelector('#ip-rep-vt-domain').textContent = data.virusTotal.domain || '-';
            this.host.querySelector('#ip-rep-vt-date').textContent = data.virusTotal.date || '?';
        }
    }

    attachResizeHandles(card) {
        // Card Resize Handles
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        dirs.forEach(dir => {
            const el = document.createElement('div');
            // Inline logic
            let style = 'position: absolute; z-index: 100;';
            if (dir === 'n' || dir === 's') style += 'cursor: ns-resize; height: 6px; width: 100%; left: 0;';
            if (dir === 'e' || dir === 'w') style += 'cursor: ew-resize; width: 6px; height: 100%; top: 0;';
            if (['ne', 'sw'].includes(dir)) style += 'cursor: nesw-resize; width: 12px; height: 12px; z-index: 101;';
            if (['nw', 'se'].includes(dir)) style += 'cursor: nwse-resize; width: 12px; height: 12px; z-index: 101;';

            if (dir.includes('n')) style += 'top: -3px;';
            if (dir.includes('s')) style += 'bottom: -3px;';
            if (dir.includes('w')) style += 'left: -3px;';
            if (dir.includes('e')) style += 'right: -3px;';

            el.style.cssText = style;
            el.addEventListener('mousedown', (e) => {
                this.isResizing = true;
                this.resizeDir = dir;
                this.resizeStartX = e.clientX;
                this.resizeStartY = e.clientY;
                const rect = card.getBoundingClientRect();
                this.initialWidth = rect.width;
                this.initialHeight = rect.height;
                this.initialResizeLeft = rect.left + window.scrollX;
                this.initialResizeTop = rect.top + window.scrollY;
                e.stopPropagation(); e.preventDefault();
            });
            card.appendChild(el);
        });
    }

    attachColumnResizers(card) {
        const displayThs = card.querySelectorAll('th');

        displayThs.forEach((th, index) => {
            const resizer = document.createElement('div');
            resizer.style.cssText = `
                position: absolute; 
                right: 0; 
                top: 0; 
                bottom: 0; 
                width: 5px; 
                cursor: col-resize; 
                z-index: 10;
                user-select: none;
            `;

            resizer.addEventListener('mousedown', (e) => {
                this.isColResizing = true;
                this.colResizeTh = th;
                this.colStartX = e.clientX;
                this.colStartWidth = th.offsetWidth;
                e.stopPropagation();
                e.preventDefault();
            });

            th.appendChild(resizer);
        });
    }

    // --- Interaction Implementation ---
    handleGlobalMouseMove(e) {
        const card = document.getElementById(this.CARD_ID);
        if (!card) return;

        if (this.isDragging) {
            e.preventDefault();
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            card.style.left = `${this.initialLeft + dx}px`;
            card.style.top = `${this.initialTop + dy}px`;
        }

        if (this.isResizing) {
            e.preventDefault();
            const dx = e.clientX - this.resizeStartX;
            const dy = e.clientY - this.resizeStartY;
            let newW = this.initialWidth, newH = this.initialHeight;
            let newL = this.initialResizeLeft, newT = this.initialResizeTop;

            if (this.resizeDir.includes('e')) newW += dx;
            if (this.resizeDir.includes('w')) { newW -= dx; newL += dx; }
            if (this.resizeDir.includes('s')) newH += dy;
            if (this.resizeDir.includes('n')) { newH -= dy; newT += dy; }

            if (newW < 250) newW = 250;
            if (newH < 120) newH = 120;
            if (this.resizeDir.includes('w') && newW === 250) newL = this.initialResizeLeft + (this.initialWidth - 250);

            card.style.width = `${newW}px`;
            card.style.height = `${newH}px`;
            card.style.left = `${newL}px`;
            card.style.top = `${newT}px`;

            if (['ne', 'nw', 'se', 'sw'].includes(this.resizeDir)) {
                this.updateScale(newW);
            }
        }

        if (this.isColResizing && this.colResizeTh) {
            e.preventDefault();
            const dx = e.clientX - this.colStartX;
            let newWidth = this.colStartWidth + dx;
            if (newWidth < 20) newWidth = 20;

            this.colResizeTh.style.width = `${newWidth}px`;
            this.colResizeTh.style.maxWidth = 'none';
            this.colResizeTh.style.minWidth = `${newWidth}px`;

            const index = Array.from(this.colResizeTh.parentNode.children).indexOf(this.colResizeTh);

            // Find all rows in tbody
            const tbody = card.querySelector('tbody');
            if (tbody) {
                Array.from(tbody.children).forEach(row => {
                    if (row.children[index]) {
                        row.children[index].style.width = `${newWidth}px`;
                        row.children[index].style.maxWidth = 'none';
                        row.children[index].style.minWidth = `${newWidth}px`;
                    }
                });
            }
        }
    }

    handleGlobalMouseUp(e) {
        if (this.isDragging || this.isResizing || this.isColResizing) {
            this.isDragging = false;
            this.isResizing = false;
            this.isColResizing = false;
            this.colResizeTh = null;
            document.body.style.cursor = 'default';
            e.stopPropagation();
            return;
        }
    }

    updateScale(currentWidth) {
        const card = document.getElementById(this.CARD_ID);
        if (!card) return;
        const ratio = currentWidth / (this.initialAutoWidth || 350);
        const newFontSize = Math.max(12, Math.min(24, 14 * ratio));
        card.style.fontSize = `${newFontSize}px`;
    }

    isActive() {
        return this.isDragging || this.isResizing || (document.getElementById(this.CARD_ID) && document.getElementById(this.CARD_ID).style.display === 'block');
    }
}
