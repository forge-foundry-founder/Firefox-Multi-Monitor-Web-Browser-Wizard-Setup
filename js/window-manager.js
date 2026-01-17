/**
 * Window Manager
 * Opens and tracks windows across multiple monitors
 * 
 * This is the core logic that replaces the need for the Window Management API
 * It uses standard window.open() with calculated coordinates based on user calibration
 */
class WindowManager {
    static windows = new Map();
    static monitorConfig = null;
    static STORAGE_KEY = 'openWindows';
    
    /**
     * Initialize the manager with configuration
     */
    static initialize(config) {
        this.monitorConfig = config;
        console.log('WindowManager - Initialized with config:', config);
        
        // Sync with global window state to recover session if possible
        this.syncFromStorage();
    }
    
    static syncFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const openWindows = JSON.parse(stored);
                console.log('WindowManager - Syncing from storage:', openWindows);
                // Note: We can't "reconnect" to existing windows if the page reloaded, but we can know what *was* open.
            }
        } catch (e) {
            console.error('WindowManager - Error syncing from storage:', e);
        }
    }
    
    static updateStorage() {
        try {
            const openWindows = Array.from(this.windows.keys());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(openWindows));
            console.log('WindowManager - Updated storage:', openWindows);
        } catch (e) {
            console.error('WindowManager - Error updating storage:', e);
        }
    }
    
    static isWindowOpenGlobally(tagName) {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const openWindows = JSON.parse(stored);
                return openWindows.includes(tagName);
            }
        } catch (e) {
            console.error('WindowManager - Error checking global window state:', e);
        }
        return false;
    }
    
    static getWindowSizeForMonitor(tagName, monitor) {
        // Default safe size or max available size
        return {
            width: Math.min(1200, monitor.width || 1200),
            height: Math.min(800, monitor.height || 800)
        };
    }
    
    /**
     * Open a window on a specific monitor
     */
    static openWindow(tagName) {
        if (!this.monitorConfig || !this.monitorConfig.tags) {
            console.error('WindowManager - No monitor configuration');
            alert('No monitor configuration found. Please run the wizard again.');
            return null;
        }
        
        // Check if window already open (local check)
        if (this.isWindowOpen(tagName)) {
            console.warn(`WindowManager - Window already open locally for: ${tagName}. Focusing existing window.`);
            return this.focusWindow(tagName);
        }
        
        const monitor = this.monitorConfig.tags[tagName];
        
        if (!monitor) {
            console.error(`WindowManager - No monitor config for: ${tagName}`);
            alert(`Monitor "${tagName}" not found in configuration.`);
            return null;
        }
        
        const url = `demo-window.html?target=${encodeURIComponent(tagName)}`;
        const size = this.getWindowSizeForMonitor(tagName, monitor);
        
        // Use calibrated coordinates if available, otherwise use detected coordinates
        const left = monitor.calibratedX !== undefined ? monitor.calibratedX : monitor.x;
        const top = monitor.calibratedY !== undefined ? monitor.calibratedY : monitor.y;

        // Construct window features string
        const features = [
            `width=${size.width}`,
            `height=${size.height}`,
            `left=${left}`,
            `screenX=${left}`,
            `screenY=${top}`,
            `top=${top}`,
            'resizable=yes',
            'scrollbars=yes',
            'menubar=no' // Hide default browser UI to make it look like a dedicated app window
        ].join(',');

        console.log('WindowManager - Opening window:', {
            tagName,
            targetPosition: { left, top },
            size,
            features
        });
        
        const win = window.open(url, '_blank', features);
        
        if (!win) {
            console.error('WindowManager - Failed to open window (popup blocked?)');
            return null;
        }
        
        const windowData = {
            window: win,
            tagName: tagName,
            openedAt: Date.now()
        };
        
        this.windows.set(tagName, windowData);
        this.startMonitoring(tagName, win);
        
        // Update global storage
        this.updateStorage();
        
        // Register for cleanup
        if (window.ComponentRegistry) {
            window.ComponentRegistry.register(
                `window_${tagName}`,
                () => this.closeWindow(tagName),
                { tagName, type: 'monitor_window' }
            );
        }
        
        console.log('WindowManager - Window opened:', tagName, '- Total windows:', this.windows.size);
        
        // CHROMIUM FIX: Multi-stage retry strategy for cross-monitor positioning
        // Chromium browsers often ignore initial placement coordinates for cross-origin windows 
        // or cross-monitor placement due to security/fingerprinting protections
		// CHROMIUM has chosen to block these options out rather be utilize decades old APIs
        const isFirefox = /Firefox|PaleMoon/.test(navigator.userAgent);
        const isChromium = /Chrome|Chromium|Edge|Edg|Opera|Vivaldi|Brave/.test(navigator.userAgent);
        
        if (isChromium) {
            console.log('WindowManager - Chromium detected - using retry-after-load strategy');
            
            // Stage 1: Immediate attempt
            setTimeout(() => {
                try {
                    win.moveTo(left, top);
                    win.resizeTo(size.width, size.height);
                } catch (e) {
                    console.error('WindowManager - Stage 1 moveTo() error:', e.message);
                }
            }, 100);
            
            // Stage 2: Retry after window load (requires window to cooperate via postMessage usually, 
            // but we try simple manipulation here as we are same-origin)
            // Note: In same-origin, we can access win.screenX, etc
        } else if (!isFirefox) {
            // Unknown browser - log position for debugging
            setTimeout(() => {
                console.log('WindowManager - Unknown browser - Final position:', {
                    tagName,
                    screenX: win.screenX,
                    screenY: win.screenY,
                    intended: { left, top }
                });
            }, 200);
        }
        
        return win;
    }
    
    static isWindowOpen(tagName) {
        const data = this.windows.get(tagName);
        if (!data) return false;
        
        try {
            return !data.window.closed;
        } catch (e) {
            this.windows.delete(tagName);
            return false;
        }
    }
    
    static focusWindow(tagName) {
        const data = this.windows.get(tagName);
        if (data && !data.window.closed) {
            try {
                data.window.focus();
                return data.window;
            } catch (e) {
                console.error(`WindowManager - Error focusing window: ${tagName}`, e);
                this.windows.delete(tagName);
            }
        }
        return null;
    }
    
    static closeWindow(tagName) {
        const data = this.windows.get(tagName);
        if (!data) return;
        
        console.log('WindowManager - Closing window:', tagName);
        
        try {
            if (!data.window.closed) {
                data.window.close();
            }
        } catch (e) {
            console.error(`WindowManager - Error closing window: ${tagName}`, e);
        }
        
        this.windows.delete(tagName);
        
        // Update global storage
        this.updateStorage();
    }
    
    static closeAll() {
        const tagNames = Array.from(this.windows.keys());
        console.log('WindowManager - Closing all windows:', tagNames);
        tagNames.forEach(tagName => this.closeWindow(tagName));
        
        // Clear global storage
        localStorage.removeItem(this.STORAGE_KEY);
    }
    
    static startMonitoring(tagName, win) {
        const checkInterval = setInterval(() => {
            try {
                if (win.closed) {
                    clearInterval(checkInterval);
                    this.windows.delete(tagName);
                    this.updateStorage();
                    console.log('WindowManager - Window closed by user:', tagName);
                }
            } catch (e) {
                clearInterval(checkInterval);
                this.windows.delete(tagName);
            }
        }, 1000);
    }
    
    static getOpenWindows() {
        const open = [];
        this.windows.forEach((data, tagName) => {
            if (this.isWindowOpen(tagName)) {
                open.push(tagName);
            }
        });
        return open;
    }
}

// Make available globally
window.WindowManager = WindowManager;
