/**
 * Component Registry
 * Manages lifecycle of all components with LIFO (Last-In-First-Out) cleanup
 * 
 * This registry allows different parts of the application to register cleanup handlers
 * that will be executed when the application shuts down or when components are unregistered
 *
 * This will probably need to be adapted per browser
 */
class ComponentRegistry {
    static components = new Map();
    static cleanupOrder = [];
    
    /**
     * Register a component for managed cleanup.
     */
    static register(id, cleanup, metadata = {}) {
        if (typeof cleanup !== 'function') {
            console.error(`Registry - Invalid cleanup function for: ${id}`);
            return;
        }
        
        const component = {
            id,
            cleanup,
            metadata,
            registeredAt: Date.now()
        };
        
        this.components.set(id, component);
        this.cleanupOrder.push(id);
    }
    
    /**
     * Unregister and cleanup a component immediately via Compenent id
     */
    static unregister(id) {
        const component = this.components.get(id);
        if (!component) return;
        
        try {
            component.cleanup();
        } catch (err) {
            console.error(`Registry - Error unregistering ${id}:`, err);
        }
        
        this.components.delete(id);
        const index = this.cleanupOrder.indexOf(id);
        if (index > -1) {
            this.cleanupOrder.splice(index, 1);
        }
    }
    
    /**
     * Cleanup all components in LIFO order
     * Use this when shutting down the application or resetting state
     */
    static cleanup() {
        // LIFO cleanup (reverse order)
        for (let i = this.cleanupOrder.length - 1; i >= 0; i--) {
            const id = this.cleanupOrder[i];
            const component = this.components.get(id);
            
            if (component) {
                try {
                    component.cleanup();
                } catch (err) {
                    console.error(`Registry - Failed cleanup: ${id}`, err);
                }
            }
        }
        
        this.components.clear();
        this.cleanupOrder = [];
    }
    
    /**
     * Get all registered components in an Array
     */
    static getAll() {
        return Array.from(this.components.values());
    }
    
    /**
     * Check if a component is registered.
     */
    static has(id) {
        return this.components.has(id);
    }
    
    /**
     * Get component by id.
     */
    static get(id) {
        return this.components.get(id) || null;
    }
    
    /**
     * Find components matching metadata filter
     */
    static findByMetadata(filter) {
        return Array.from(this.components.values()).filter(component => {
            return Object.entries(filter).every(([key, value]) => {
                return component.metadata[key] === value;
            });
        });
    }
}

// Make available globally
window.ComponentRegistry = ComponentRegistry;
