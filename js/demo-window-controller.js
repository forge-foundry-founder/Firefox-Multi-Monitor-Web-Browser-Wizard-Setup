/**
 * Demo Window Controller
 * Manages the "fake" browser window behavior
 *
 * Each browser would need to deal with this in their own way, this should be more than enough to get them going
 */

// Bookmark Manager
const BookmarkManager = {
    async importFromFile() {
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const text = await file.text();
                const bookmarksData = JSON.parse(text);
                
                this.parseAndAddBookmarks(bookmarksData);
                FirefoxNavigation.updateStatus('Bookmarks imported successfully!');
            };
            
            input.click();
        } catch (err) {
            console.error('Error importing bookmarks:', err);
            alert('Error importing bookmarks. Please export bookmarks from Firefox as JSON.');
        }
    },
    
    parseAndAddBookmarks(data) {
        // Firefox bookmark JSON structure has a root object
		// Firefox uses html files not JSON this is a demo, no idea what every browser uses
        const bookmarks = [];
        
        // Recursive function to extract bookmarks
        const extractBookmarks = (node) => {
            if (node.type === 'text/x-moz-place' && node.uri) {
                // This is a bookmark
                bookmarks.push({
                    title: node.title || 'Untitled',
                    url: node.uri
                });
            }
            
            // Check children
            if (node.children) {
                node.children.forEach(child => extractBookmarks(child));
            }
        };
        
        extractBookmarks(data);
        
        // Limit to first 20 bookmarks (toolbar space)
        const topBookmarks = bookmarks.slice(0, 20);
        
        // Save to localStorage
        localStorage.setItem('imported-bookmarks', JSON.stringify(topBookmarks));
        
        // Display them
        this.displayBookmarks(topBookmarks);
    },
    
    displayBookmarks(bookmarks) {
        const bookmarksBar = document.getElementById('bookmarks-bar');
        
        // Clear existing bookmarks (except import button)
        const importBtn = bookmarksBar.querySelector('.bookmark-import-btn');
        bookmarksBar.innerHTML = '';
        bookmarksBar.appendChild(importBtn);
        
        // Add default internal bookmarks
        const defaults = [
            { title: '🏠 Home', url: '?page=home' },
            { title: '📊 Dashboard', url: '?page=dashboard' },
            { title: '📈 Charts', url: '?page=charts' },
            { title: '⚙️ Settings', url: '?page=settings' }
        ];
        
        defaults.forEach(bm => {
            const btn = document.createElement('button');
            btn.className = 'bookmark';
            btn.textContent = bm.title;
            btn.onclick = () => FirefoxNavigation.navigate(bm.url);
            bookmarksBar.appendChild(btn);
        });
        
        // Add separator
        const sep = document.createElement('span');
        sep.textContent = '|';
        sep.style.opacity = '0.3';
        sep.style.margin = '0 4px';
        bookmarksBar.appendChild(sep);
        
        // Add imported bookmarks
        bookmarks.forEach(bm => {
            const btn = document.createElement('button');
            btn.className = 'bookmark';
            btn.textContent = bm.title;
            btn.title = bm.url;
            btn.onclick = () => FirefoxNavigation.navigate(bm.url);
            bookmarksBar.appendChild(btn);
        });
    },
    
    loadSavedBookmarks() {
        const saved = localStorage.getItem('imported-bookmarks');
        if (saved) {
            const bookmarks = JSON.parse(saved);
            this.displayBookmarks(bookmarks);
        }
    }
};

