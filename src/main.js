/**
 * IP Check - Main Content Script
 */
import { getIpType } from './utils/validator.js';
import { ReputationCard } from './ui/card.js';

const cardUI = new ReputationCard();

// Initialize on load (if body exists)
if (document.body) {
    cardUI.init();
} else {
    document.addEventListener('DOMContentLoaded', () => cardUI.init());
}

document.addEventListener('mouseup', (e) => {
    // Check if the click itself was inside our UI host
    if (e.target.closest(`#${cardUI.HOST_ID}`)) return;

    // Let's rely on standard selection
    const sel = window.getSelection();
    const text = sel.toString().trim();

    if (text) {
        const result = getIpType(text);
        if (result.valid) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            if (result.type === 'public') {
                cardUI.showTrigger(rect.right, rect.top, text);
                cardUI.onShow = (ip) => {
                    // Check if extension context is valid
                    if (!chrome.runtime?.id) {
                        const rect = window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0).getBoundingClientRect() : { top: 0, right: 0 };
                        cardUI.showToast(rect.right || 100, rect.top || 100, 'Please reload page');
                        return;
                    }

                    try {
                        // Use long-lived connection for streaming updates
                        const port = chrome.runtime.connect({ name: 'reputation-stream' });

                        // Handle incoming streaming messages
                        port.onMessage.addListener((msg) => {
                            if (msg.type === 'partial_result' && msg.provider && msg.data) {
                                cardUI.updateData({ [msg.provider]: msg.data });
                            }
                        });

                        // Send start request
                        port.postMessage({ ip });

                        // Handle disconnect (optional cleanup)
                        port.onDisconnect.addListener(() => {
                            if (chrome.runtime.lastError) {
                                const rect = window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0).getBoundingClientRect() : { top: 0, right: 0 };
                                cardUI.showToast(rect.right || 100, rect.top || 100, 'Extension error');
                            }
                        });

                    } catch (e) {
                        // Synchronous errors
                        const rect = window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0).getBoundingClientRect() : { top: 0, right: 0 };
                        cardUI.showToast(rect.right || 100, rect.top || 100, 'Extension error');
                    }
                };

            } else if (result.type === 'private') {
                // Show specific category (e.g. "Private IP", "Loopback Address", etc.)
                cardUI.showToast(rect.right, rect.top, result.category || 'Private Address');
            }
        }
    }
});
