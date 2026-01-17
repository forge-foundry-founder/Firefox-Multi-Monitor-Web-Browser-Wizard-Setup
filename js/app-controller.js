/**
 * App Controller (Integration Logic)
 * Manages the switching between Wizard and Toolbar views
 */
const IntegrationController = {
    init() {
        const wizardComplete = localStorage.getItem('wizardComplete');
        if (wizardComplete) {
            this.showToolbar();
        } else {
            this.showWizard();
        }
    },
    
    showWizard() {
        document.getElementById('wizard-view').classList.add('active');
        document.getElementById('toolbar-view').classList.remove('active');
        if (window.WizardController) WizardController.init();
    },
    
    showToolbar() {
        document.getElementById('wizard-view').classList.remove('active');
        document.getElementById('toolbar-view').classList.add('active');
        if (window.ToolbarController) ToolbarController.init();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    IntegrationController.init();
});

// Expose
window.IntegrationController = IntegrationController;
