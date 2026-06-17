document.addEventListener('DOMContentLoaded', () => {
    // App State
    let state = {
        updates: [],
        filteredUpdates: [],
        selectedUpdate: null,
        activeFilter: 'all',
        searchQuery: '',
        selectedHashtags: new Set(['#BigQuery', '#GoogleCloud']),
        theme: 'dark'
    };

    // DOM Elements
    const elements = {
        // Feed & Headers
        releasesFeed: document.getElementById('releases-feed'),
        feedLoading: document.getElementById('feed-loading'),
        feedError: document.getElementById('feed-error'),
        feedEmpty: document.getElementById('feed-empty'),
        refreshBtn: document.getElementById('refresh-btn'),
        retryBtn: document.getElementById('retry-btn'),
        clearSearchBtn: document.getElementById('clear-search-btn'),
        searchInput: document.getElementById('search-input'),
        cacheStatusText: document.getElementById('cache-status-text'),
        
        // Navigation & Filters
        filterBtns: document.querySelectorAll('.filter-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        themeText: document.getElementById('theme-text'),
        
        // Stats
        statTotalUpdates: document.getElementById('stat-total-updates'),
        statFeatures: document.getElementById('stat-features'),
        statAnnouncements: document.getElementById('stat-announcements'),
        statIssues: document.getElementById('stat-issues'),
        badgeAll: document.getElementById('badge-all'),
        badgeFeatures: document.getElementById('badge-features'),
        badgeAnnouncements: document.getElementById('badge-announcements'),
        badgeIssues: document.getElementById('badge-issues'),
        badgeDeprecations: document.getElementById('badge-deprecations'),
        
        // Composer
        composerEmptyState: document.getElementById('composer-empty-state'),
        composerActiveState: document.getElementById('composer-active-state'),
        composerNoteTag: document.getElementById('composer-note-tag'),
        composerNoteDate: document.getElementById('composer-note-date'),
        composerNoteText: document.getElementById('composer-note-text'),
        composerOriginalLink: document.getElementById('composer-original-link'),
        tweetTextarea: document.getElementById('tweet-textarea'),
        tweetBtn: document.getElementById('tweet-btn'),
        deselectBtn: document.getElementById('deselect-btn'),
        charCount: document.getElementById('char-count'),
        charProgressCircle: document.getElementById('char-progress-circle'),
        hashtagsList: document.getElementById('hashtags-list'),
        copyTextBtn: document.getElementById('copy-text-btn'),
        
        // Toast
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message')
    };

    // Suggested hashtags catalog
    const AVAILABLE_HASHTAGS = [
        '#BigQuery', '#GoogleCloud', '#GCP', '#DataWarehouse', 
        '#GenerativeAI', '#Gemini', '#FinOps', '#CloudSecurity', 
        '#DataAnalytics', '#Serverless'
    ];

    // Initialize UI
    initTheme();
    fetchReleases();
    setupEventListeners();

    // --- THEME MANAGEMENT ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        state.theme = theme;
        if (theme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            elements.themeText.textContent = 'Dark Theme';
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            elements.themeText.textContent = 'Light Theme';
        }
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        setTheme(state.theme === 'dark' ? 'light' : 'dark');
    }

    // --- DATA FETCHING ---
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        
        const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Unknown API failure');
            
            state.updates = data.updates;
            updateCacheStatus(data.from_cache);
            
            // Re-render
            updateStats();
            filterAndRender();
            
            // If the previously selected item is still in updates, keep selection. Else clear.
            if (state.selectedUpdate) {
                const stillExists = state.updates.find(u => u.id === state.selectedUpdate.id);
                if (stillExists) {
                    selectUpdate(stillExists);
                } else {
                    clearSelection();
                }
            }
            
            setLoadingState(false);
            lucide.replace(); // Refresh icons
            
        } catch (error) {
            console.error('Error fetching release notes:', error);
            document.getElementById('error-message').textContent = error.message;
            setLoadingState(false, true);
        }
    }

    function updateCacheStatus(fromCache) {
        if (fromCache) {
            const now = new Date();
            elements.cacheStatusText.textContent = `Cached (Refreshed: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
        } else {
            elements.cacheStatusText.textContent = 'Fresh Feed Loaded';
            showToast('Latest notes pulled fresh!');
        }
    }

    function setLoadingState(isLoading, isError = false) {
        // Hide all states by default
        elements.feedLoading.classList.add('hidden');
        elements.feedError.classList.add('hidden');
        elements.feedEmpty.classList.add('hidden');
        elements.releasesFeed.classList.add('hidden');
        
        // Rotate spinner button if loading
        const refreshIcon = elements.refreshBtn.querySelector('.refresh-icon');
        if (isLoading) {
            elements.feedLoading.classList.remove('hidden');
            refreshIcon.classList.add('spinning');
            elements.refreshBtn.disabled = true;
        } else {
            refreshIcon.classList.remove('spinning');
            elements.refreshBtn.disabled = false;
            
            if (isError) {
                elements.feedError.classList.remove('hidden');
            } else if (state.filteredUpdates.length === 0) {
                elements.feedEmpty.classList.remove('hidden');
            } else {
                elements.releasesFeed.classList.remove('hidden');
            }
        }
    }

    // --- STATISTICS AND COUNTS ---
    function updateStats() {
        const counts = {
            total: state.updates.length,
            feature: 0,
            announcement: 0,
            issue: 0,
            deprecation: 0
        };

        state.updates.forEach(up => {
            const typeLower = up.type.toLowerCase();
            if (typeLower.includes('feature')) counts.feature++;
            else if (typeLower.includes('announc')) counts.announcement++;
            else if (typeLower.includes('issue')) counts.issue++;
            else if (typeLower.includes('deprecat')) counts.deprecation++;
        });

        // Set left values
        elements.statTotalUpdates.textContent = counts.total;
        elements.statFeatures.textContent = counts.feature;
        elements.statAnnouncements.textContent = counts.announcement;
        elements.statIssues.textContent = counts.issue;

        // Set badges
        elements.badgeAll.textContent = counts.total;
        elements.badgeFeatures.textContent = counts.feature;
        elements.badgeAnnouncements.textContent = counts.announcement;
        elements.badgeIssues.textContent = counts.issue;
        elements.badgeDeprecations.textContent = counts.deprecation;
    }

    // --- FILTER AND SEARCH LOGIC ---
    function filterAndRender() {
        const query = state.searchQuery.toLowerCase().trim();
        const activeFilter = state.activeFilter;

        state.filteredUpdates = state.updates.filter(up => {
            // Category filter
            if (activeFilter !== 'all') {
                const typeLower = up.type.toLowerCase();
                if (activeFilter === 'feature' && !typeLower.includes('feature')) return false;
                if (activeFilter === 'announcement' && !typeLower.includes('announc')) return false;
                if (activeFilter === 'issue' && !typeLower.includes('issue')) return false;
                if (activeFilter === 'deprecation' && !typeLower.includes('deprecat')) return false;
            }

            // Keyword filter
            if (query !== '') {
                const contentTextLower = up.content_text.toLowerCase();
                const typeLower = up.type.toLowerCase();
                const dateLower = up.date.toLowerCase();
                
                return contentTextLower.includes(query) || 
                       typeLower.includes(query) || 
                       dateLower.includes(query);
            }

            return true;
        });

        renderFeed();
    }

    function renderFeed() {
        elements.releasesFeed.innerHTML = '';
        
        if (state.filteredUpdates.length === 0) {
            setLoadingState(false);
            return;
        }

        state.filteredUpdates.forEach(up => {
            const card = document.createElement('div');
            card.className = `release-card ${state.selectedUpdate && state.selectedUpdate.id === up.id ? 'selected' : ''}`;
            card.dataset.id = up.id;
            
            // Format dynamic badge type class
            let badgeClass = 'update';
            const typeLower = up.type.toLowerCase();
            if (typeLower.includes('feature')) badgeClass = 'feature';
            else if (typeLower.includes('announc')) badgeClass = 'announcement';
            else if (typeLower.includes('issue')) badgeClass = 'issue';
            else if (typeLower.includes('deprecat')) badgeClass = 'deprecation';

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="tag-badge ${badgeClass}">${up.type}</span>
                        <span class="card-date">${up.date}</span>
                    </div>
                    <div class="select-indicator">
                        <i data-lucide="check"></i>
                    </div>
                </div>
                <div class="card-content">
                    ${up.content_html}
                </div>
                <div class="card-footer">
                    <button class="btn-card-action btn-card-tweet" data-action="tweet">
                        <i data-lucide="twitter"></i>
                        <span>Curate Tweet</span>
                    </button>
                    <a href="${up.link}" target="_blank" class="btn-card-action" data-action="link">
                        <i data-lucide="external-link"></i>
                        <span>View Source</span>
                    </a>
                </div>
            `;

            // Card click listener
            card.addEventListener('click', (e) => {
                // Ignore click if user clicked a link
                if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('a')) {
                    return;
                }
                
                const actionBtn = e.target.closest('.btn-card-action');
                if (actionBtn && actionBtn.dataset.action === 'tweet') {
                    // Force Composer Focus
                    selectUpdate(up);
                    focusComposer();
                } else if (actionBtn && actionBtn.dataset.action === 'link') {
                    // Let link open in new window
                } else {
                    // Standard selection
                    if (state.selectedUpdate && state.selectedUpdate.id === up.id) {
                        clearSelection();
                    } else {
                        selectUpdate(up);
                    }
                }
            });

            elements.releasesFeed.appendChild(card);
        });

        setLoadingState(false);
        lucide.replace();
    }

    // --- COMPOSER & TWEET LOGIC ---
    function selectUpdate(update) {
        state.selectedUpdate = update;
        
        // Visually highlight active card
        document.querySelectorAll('.release-card').forEach(card => {
            if (card.dataset.id === update.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Switch sidebar visibility
        elements.composerEmptyState.classList.add('hidden');
        elements.composerActiveState.classList.remove('hidden');

        // Setup details
        let badgeClass = 'update';
        const typeLower = update.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'feature';
        else if (typeLower.includes('announc')) badgeClass = 'announcement';
        else if (typeLower.includes('issue')) badgeClass = 'issue';
        else if (typeLower.includes('deprecat')) badgeClass = 'deprecation';

        elements.composerNoteTag.className = `preview-tag ${badgeClass}`;
        elements.composerNoteTag.textContent = update.type;
        elements.composerNoteDate.textContent = update.date;
        elements.composerNoteText.textContent = update.content_text;
        elements.composerOriginalLink.href = update.link;

        // Auto-select smart hashtags based on content keywords
        autoSelectHashtags(update.content_text);

        // Render suggested hashtags list
        renderHashtagsList();

        // Populate and calculate tweet text
        generateAndSetTweet();
        
        lucide.replace();
    }

    function clearSelection() {
        state.selectedUpdate = null;
        document.querySelectorAll('.release-card').forEach(card => card.classList.remove('selected'));
        
        elements.composerActiveState.classList.add('hidden');
        elements.composerEmptyState.classList.remove('hidden');
    }

    function focusComposer() {
        setTimeout(() => {
            elements.tweetTextarea.focus();
            // Scroll right sidebar to top if on mobile/scroll layout
            elements.composerActiveState.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    function autoSelectHashtags(text) {
        state.selectedHashtags.clear();
        state.selectedHashtags.add('#BigQuery');
        state.selectedHashtags.add('#GoogleCloud');
        
        const textLower = text.toLowerCase();
        
        // Auto-suggest tags based on contents
        if (textLower.includes('gemini') || textLower.includes('assist') || textLower.includes('generative') || textLower.includes('ai.')) {
            state.selectedHashtags.add('#GenerativeAI');
            state.selectedHashtags.add('#Gemini');
        }
        if (textLower.includes('quota') || textLower.includes('billing') || textLower.includes('cost') || textLower.includes('optimize') || textLower.includes('capacity')) {
            state.selectedHashtags.add('#FinOps');
        }
        if (textLower.includes('security') || textLower.includes('key') || textLower.includes('encrypt') || textLower.includes('kms') || textLower.includes('iam')) {
            state.selectedHashtags.add('#CloudSecurity');
        }
        if (textLower.includes('performance') || textLower.includes('partition') || textLower.includes('index') || textLower.includes('speed')) {
            state.selectedHashtags.add('#DataAnalytics');
        }
        if (textLower.includes('function') || textLower.includes('remote') || textLower.includes('spark')) {
            state.selectedHashtags.add('#Serverless');
        }
    }

    function renderHashtagsList() {
        elements.hashtagsList.innerHTML = '';
        AVAILABLE_HASHTAGS.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `hashtag-chip ${state.selectedHashtags.has(tag) ? 'selected' : ''}`;
            btn.textContent = tag;
            
            btn.addEventListener('click', () => {
                if (state.selectedHashtags.has(tag)) {
                    state.selectedHashtags.delete(tag);
                    btn.classList.remove('selected');
                } else {
                    state.selectedHashtags.add(tag);
                    btn.classList.add('selected');
                }
                generateAndSetTweet();
            });
            
            elements.hashtagsList.appendChild(btn);
        });
    }

    // Formulates a tweet string dynamically, respecting character budget limits
    function generateAndSetTweet() {
        if (!state.selectedUpdate) return;

        const update = state.selectedUpdate;
        const type = update.type;
        const date = update.date;
        const link = update.link;

        // Header: BigQuery Feature (June 15, 2026):
        const header = `BigQuery ${type} (${date}):\n`;
        
        // Hashtags portion
        const tagsArray = Array.from(state.selectedHashtags);
        const tagsStr = tagsArray.length > 0 ? `\n\n${tagsArray.join(' ')}` : '';
        
        // Twitter link length (X URL Wrapper counts any link as exactly 23 chars)
        const linkChars = 23;
        
        // Compute current limits
        // Twitter Limit = 280
        // Total budget for description = 280 - header length - tags length - link length - spacing/newlines
        const spacesAndNewlines = 4; // structural padding spacing
        const textBudget = 280 - header.length - tagsStr.length - linkChars - spacesAndNewlines;
        
        // Safely extract truncated text
        let description = update.content_text;
        if (description.length > textBudget) {
            description = description.substring(0, textBudget - 3) + '...';
        }

        // Draft text
        const draftText = `${header}\n${description}\n\n${link}${tagsStr}`;
        elements.tweetTextarea.value = draftText;
        
        updateCharCount(draftText);
    }

    // Twitter-compliant character counter
    function getTwitterCharCount(text) {
        // Regex to match URLs
        const urlRegex = /https?:\/\/[^\s]+/gi;
        let length = text.length;
        let match;
        let urlsLength = 0;
        let urlsCount = 0;

        urlRegex.lastIndex = 0;
        while ((match = urlRegex.exec(text)) !== null) {
            urlsLength += match[0].length;
            urlsCount++;
        }

        // Remove real URL char length, add 23 per URL
        return length - urlsLength + (urlsCount * 23);
    }

    function updateCharCount(text) {
        const count = getTwitterCharCount(text);
        const remaining = 280 - count;
        
        elements.charCount.textContent = remaining;
        
        // Update styling depending on limit
        if (remaining < 0) {
            elements.charCount.className = 'char-count-text error';
            elements.tweetBtn.disabled = true;
        } else if (remaining <= 20) {
            elements.charCount.className = 'char-count-text warning';
            elements.tweetBtn.disabled = false;
        } else {
            elements.charCount.className = 'char-count-text';
            elements.tweetBtn.disabled = false;
        }

        // Progress Circle Ring Math
        const circleRadius = 14;
        const circumference = 2 * Math.PI * circleRadius;
        
        // Clamp percentage [0, 1]
        const percentage = Math.min(Math.max(count / 280, 0), 1);
        const strokeDashoffset = circumference - (percentage * circumference);
        
        elements.charProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        elements.charProgressCircle.style.strokeDashoffset = strokeDashoffset;
        
        // Color transition for ring
        if (remaining < 0) {
            elements.charProgressCircle.style.stroke = 'var(--color-issue)';
        } else if (remaining <= 20) {
            elements.charProgressCircle.style.stroke = 'var(--color-deprecation)';
        } else {
            elements.charProgressCircle.style.stroke = 'var(--tweet-brand)';
        }
    }

    // --- TOAST NOTIFICATIONS ---
    function showToast(message) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.remove('hidden');
        
        // Bounce animation
        setTimeout(() => {
            elements.toast.classList.add('hidden');
        }, 3000);
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Refresh & Retry
        elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
        elements.retryBtn.addEventListener('click', () => fetchReleases(true));
        
        // Clear search
        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            state.searchQuery = '';
            filterAndRender();
        });

        // Search inputs
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            filterAndRender();
        });

        // Filter selection
        elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                state.activeFilter = btn.dataset.filter;
                filterAndRender();
            });
        });

        // Theme Switcher
        elements.themeToggle.addEventListener('click', toggleTheme);

        // Deselect Composer
        elements.deselectBtn.addEventListener('click', clearSelection);

        // Textarea changes
        elements.tweetTextarea.addEventListener('input', (e) => {
            updateCharCount(e.target.value);
        });

        // Tweet dispatch
        elements.tweetBtn.addEventListener('click', () => {
            const tweetText = elements.tweetTextarea.value;
            const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
            showToast('Opening X / Twitter share composer!');
        });

        // Copy Tweet Text
        elements.copyTextBtn.addEventListener('click', () => {
            const tweetText = elements.tweetTextarea.value;
            navigator.clipboard.writeText(tweetText)
                .then(() => showToast('Tweet draft copied to clipboard!'))
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showToast('Failed to copy to clipboard.');
                });
        });
    }
});
