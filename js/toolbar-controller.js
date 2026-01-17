/**
 * Toolbar Controller
 * Command center for opening windows on configured monitors
 *
 * Keep It Simple Stupid
 * Big brains with big ideas lead to big costs
 */
const ToolbarController = {
    // State
    config: null,
    monitors: [],
    
    // Initialize
    init() {
        this.loadConfig();
        this.populateMonitorDropdown();
        this.updateStatus();
        this.startWindowTracking();
    },
    
    // Load user configuration
    loadConfig() {
        if (typeof ConfigManager !== 'undefined') {
            this.config = ConfigManager.load();
            if (this.config && this.config.tags) {
                this.monitors = Object.keys(this.config.tags).map(key => ({
                    name: key,
                    ...this.config.tags[key]
                }));
                
                // Initialize WindowManager with config
                if (typeof WindowManager !== 'undefined') {
                    WindowManager.initialize(this.config);
                }
            }
        }
    },
    
    // Populate monitor dropdown list
    populateMonitorDropdown() {
        const select = document.getElementById('monitor-select');
        if (!select) return;
        
        if (this.monitors.length === 0) {
            select.innerHTML = '<option value="">-- No monitors configured --</option>';
            return;
        }
        
        select.innerHTML = '<option value="">-- Select a monitor --</option>';
        this.monitors.forEach(monitor => {
            const option = document.createElement('option');
            option.value = monitor.name;
            option.textContent = `${monitor.name} (${monitor.position})`;
            select.appendChild(option);
        });
    },
    
    // Update status display
    updateStatus() {
        const profileName = localStorage.getItem('profileName') || 'Not configured';
        const monitorCount = this.monitors.length;
        
        const profileEl = document.getElementById('profile-name');
        if (profileEl) profileEl.textContent = profileName;
        
        const countEl = document.getElementById('monitor-count');
        if (countEl) countEl.textContent = monitorCount;
        
        const statusDiv = document.getElementById('config-status');
        if (statusDiv) {
            if (monitorCount === 0) {
                statusDiv.className = 'config-status warning';
            } else {
                statusDiv.className = 'config-status success';
            }
        }
    },
    
    // Open window
    openWindow() {
        const monitorName = document.getElementById('monitor-select').value;
        
        if (!monitorName) {
            alert('Please select a monitor');
            return;
        }
        
        if (this.monitors.length === 0) {
            alert('No monitors configured. Please run the wizard first.');
            return;
        }
        
        if (typeof WindowManager === 'undefined') {
            alert('WindowManager not loaded.');
            return;
        }
        
        try {
            const windowRef = WindowManager.openWindow(monitorName);
            if (windowRef) {
                this.updateWindowList();
            } else {
                alert('Failed to open window. Check console for details.');
            }
        } catch (error) {
            console.error('[Toolbar] Error:', error);
            alert(`Error opening window: ${error.message}`);
        }
    },
    
    // Update window list
    updateWindowList() {
        const list = document.getElementById('window-list');
        if (!list) return;
        
        if (typeof WindowManager === 'undefined') {
            list.innerHTML = '<p class="hint">WindowManager not available</p>';
            return;
        }
        
        const openWindows = Array.from(WindowManager.windows.entries()).map(([tagName, data]) => ({
            tagName,
            window: data.window
        }));
        
        if (openWindows.length === 0) {
            list.innerHTML = '<p class="hint">No windows open</p>';
            return;
        }
        
        list.innerHTML = openWindows.map(win => `
            <div class="window-item">
                <div class="window-info">
                    <strong>${win.tagName}</strong>
                </div>
                <button class="btn btn-danger btn-small" onclick="ToolbarController.closeWindow('${win.tagName}')">
                    Close
                </button>
            </div>
        `).join('');
    },
    
    // Close specific window
    closeWindow(tagName) {
        if (typeof WindowManager !== 'undefined') {
            WindowManager.closeWindow(tagName);
            this.updateWindowList();
        }
    },
    
    // Close all windows
    closeAllWindows() {
        if (typeof WindowManager === 'undefined') {
            alert('WindowManager not available');
            return;
        }
        
        const count = WindowManager.windows.size;
        if (count === 0) {
            alert('No windows to close');
            return;
        }
        
        if (confirm(`Close all ${count} window(s)?`)) {
            WindowManager.closeAll();
            this.updateWindowList();
        }
    },
    
    // Track window status
    startWindowTracking() {
        setInterval(() => {
            this.updateWindowList();
        }, 2000);
    },
    
    // Reload user configuration
    reloadConfig() {
        this.loadConfig();
        this.populateMonitorDropdown();
        this.updateStatus();
        alert('Configuration reloaded successfully!');
    },
    
    // Open setup wizard
    openWizard() {
        if (confirm('This will open the configuration wizard. Continue?')) {
            // Check if we are in the combined view
            if (typeof IntegrationController !== 'undefined') {
                IntegrationController.showWizard();
            } else {
                // Fallback
                window.location.reload(); 
            }
        }
    },
    
    // Test all positions
    testPositions() {
        if (this.monitors.length === 0) {
            alert('No monitors configured');
            return;
        }
        
        if (confirm(`This will open a test window on all ${this.monitors.length} monitors. Continue?\n\nNote: Your browser may block some popups. Please allow popups for this site.`)) {
            this.monitors.forEach((monitor, index) => {
                setTimeout(() => {
                    if (typeof WindowManager !== 'undefined') {
                        WindowManager.openWindow(monitor.name);
                        this.updateWindowList();
                    }
                }, index * 1000);
            });
        }
    },
    
    // Debug toggle
    toggleDebug() {
        const output = document.getElementById('debug-output');
        if (!output) return;
        
        const isVisible = output.style.display !== 'none';
        
        if (isVisible) {
            output.style.display = 'none';
        } else {
            output.style.display = 'block';
            const openWindows = WindowManager ? Array.from(WindowManager.windows.keys()) : [];
            output.textContent = JSON.stringify({
                config: this.config,
                monitors: this.monitors,
                openWindows
            }, null, 2);
        }
    }
};

// Expose globally
window.ToolbarController = ToolbarController;