// Firefox Navigation System
const FirefoxNavigation = {
    history: [],
    currentIndex: -1,
    monitorName: null,
    monitorColor: null,
    
    init() {
        const params = new URLSearchParams(window.location.search);
        this.monitorName = params.get('target') || 'Demo Monitor';
        
        // Load config
        if (typeof ConfigManager !== 'undefined') {
            const config = ConfigManager.load();
            if (config && config.tags && config.tags[this.monitorName]) {
                const monitor = config.tags[this.monitorName];
                if (monitor.color) {
                    this.monitorColor = monitor.color;
                    document.documentElement.style.setProperty('--monitor-color', this.monitorColor);
                }
            }
        }
        
        // Initialize with current URL
        const initialUrl = window.location.href;
        this.history.push(initialUrl);
        this.currentIndex = 0;
        
        this.updateUI();
        this.loadCurrentPage();
    },
    
    navigate(url) {
        // Clean up the URL input
        url = url.trim();
        
        // If empty, do nothing
        if (!url) return;
        
        // Handle different URL formats
        let targetUrl = url;
        
        if (url.includes(window.location.origin)) {
            const urlObj = new URL(url);
            targetUrl = urlObj.search || '?page=home';
        } 
        else if (url.includes('demo-window.html')) {
            const parts = url.split('?');
            targetUrl = parts.length > 1 ? '?' + parts[1] : '?page=home';
        }
        else if (!url.startsWith('?') && !url.startsWith('http')) {
            targetUrl = '?page=' + url;
        }
        else if (url.startsWith('?')) {
            targetUrl = url;
        }
        else if (url.startsWith('http')) {
            window.location.href = url;
            this.updateStatus('Navigating to external URL...');
            return;
        }
        
        // Add to history
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Keep target parameter
        const params = new URLSearchParams(window.location.search);
        const target = params.get('target');
        
        // Parse new URL params
        const newParams = new URLSearchParams(targetUrl.includes('?') ? targetUrl.split('?')[1] : '');
        if (target) {
            newParams.set('target', target);
        }
        
        const newUrl = window.location.pathname + '?' + newParams.toString();
        this.history.push(newUrl);
        this.currentIndex++;
        
        // Update browser history
        window.history.pushState({index: this.currentIndex}, '', newUrl);
        
        this.updateUI();
        this.loadCurrentPage();
        this.updateStatus('Navigated to ' + this.getCurrentPage());
    },
    
    goBack() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const url = this.history[this.currentIndex];
            window.history.pushState({index: this.currentIndex}, '', url);
            this.updateUI();
            this.loadCurrentPage();
            this.updateStatus('Back');
        }
    },
    
    goForward() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            const url = this.history[this.currentIndex];
            window.history.pushState({index: this.currentIndex}, '', url);
            this.updateUI();
            this.loadCurrentPage();
            this.updateStatus('Forward');
        }
    },
    
    reload() {
        this.loadCurrentPage();
        this.updateStatus('Reloaded');
    },
    
    getCurrentPage() {
        const params = new URLSearchParams(window.location.search);
        return params.get('page') || 'home';
    },
    
    updateUI() {
        // Update tab title
        const pageName = this.getCurrentPage();
        document.getElementById('tab-title').textContent = 
            this.monitorName + ' - ' + this.capitalizeFirst(pageName);
        
        // Update URL bar
        document.getElementById('url-input').value = window.location.href;
        
        // Update back/forward buttons
        document.getElementById('back-btn').disabled = this.currentIndex <= 0;
        document.getElementById('forward-btn').disabled = this.currentIndex >= this.history.length - 1;
        
        // Update position info
        const x = window.screenX || window.screenLeft || 0;
        const y = window.screenY || window.screenTop || 0;
        document.getElementById('position-info').textContent = `Screen: X: ${x}, Y: ${y}`;
        
        // Update page title
        document.title = `${this.capitalizeFirst(pageName)} - ${this.monitorName}`;
    },
    
    loadCurrentPage() {
        const page = this.getCurrentPage();
        const contentArea = document.getElementById('content-area');
        
        // Page content templates
        const pages = {
            home: this.renderHomePage(),
            dashboard: this.renderDashboardPage(),
            charts: this.renderChartsPage(),
            settings: this.renderSettingsPage()
        };
        
        contentArea.innerHTML = pages[page] || pages.home;
    },
                
    renderHomePage() {
        return `
            <div class="display-info">
                <h2>${this.monitorName}</h2>
                <div class="tech-details">
                    <div>✓ Positioned with window.open()</div>
                    <div>✓ Custom browser firefox (Gibson technique)</div>
                    <div>✓ Fully functional navigation</div>
                    <div style="margin-top: 1rem;">
                        <strong>Try the navigation:</strong><br>
                        Click bookmarks or use back/forward buttons
                    </div>
                    <div style="margin-top: 0.5rem; opacity: 0.7;">
                        Color: ${this.monitorColor || '#4ECDC4'}
                    </div>
                </div>
            </div>
        `;
    },
    
    renderDashboardPage() {
        return `
            <div class="display-info">
                <h2>📊 Dashboard</h2>
                <div class="tech-details">
                    <div style="margin: 1rem 0;">
                        <strong>Monitor Status:</strong>
                    </div>
                    <div>Name: ${this.monitorName}</div>
                    <div>Position: X: ${window.screenX}, Y: ${window.screenY}</div>
                    <div>Size: ${window.innerWidth}x${window.innerHeight}</div>
                    <div>Color: ${this.monitorColor || '#4ECDC4'}</div>
                    <div style="margin-top: 1rem;">
                        <button class="nav-btn" onclick="FirefoxNavigation.navigate('?page=charts')" 
                                style="margin: 5px;">Go to Charts →</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderChartsPage() {
        return `
            <div class="display-info">
                <h2>📈 Charts</h2>
                <div class="tech-details">
                    <div style="margin: 1rem 0;">
                        <strong>Sample Chart Data:</strong>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <div style="height: 100px; display: flex; align-items: flex-end; gap: 10px;">
                            <div style="width: 40px; background: #4a9eff; height: 60%;"></div>
                            <div style="width: 40px; background: #4a9eff; height: 80%;"></div>
                            <div style="width: 40px; background: #4a9eff; height: 45%;"></div>
                            <div style="width: 40px; background: #4a9eff; height: 90%;"></div>
                            <div style="width: 40px; background: #4a9eff; height: 70%;"></div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <button class="nav-btn" onclick="FirefoxNavigation.navigate('?page=settings')" 
                                style="margin: 5px;">Go to Settings →</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderSettingsPage() {
        return `
            <div class="display-info">
                <h2>⚙️ Settings</h2>
                <div class="tech-details" style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <div style="margin: 1rem 0;">
                        <strong>Window Configuration:</strong>
                    </div>
                    <div style="margin: 0.5rem 0;">
                        <label style="display: block; margin-bottom: 0.5rem;">
                            Monitor Name:
                            <input type="text" value="${this.monitorName}" 
                                   style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; background: rgba(255,255,255,0.9); color: #333; border: none; border-radius: 4px;">
                        </label>
                    </div>
                    <div style="margin: 0.5rem 0;">
                        <label style="display: block; margin-bottom: 0.5rem;">
                            Theme Color:
                            <input type="color" value="${this.monitorColor || '#4ECDC4'}" 
                                   onchange="document.documentElement.style.setProperty('--monitor-color', this.value)"
                                   style="width: 100%; height: 40px; margin-top: 0.25rem; border: none; border-radius: 4px;">
                        </label>
                    </div>
                    <div style="margin-top: 1rem;">
                        <button class="nav-btn" onclick="FirefoxNavigation.navigate('?page=home')" 
                                style="margin: 5px;">← Back to Home</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    addBookmark() {
        const page = this.getCurrentPage();
        const title = this.capitalizeFirst(page);
        const url = '?page=' + page;
        
        // Check if already bookmarked
        const bookmarks = document.querySelectorAll('.bookmark');
        for (let bookmark of bookmarks) {
            if (bookmark.getAttribute('onclick')?.includes(url)) {
                this.updateStatus('Already bookmarked!');
                return;
            }
        }
        
        // Add to bookmarks bar
        const bookmarksBar = document.getElementById('bookmarks-bar');
        const bookmark = document.createElement('button');
        bookmark.className = 'bookmark';
        bookmark.textContent = `⭐ ${title}`;
        bookmark.onclick = () => this.navigate(url);
        bookmarksBar.appendChild(bookmark);
        
        this.updateStatus(`Bookmarked: ${title}`);
    },
    
    minimize() {
        window.blur();
        this.updateStatus('Window minimized (blurred)');
    },
    
    toggleMaximize() {
        if (window.outerWidth === screen.availWidth && window.outerHeight === screen.availHeight) {
            window.resizeTo(1200, 800);
            this.updateStatus('Window restored');
        } else {
            window.resizeTo(screen.availWidth, screen.availHeight);
            window.moveTo(0, 0);
            this.updateStatus('Window maximized');
        }
    },
    
    updateStatus(text) {
        document.getElementById('status-text').textContent = text;
        setTimeout(() => {
            document.getElementById('status-text').textContent = 'Ready';
        }, 2000);
    },
    
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    FirefoxNavigation.init();
    BookmarkManager.loadSavedBookmarks();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (event.state && typeof event.state.index !== 'undefined') {
        FirefoxNavigation.currentIndex = event.state.index;
        FirefoxNavigation.updateUI();
        FirefoxNavigation.loadCurrentPage();
    }
});

// Update position on resize/move
window.addEventListener('resize', () => {
    FirefoxNavigation.updateUI();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 't':
                e.preventDefault();
                openNewTab();
                break;
            case 'w':
                e.preventDefault();
                window.close();
                break;
        }
    }
    
    // F11 is usually handled by browser, but we can try to intercept or react
});

// Global helpers referenced in HTML
window.BookmarkManager = BookmarkManager;
window.FirefoxNavigation = FirefoxNavigation;

function openNewTab() {
    // Open new fake tab (reset to home)
    FirefoxNavigation.navigate('?page=home');
}

function showAbout() {
    alert('Monitor Window Demo\n\nPart of the Firefox Multi-Monitor Manager Project');
}

function toggleMenuBar() {
    const menu = document.getElementById('menu-bar');
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        document.exitFullscreen();
    }
}

// Expose globals
window.openNewTab = openNewTab;
window.showAbout = showAbout;
window.toggleMenuBar = toggleMenuBar;
window.toggleFullscreen = toggleFullscreen;
