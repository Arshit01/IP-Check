# 🛡️ IP Check - Instant IP Reputation Checker

**IP Check** is a powerful Chrome Extension that allows you to instantly check the reputation of any IP address you encounter on the web. It queries **AbuseIPDB** and **VirusTotal** in real-time to check if an IP is malicious, all without leaving your current tab.

> **Note**: This extension operates by "scraping" the public pages of data providers using your browser's context. **No API keys are required!**

![IP Check Card](https://i.postimg.cc/NFqNvvmx/IPCheck_card.jpg)

## ✨ Features

- **Instant Analysis**: Select any IP address text on a webpage to analyze it.
- **Dual-Source Verification**: checks both **AbuseIPDB** and **VirusTotal**.
- **Non-Intrusive UI**: A small floating card shows the results.
- **Draggable & Resizable**: Move the card anywhere or resize it to fit your view.
- **Resizable Columns**: Adjust result columns to your preferred width.
- **Dark/Light Mode**: Matches your system preference or can be toggled manually.
- **No API Keys Needed**: Uses your browser's own connection to fetch data.

## 🚀 How to Download

1.  Go to the **[Releases](https://github.com/Arshit01/IP-Check/releases)** page of this repository.
2.  Download the latest Source Code zip file (e.g., `Source code (zip)`).
3.  Unzip the file to a folder on your computer (e.g., `C:\Users\<YourUsername>\Documents\IP-Check`).

## 🛠️ How to Install

Since this is a developer extension, you need to load it manually into Chrome/Edge:

1.  Open Chrome or Edge.
2.  Navigate to `chrome://extensions/` (or `edge://extensions/`).
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder where you unzipped the source code (the folder containing `manifest.json`).

## 💡 How to Use

1.  **Select an IP Address**: Highlight any IPv4 address on any webpage (e.g., `8.8.8.8`).
2.  **Click the Trigger**: A small shield icon 🛡️ will appear near your selection.
3.  **View Results**: Click the icon to open the reputation card.
    -   **Score**: Shows the abuse confidence score (AbuseIPDB) or detection ratio (VirusTotal).
    -   **Color Coding**:
        -   🟢 **Green**: Safe / Low confidence.
        -   🟡 **Yellow**: Suspicious.
        -   🔴 **Red**: High abuse confidence / Malicious.

![IP Check Popup](https://i.postimg.cc/tC6xVH3g/IPCheck_popup.png)
![IP Check Card](https://i.postimg.cc/NFqNvvmx/IPCheck_card.jpg)

## 🤖 Solving Captchas (AbuseIPDB)

Because this extension uses your browser to fetch data, **AbuseIPDB** may sometimes challenge you with a Captcha (Cloudflare "Verify you are human") to ensure you are not a bot.

**If you see "Captcha?" or "Timeout" in the score column:**

1.  Click the **"AbuseIPDB"** link text in the Source column of the card.
    -   *This will open AbuseIPDB in a new background tab.*
2.  Go to that new tab.
3.  **Solve the Cloudflare Captcha** manually ("Verify you are human").
4.  Once you reach the result page, **close the tab**.
5.  Go back to your original page and try checking the IP again. It should now work!

> **First Time Use**: It is highly recommended to open [AbuseIPDB](https://www.abuseipdb.com/) and [VirusTotal](https://www.virustotal.com/) in a new tab to solve and get `cf_clearance` cookies for any captchas before using the extension extensively.

## 🔒 Privacy

This extension does **not** collect any user data. It only sends the IP address you selected to:
-   `abuseipdb.com`
-   `virustotal.com`

These requests are made directly from your browser, just as if you visited the sites yourself.

## 📄 License

This project is licensed under the [AGPL-3.0 License](LICENSE).
