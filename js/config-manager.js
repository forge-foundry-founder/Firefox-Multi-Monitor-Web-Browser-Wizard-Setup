/**
 * Configuration Manager
 * Handles loading, saving, and validating configuration data using localStorage
 * 
 * This ensures user privacy by keeping all configuration data on the client side
 * No data is sent to any server there is no need for it, now or ever
 */
class ConfigManager {
    static STORAGE_KEY = 'firefox-monitor-config';
    static VERSION = '1.0';
    
    /**
     * Load configuration from localStorage
     */
    static load() {
        try {
            const json = localStorage.getItem(this.STORAGE_KEY);
            if (json) {
                const config = JSON.parse(json);
                return config;
            }
        } catch (e) {
            console.error('ConfigManager - Error loading:', e);
        }
        
        return this.getDefault();
    }
    
    /**
     * Save configuration to localStorage
     */
    static save(config) {
        if (!this.validate(config)) {
            console.error('ConfigManager - Validation failed, not saving');
            return false;
        }
        
        try {
            config.timestamp = Date.now();
            config.version = this.VERSION;
            
            const json = JSON.stringify(config);
            localStorage.setItem(this.STORAGE_KEY, json);
            
            return true;
        } catch (e) {
            console.error('ConfigManager - Error saving:', e);
            return false;
        }
    }
    
    /**
     * Validate configuration structure
     */
    static validate(config) {
        if (!config || typeof config !== 'object') {
            console.warn('ConfigManager - Invalid config object');
            return false;
        }
        
        if (!config.tags || typeof config.tags !== 'object') {
            console.warn('ConfigManager - Missing or invalid tags');
            return false;
        }
        
        // Validate each tag (monitor configuration)
        for (const [tagName, position] of Object.entries(config.tags)) {
            if (typeof position.x !== 'number' || 
                typeof position.y !== 'number' ||
                typeof position.width !== 'number' ||
                typeof position.height !== 'number') {
                console.warn(`ConfigManager - Invalid position data for tag: ${tagName}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get default configuration structure
     */
    static getDefault() {
        return {
            version: this.VERSION,
            timestamp: Date.now(),
            tags: {}, // Stores monitor configurations by name
            settings: {
                theme: 'light',
                autoRestore: true,
                openDelay: 100
            }
        };
    }
    
    /**
     * Add or update a monitor tag configuration
     */
    static addTag(tagName, position) {
        const config = this.load();
        config.tags[tagName] = position;
        return this.save(config);
    }
    
    /**
     * Remove a monitor tag configuration
     */
    static removeTag(tagName) {
        const config = this.load();
        
        if (config.tags[tagName]) {
            delete config.tags[tagName];
            return this.save(config);
        }
        
        return false;
    }
    
    /**
     * Clear all configuration
     * Useful for factory reset or testing
     */
    static clearAll() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('ConfigManager - Error clearing:', e);
            return false;
        }
    }
    
    /**
     * Update application settings
     */
    static updateSettings(settings) {
        const config = this.load();
        config.settings = { ...config.settings, ...settings };
        return this.save(config);
    }
    
    /**
     * Get all configured monitor tags
     */
    static getTags() {
        const config = this.load();
        return config.tags;
    }
    
    /**
     * Get application settings
     */
    static getSettings() {
        const config = this.load();
        return config.settings;
    }
}

// Make available globally
window.ConfigManager = ConfigManager;
