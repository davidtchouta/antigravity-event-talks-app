# BigQuery Release Notes Curator & Tweet Composer

A premium, interactive web application built with Python Flask and vanilla HTML5, CSS3, and JavaScript. It fetches, parses, and formats the Google BigQuery Release Notes XML feed, allowing developers and dev advocates to search, filter, and easily draft tweets about specific updates.

---

## 🌟 Key Features

* 🗂️ **Granular Release Splitting**: Scrapes the composite daily Atom feed and breaks it down into individual, type-tagged release updates (Features, Announcements, Issues, Deprecations).
* ⚡ **Double-Layer Caching**: Limits outbound API requests to Google Cloud via a local cache file (`feed_cache.xml`) with a 10-minute validity, plus offline fail-safes.
* 🔎 **Real-time Filter & Search**: Search through release notes using custom search criteria, or filter by category (All, Features, Announcements, Issues, Deprecations).
* 🎨 **Premium Glassmorphic UI**: High-fidelity theme system supporting dark mode and light mode, micro-animations, loading indicators, and skeleton elements.
* 🐦 **Interactive Tweet Composer**: Selecting a release card opens a slide-out panel that pre-fills a formatted tweet draft, complete with URL anchors.
* 🏷️ **Smart Hashtags**: Scans release texts for technical keywords and auto-selects appropriate tags (e.g., `#GenerativeAI`, `#Gemini`, `#FinOps`, `#CloudSecurity`).
* 📏 **Twitter-Compliant Character Validation**: Tracks tweet character usage in real time, treating links as exactly 23 characters (matching X/Twitter's native `t.co` shortener logic), utilizing a circular progress ring.
* 🔗 **Social Curation**: One-click button to share directly on X/Twitter via Web Intent, or copy the curated draft to your clipboard.

---

## 🛠️ Technology Stack

* **Server (Backend)**: Python, Flask, requests, BeautifulSoup4 (lxml parser).
* **Client (Frontend)**: Vanilla HTML5, CSS3 (CSS Variables for dynamic theming), JavaScript (ES6+ State Control).
* **Iconography**: Lucide Icons CDN.
* **Typography**: Outfit & Plus Jakarta Sans via Google Fonts.

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                  # Flask application (scrapes, caches, and parses feed)
├── requirements.txt        # Python package dependencies
├── .gitignore              # Files to exclude from Git
├── README.md               # Project documentation (this file)
├── templates/
│   └── index.html          # Web application structure
└── static/
    ├── css/
    │   └── styles.css      # Custom styling, variables, transitions & animations
    └── js/
        └── app.js          # Client state control, filter logic, and tweet builder
```

---

## 🚀 Installation & Setup

### 1. Prerequisites
Ensure you have **Python 3.8+** and `pip` installed.

### 2. Install Dependencies
Clone this repository to your local machine, open your terminal in the project directory, and run:
```bash
pip install -r requirements.txt
```

### 3. Run the Development Server
Execute the Flask entrypoint:
```bash
python app.py
```

### 4. Open in your Browser
Navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔄 How the Curation Flow Works

1. **Scraping**: On loading, the client triggers a fetch to `/api/releases`. The Flask server queries Google Cloud's RSS feed (or loads from its local 10-minute cache) and parses the XML.
2. **Granulation**: BeautifulSoup extracts headings (`<h3>`) and separates a single day's updates into separate database-like rows.
3. **Curation**: Click on any card in the feed. The UI updates to highlight your card and shows the active Twitter Composer.
4. **Hashtag Recommendation**: The app scans the update text. If it mentions "Gemini", it automatically checks and appends `#GenerativeAI` and `#Gemini`.
5. **Char Checking**: As you type or toggle hashtags, the SVG circle updates its progress stroke. If you exceed 280 characters (with link wrapped to 23), the circle turns red and disables the post button.
6. **Publishing**: Click "Post on X / Twitter" to launch the draft directly into Twitter's composer box.