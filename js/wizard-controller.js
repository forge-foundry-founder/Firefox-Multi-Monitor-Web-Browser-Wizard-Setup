/**
 * Wizard Controller
 * Streamlined 3-step wizard: Setup → Configure → Review
 *
 * This was designed for quick user configuration and setup
 * Keep It Simple Stupid
 */
const WizardController = {
    // State
    currentStep: 1,
    currentPhase: 'calibrate',
    monitors: [],
    profileName: '',
    
    // Initialize
    init() {
        this.loadTheme();
        this.checkExistingConfig();
        this.updateUI();
        this.attachFullscreenListeners();
        
        // Initial button state check
        this.updateStep1Buttons();
    },
    
    // Load saved theme
    loadTheme() {
        const theme = localStorage.getItem('ide-theme') || 'dark';
        document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
        const select = document.getElementById('theme-select');
        if (select) select.value = theme;
    },
    
    // Apply theme
    applyTheme(theme) {
        document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
        localStorage.setItem('ide-theme', theme);
    },
    
    // Check if wizard was completed
    checkExistingConfig() {
        const complete = localStorage.getItem('wizardComplete');
        const dontShow = localStorage.getItem('wizardDontShow');
    },
    
    // Navigation
    nextStep() {
        if (!this.validateCurrentStep()) return;
        
        if (this.currentStep < 3) {
            this.currentStep++;
            this.updateUI();
        }
    },
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateUI();
        }
    },
    
    // Validation
    validateCurrentStep() {
        if (this.currentStep === 1) {
            const name = document.getElementById('wizard-profile-name').value.trim();
            if (!name) {
                alert('Please enter a profile name');
                return false;
            }
            this.profileName = name;
        }
        
        if (this.currentStep === 2 && this.currentPhase === 'list') {
            if (this.monitors.length < 2) {
                alert('Minimum 2 monitors required. Please add at least 2 monitors.');
                return false;
            }
        }
        
        return true;
    },
    
    // UI Update
    updateUI() {
        // Update steps
        document.querySelectorAll('.wizard-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === this.currentStep);
        });
        
        // Update progress
        document.querySelectorAll('.progress-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === this.currentStep);
            step.classList.toggle('completed', stepNum < this.currentStep);
        });
        
        // Update buttons
        this.updateButtons();
        
        // Step-specific updates
        if (this.currentStep === 1) {
            this.updateStep1Buttons();
        } else if (this.currentStep === 2) {
            this.updateStep2();
        } else if (this.currentStep === 3) {
            this.updateReview();
        }
    },
    
    // Step 1: Progressive disclosure for Next button
    updateStep1Buttons() {
        const nextBtn = document.getElementById('next-btn');
        const profileName = document.getElementById('wizard-profile-name')?.value.trim() || '';
        if (nextBtn) {
            nextBtn.style.display = profileName.length > 0 ? 'inline-block' : 'none';
        }
    },
    
    onProfileNameInput() {
        if (this.currentStep === 1) {
            this.updateStep1Buttons();
        }
    },
    
    updateButtons() {
        const backBtn = document.getElementById('back-btn');
        const nextBtn = document.getElementById('next-btn');
        const finishBtn = document.getElementById('finish-btn');
        
        if (backBtn) {
            backBtn.style.display = (this.currentStep === 1 || (this.currentStep === 2 && this.currentPhase === 'input')) ? 'none' : 'inline-block';
        }
        
        if (nextBtn) {
            // Next button (hide on step 3 and during step 2 phases except list)
            nextBtn.style.display = (this.currentStep === 3 || (this.currentStep === 2 && this.currentPhase !== 'list')) ? 'none' : 'inline-block';
        }
        
        if (finishBtn) {
            // Finish button (only on step 3)
            finishBtn.style.display = this.currentStep === 3 ? 'inline-block' : 'none';
        }
    },
    
    // Step 2 Phase Management
    updateStep2() {
        document.querySelectorAll('.wizard-phase').forEach(phase => {
            phase.classList.toggle('active', phase.dataset.phase === this.currentPhase);
        });
        
        this.updateBreadcrumb();
        
        if (this.currentPhase === 'input') {
            this.updatePositionDropdown();
        } else if (this.currentPhase === 'list') {
            this.renderMonitorList();
        }
    },
    
    // Update position dropdown to hide used positions
    updatePositionDropdown() {
        const select = document.getElementById('monitor-position');
        const usedPositions = this.monitors.map(m => m.position);
        
        const allOptions = ['left', 'center', 'right', 'upper-left', 'upper-center', 'upper-right'];
        const optionLabels = {
            'left': 'Left',
            'center': 'Center',
            'right': 'Right',
            'upper-left': 'Upper Left',
            'upper-center': 'Upper Center',
            'upper-right': 'Upper Right'
        };
        
        select.innerHTML = '<option value="">-- Select Position --</option>';
        allOptions.forEach(pos => {
            if (!usedPositions.includes(pos)) {
                const option = document.createElement('option');
                option.value = pos;
                option.textContent = optionLabels[pos];
                select.appendChild(option);
            }
        });
    },
    
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('monitor-breadcrumb');
        const monitorNum = this.monitors.length + 1;
        breadcrumb.textContent = this.monitors.length === 0 
            ? `Configuring Monitor 1 of 2 minimum`
            : `Adding Monitor ${monitorNum}`;
    },
    
    // Fullscreen Calibration
    enterFullscreen() {
        const elem = document.documentElement;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    },
    
    attachFullscreenListeners() {
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
    },
    
    onFullscreenChange() {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            // Entered fullscreen - capture coordinates
            setTimeout(() => {
                const x = window.screenX || window.screenLeft || 0;
                const y = window.screenY || window.screenTop || 0;
                const resolution = `${screen.width}x${screen.height}`;
                const orientation = screen.width >= screen.height ? 'Landscape' : 'Portrait';
                
                document.getElementById('calibrated-x').value = x;
                document.getElementById('calibrated-y').value = y;
                document.getElementById('detected-x').value = x;
                document.getElementById('detected-y').value = y;
                document.getElementById('detected-resolution').value = resolution;
                document.getElementById('detected-orientation').value = orientation;
                
                document.getElementById('calibrated-coords').textContent = `X: ${x}, Y: ${y}`;
                
            }, 500);
        } else {
            // Exited fullscreen - move to input phase
            if (this.currentStep === 2 && this.currentPhase === 'calibrate') {
                const x = document.getElementById('calibrated-x').value;
                if (x) {
                    this.currentPhase = 'input';
                    this.updateStep2();
                }
            }
        }
    },
    
    // Monitor Management
    addMonitor() {
        const position = document.getElementById('monitor-position').value;
        const name = document.getElementById('monitor-name').value.trim();
        
        if (!position) {
            alert('Please select a monitor position');
            return;
        }
        
        if (!name) {
            alert('Please enter a monitor name');
            return;
        }
        
        // Validate uniqueness
        if (this.monitors.some(m => m.position === position)) {
            document.getElementById('position-warning').style.display = 'block';
            return;
        }
        
        if (this.monitors.some(m => m.name.toLowerCase() === name.toLowerCase())) {
            document.getElementById('name-warning').style.display = 'block';
            return;
        }
        
        if (name.toLowerCase().includes('command center')) {
            alert('Command Center is not allowed as a monitor name');
            return;
        }
        
        // Add monitor (unlimited monitors)
        const monitor = {
            name: name,
            position: position,
            x: parseInt(document.getElementById('detected-x').value),
            y: parseInt(document.getElementById('detected-y').value),
            calibratedX: parseInt(document.getElementById('calibrated-x').value),
            calibratedY: parseInt(document.getElementById('calibrated-y').value),
            resolution: document.getElementById('detected-resolution').value,
            orientation: document.getElementById('detected-orientation').value
        };
        
        this.monitors.push(monitor);
        
        // Move to list phase
        this.currentPhase = 'list';
        this.updateStep2();
        this.updateButtons();
    },
    
    addAnotherMonitor() {
        // Reset phase to calibrate
        this.currentPhase = 'calibrate';
        this.resetCalibrationForm();
        this.updateStep2();
        this.updateButtons();
    },
    
    recalibrate() {
        this.currentPhase = 'calibrate';
        this.resetCalibrationForm();
        this.updateStep2();
        this.updateButtons();
    },
    
    resetCalibrationForm() {
        document.getElementById('monitor-position').value = '';
        document.getElementById('monitor-name').value = '';
        document.getElementById('calibrated-x').value = '';
        document.getElementById('calibrated-y').value = '';
        document.getElementById('detected-x').value = '0';
        document.getElementById('detected-y').value = '0';
        document.getElementById('detected-resolution').value = '';
        document.getElementById('detected-orientation').value = '';
        document.getElementById('position-warning').style.display = 'none';
        document.getElementById('name-warning').style.display = 'none';
    },
    
    removeMonitor(index) {
        if (confirm(`Remove "${this.monitors[index].name}"?`)) {
            this.monitors.splice(index, 1);
            this.renderMonitorList();
        }
    },
    
    clearAllMonitors() {
        if (confirm('Clear all configured monitors?')) {
            this.monitors = [];
            this.currentPhase = 'calibrate';
            this.resetCalibrationForm();
            this.updateStep2();
            this.updateButtons();
        }
    },
    
    renderMonitorList() {
        const list = document.getElementById('monitor-list');
        const countInfo = document.getElementById('monitor-count-info');
        
        if (this.monitors.length === 0) {
            list.innerHTML = '<p class="hint">No monitors configured yet</p>';
        } else {
            list.innerHTML = this.monitors.map((mon, index) => `
                <div class="monitor-card">
                    <h4>${mon.name}</h4>
                    <p>Position: ${mon.position}</p>
                    <p>Resolution: ${mon.resolution}</p>
                    <p>Orientation: ${mon.orientation}</p>
                    <button class="btn btn-danger btn-small" onclick="WizardController.removeMonitor(${index})">Remove</button>
                </div>
            `).join('');
        }
        
        // Update count info
        const count = this.monitors.length;
        if (count >= 2) {
            countInfo.innerHTML = `✅ You have configured <strong>${count} monitors</strong>`;
            countInfo.className = 'info-box success';
        } else {
            countInfo.innerHTML = `⚠️ Minimum 2 monitors required. You have: <strong>${count}</strong>`;
            countInfo.className = 'info-box warning';
        }
    },
    
    // Review
    updateReview() {
        document.getElementById('review-profile').textContent = this.profileName;
        document.getElementById('review-monitor-count').textContent = this.monitors.length;
        
        const reviewMonitors = document.getElementById('review-monitors');
        reviewMonitors.innerHTML = this.monitors.map(mon => `
            <div class="review-monitor-item">
                <strong>${mon.name}</strong> - ${mon.position} (${mon.resolution})
            </div>
        `).join('');
    },
    
    // Save & Finish
    finish() {
        if (this.monitors.length < 2) {
            alert('Please configure at least 2 monitors before finishing');
            return;
        }
        
        // Prepare config for ConfigManager
        const config = {
            version: 1,
            timestamp: Date.now(),
            tags: {}
        };
        
        // Convert monitors array to tags object
        this.monitors.forEach(mon => {
            config.tags[mon.name] = {
                name: mon.name,
                position: mon.position,
                x: mon.x,
                y: mon.y,
                calibratedX: mon.calibratedX,
                calibratedY: mon.calibratedY,
                width: parseInt(mon.resolution.split('x')[0]),
                height: parseInt(mon.resolution.split('x')[1]),
                resolution: mon.resolution,
                orientation: mon.orientation
            };
        });
        
        // Save configuration
        if (typeof ConfigManager !== 'undefined') {
            const saved = ConfigManager.save(config);
            if (!saved) {
                alert('Error saving configuration');
                return;
            }
        } else {
            console.warn('Wizard - ConfigManager not found - saving to localStorage directly');
            localStorage.setItem('firefox-monitor-config', JSON.stringify(config));
        }
        
        // Save profile name
        localStorage.setItem('profileName', this.profileName);
        
        // Save settings
        const autoSave = document.getElementById('enable-autosave')?.checked || false;
        const dontShow = document.getElementById('dont-show-again')?.checked || false;
        
        localStorage.setItem('autoSaveEnabled', autoSave);
        localStorage.setItem('wizardComplete', 'true');
        
        if (dontShow) {
            localStorage.setItem('wizardDontShow', 'true');
        }
        
        // Show toolbar using IntegrationController (globally available in index.html)
        if (typeof IntegrationController !== 'undefined') {
             IntegrationController.showToolbar();
        } else {
             alert('Configuration saved successfully!\n\nReloading...');
             window.location.reload();
        }
    },
    
    // Clear storage
    clearStorage() {
        if (confirm('This will delete all saved settings. Continue?')) {
            localStorage.clear();
            window.location.reload();
        }
    }
};

// Expose globally
window.WizardController = WizardController;
