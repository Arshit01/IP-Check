(async () => {
    try {
        const src = chrome.runtime.getURL('src/main.js');
        await import(src);
    } catch (err) {
        console.error('IP-REP: Failed to load main module', err);
    }
})();
