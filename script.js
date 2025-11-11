class BreathingApp {
    constructor() {
        this.exercises = {
            default: {
                name: 'Default Exercise',
                cycles: [
                    { breaths: 30, holdTime: 60 },
                    { breaths: 30, holdTime: 90 },
                    { breaths: 30, holdTime: 120 }
                ]
            }
        };
        
        this.currentExercise = 'default';
        this.sessionState = 'ready'; // ready, breathing, holding, recovery, finished
        this.currentCycle = 0;
        this.currentBreath = 0;
        this.timer = null;
        this.timeRemaining = 0;
        this.isPaused = false;
        this.lastFocusedElement = null;
        this.keyDownActive = false; // prevent repeat on keydown
        
        this.settings = {
            speechVolume: 70,
            musicVolume: 50
        };
        
        this.initializeElements();
        this.loadSettings();
        this.bindEvents();
        this.loadCustomExercises();
        this.updateExerciseInfo();
        
        // Initialize Lucide icons
        lucide.createIcons();
    }
    
    initializeElements() {
        // Main elements
        this.breathingBtn = document.getElementById('breathingBtn');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.buttonText = document.getElementById('buttonText');
        this.exerciseInfo = document.getElementById('exerciseInfo');
        this.exerciseName = document.getElementById('exerciseName');
        this.cycleCount = document.getElementById('cycleCount');
        
        // Dropdown elements
        this.exerciseDropdown = document.getElementById('exerciseDropdown');
        this.exerciseMenu = document.getElementById('exerciseMenu');
        this.customExercises = document.getElementById('customExercises');
        this.dropdownContainer = document.querySelector('.dropdown-container');
        
        // Modal elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.createExerciseModal = document.getElementById('createExerciseModal');
        this.createExerciseBtn = document.getElementById('createExerciseBtn');
        this.closeCreateExercise = document.getElementById('closeCreateExercise');
        
        // Settings elements
        this.speechVolume = document.getElementById('speechVolume');
        this.musicVolume = document.getElementById('musicVolume');
        this.speechVolumeValue = document.getElementById('speechVolumeValue');
        this.musicVolumeValue = document.getElementById('musicVolumeValue');
        this.musicSettingGroup = document.getElementById('musicSettingGroup');
        
        // Form elements
        this.exerciseForm = document.getElementById('exerciseForm');
        this.exerciseNameInput = document.getElementById('exerciseNameInput');
        this.cycleCountInput = document.getElementById('cycleCountInput');
        this.cycleInputs = document.getElementById('cycleInputs');
        
        // Confirmation modal elements
        this.cancelConfirmModal = document.getElementById('cancelConfirmModal');
        this.confirmCancelBtn = document.getElementById('confirmCancelBtn');
        this.keepGoingBtn = document.getElementById('keepGoingBtn');
        
        // Create timer display
        this.timerDisplay = document.createElement('div');
        this.timerDisplay.className = 'timer-display';
        this.breathingBtn.parentElement.appendChild(this.timerDisplay);
    }
    
    bindEvents() {
        // Main button events
        this.breathingBtn.addEventListener('mousedown', () => this.handleBreathStart());
        this.breathingBtn.addEventListener('mouseup', () => this.handleBreathEnd());
        this.breathingBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleBreathStart();
        });
        this.breathingBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleBreathEnd();
        });
        // Keyboard support for breathing button
        this.breathingBtn.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                if (e.repeat) return;
                e.preventDefault();
                if (!this.keyDownActive) {
                    this.keyDownActive = true;
                    this.handleBreathStart();
                }
            }
        });
        this.breathingBtn.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.keyDownActive = false;
                this.handleBreathEnd();
            }
        });
        
        this.startBtn.addEventListener('click', () => this.startSession());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.cancelBtn.addEventListener('click', () => this.showCancelConfirmation());
        
        // Confirmation modal events
        this.confirmCancelBtn.addEventListener('click', () => this.confirmCancel());
        this.keepGoingBtn.addEventListener('click', () => this.closeCancelConfirmation());
        this.cancelConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.cancelConfirmModal) this.closeCancelConfirmation();
        });
        
        // Dropdown events
        this.exerciseDropdown.addEventListener('click', () => this.toggleDropdown());
        document.addEventListener('click', (e) => {
            if (this.exerciseMenu.classList.contains('active') && !this.dropdownContainer.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // Modal events
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeModal(this.settingsModal));
        this.createExerciseBtn.addEventListener('click', () => this.openCreateExercise());
        this.closeCreateExercise.addEventListener('click', () => this.closeModal(this.createExerciseModal));
        
        // Settings events
        this.speechVolume.addEventListener('input', () => this.updateVolume('speech'));
        this.musicVolume.addEventListener('input', () => this.updateVolume('music'));
        
        // Form events
        this.cycleCountInput.addEventListener('input', () => this.generateCycleInputs());
        this.exerciseForm.addEventListener('submit', (e) => this.saveExercise(e));
        
        // Modal overlay clicks
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeModal(this.settingsModal);
        });
        this.createExerciseModal.addEventListener('click', (e) => {
            if (e.target === this.createExerciseModal) this.closeModal(this.createExerciseModal);
        });

        // Global ESC to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.createExerciseModal.classList.contains('active')) this.closeModal(this.createExerciseModal);
                else if (this.settingsModal.classList.contains('active')) this.closeModal(this.settingsModal);
                else if (this.cancelConfirmModal.classList.contains('active')) this.closeCancelConfirmation();
            }
        });
    }
    
    handleBreathStart() {
        if (this.sessionState !== 'breathing' || this.isPaused) return;
        
        this.breathingBtn.classList.add('pressed');
        this.buttonText.textContent = 'Inhale';
    }
    
    handleBreathEnd() {
        if (this.sessionState !== 'breathing' || this.isPaused) return;
        
        this.breathingBtn.classList.remove('pressed');
        this.buttonText.textContent = 'Exhale';
        
        this.currentBreath++;
        const currentCycleData = this.exercises[this.currentExercise].cycles[this.currentCycle];
        
        if (this.currentBreath >= currentCycleData.breaths) {
            // Last breath of cycle
            setTimeout(() => {
                this.speak("That's the last exhale... and hold");
                this.startHoldPhase();
            }, 500);
        }
    }
    
    startSession() {
        this.sessionState = 'breathing';
        this.currentCycle = 0;
        this.currentBreath = 0;
        this.isPaused = false;
        
        document.body.classList.add('session-active');
        document.body.classList.remove('paused');
        this.startBtn.style.display = 'none';
        this.pauseBtn.style.display = 'flex';
        this.cancelBtn.style.display = 'flex';
        
        this.buttonText.textContent = 'Ready - press and hold to inhale';
        
        setTimeout(() => {
            this.buttonText.textContent = 'Ready';
        }, 3000);
    }
    
    startHoldPhase() {
        this.sessionState = 'holding';
        const currentCycleData = this.exercises[this.currentExercise].cycles[this.currentCycle];
        this.timeRemaining = currentCycleData.holdTime;
        
        this.buttonText.textContent = 'Hold';
        this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
        this.timerDisplay.classList.add('visible');
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timer);
                this.startRecoveryPhase();
            }
        }, 1000);
    }
    
    startRecoveryPhase() {
        this.sessionState = 'recovery';
        this.speak('Breathe in and hold');
        this.timeRemaining = 10;
        
        this.buttonText.textContent = 'Recovery Breath';
        this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timer);
                this.nextCycle();
            }
        }, 1000);
    }
    
    nextCycle() {
        this.currentCycle++;
        this.currentBreath = 0;
        
        if (this.currentCycle >= this.exercises[this.currentExercise].cycles.length) {
            this.finishSession();
            return;
        }
        
        this.timerDisplay.classList.remove('visible');
        this.speak('Next cycle - three, two, one...');
        
        setTimeout(() => {
            this.sessionState = 'breathing';
            this.buttonText.textContent = 'Ready';
        }, 4000);
    }
    
    finishSession() {
        this.sessionState = 'finished';
        this.timerDisplay.classList.remove('visible');
        this.speak('Session finished - well done');
        
        setTimeout(() => {
            this.resetSession();
        }, 3000);
    }
    
    resetSession() {
        this.sessionState = 'ready';
        this.currentCycle = 0;
        this.currentBreath = 0;
        this.isPaused = false;
        
        document.body.classList.remove('session-active');
        document.body.classList.remove('paused');
        this.buttonText.textContent = 'Ready';
        this.breathingBtn.classList.remove('pressed');
        this.startBtn.style.display = 'flex';
        this.pauseBtn.style.display = 'none';
        this.cancelBtn.style.display = 'none';
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    togglePause() {
        if (this.isPaused) {
            // Resume
            this.isPaused = false;
            this.pauseBtn.querySelector('span').textContent = 'PAUSE';
            this.pauseBtn.querySelector('i').setAttribute('data-lucide', 'pause');
            lucide.createIcons();
            document.body.classList.remove('paused');
            
            // Resume timer if in holding or recovery state
            if (this.sessionState === 'holding' || this.sessionState === 'recovery') {
                this.resumeTimer();
            }
        } else {
            // Pause
            this.isPaused = true;
            this.pauseBtn.querySelector('span').textContent = 'RESUME';
            this.pauseBtn.querySelector('i').setAttribute('data-lucide', 'play');
            lucide.createIcons();
            document.body.classList.add('paused');
            
            // Pause timer if running
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }
    }
    
    resumeTimer() {
        if (this.sessionState === 'holding') {
            this.timer = setInterval(() => {
                if (this.isPaused) return;
                
                this.timeRemaining--;
                this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
                
                if (this.timeRemaining <= 0) {
                    clearInterval(this.timer);
                    this.startRecoveryPhase();
                }
            }, 1000);
        } else if (this.sessionState === 'recovery') {
            this.timer = setInterval(() => {
                if (this.isPaused) return;
                
                this.timeRemaining--;
                this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
                
                if (this.timeRemaining <= 0) {
                    clearInterval(this.timer);
                    this.nextCycle();
                }
            }, 1000);
        }
    }
    
    showCancelConfirmation() {
        this.cancelConfirmModal.classList.add('active');
    }
    
    closeCancelConfirmation() {
        this.cancelConfirmModal.classList.remove('active');
    }
    
    confirmCancel() {
        this.closeCancelConfirmation();
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.timerDisplay.classList.remove('visible');
        this.resetSession();
    }
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = this.settings.speechVolume / 100;
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    toggleDropdown() {
        this.exerciseMenu.classList.toggle('active');
        const expanded = this.exerciseMenu.classList.contains('active');
        this.exerciseDropdown.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
    
    closeDropdown() {
        this.exerciseMenu.classList.remove('active');
        this.exerciseDropdown.setAttribute('aria-expanded', 'false');
    }
    
    selectExercise(exerciseKey) {
        if (this.sessionState !== 'ready') {
            const proceed = window.confirm('Switching exercises will cancel your current session. Continue?');
            if (!proceed) return;
            this.resetSession();
        }
        this.currentExercise = exerciseKey;
        this.updateExerciseInfo();
        this.closeDropdown();
    }
    
    updateExerciseInfo() {
        const exercise = this.exercises[this.currentExercise];
        this.exerciseName.textContent = exercise.name;
        this.cycleCount.textContent = `${exercise.cycles.length}×`;
    }
    
    openSettings() {
        this.lastFocusedElement = document.activeElement;
        this.settingsModal.classList.add('active');
        // Focus the close button for accessibility
        this.closeSettings.focus();
    }
    
    openCreateExercise() {
        this.closeModal(this.settingsModal);
        this.lastFocusedElement = document.activeElement;
        this.createExerciseModal.classList.add('active');
        this.generateCycleInputs();
        this.closeCreateExercise.focus();
    }
    
    closeModal(modal) {
        modal.classList.remove('active');
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
            this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
        }
    }
    
    updateVolume(type) {
        if (type === 'speech') {
            this.settings.speechVolume = this.speechVolume.value;
            this.speechVolumeValue.textContent = `${this.speechVolume.value}%`;
        } else {
            this.settings.musicVolume = this.musicVolume.value;
            this.musicVolumeValue.textContent = `${this.musicVolume.value}%`;
        }
        this.saveSettings();
    }
    
    generateCycleInputs() {
        const cycleCount = parseInt(this.cycleCountInput.value);
        this.cycleInputs.innerHTML = '';
        
        for (let i = 0; i < cycleCount; i++) {
            const cycleDiv = document.createElement('div');
            cycleDiv.className = 'cycle-input';
            cycleDiv.innerHTML = `
                <h4>Cycle ${i + 1}</h4>
                <div class="cycle-row">
                    <div class="form-group">
                        <label>Breaths</label>
                        <input type="number" name="breaths-${i}" min="1" max="100" value="30" required>
                    </div>
                    <div class="form-group">
                        <label>Hold Time (seconds)</label>
                        <input type="number" name="hold-${i}" min="1" max="300" value="${60 + (i * 30)}" required>
                    </div>
                </div>
            `;
            this.cycleInputs.appendChild(cycleDiv);
        }
    }
    
    saveExercise(e) {
        e.preventDefault();
        
        const name = this.exerciseNameInput.value.trim();
        const cycleCount = parseInt(this.cycleCountInput.value);
        
        if (!name) return;
        
        const cycles = [];
        for (let i = 0; i < cycleCount; i++) {
            const breaths = parseInt(document.querySelector(`input[name="breaths-${i}"]`).value);
            const holdTime = parseInt(document.querySelector(`input[name="hold-${i}"]`).value);
            cycles.push({ breaths, holdTime });
        }
        
        const exerciseKey = name.toLowerCase().replace(/\s+/g, '-');
        this.exercises[exerciseKey] = { name, cycles };
        
        this.saveCustomExercises();
        this.loadCustomExercises();
        this.selectExercise(exerciseKey);
        this.closeModal(this.createExerciseModal);
        
        // Reset form
        this.exerciseForm.reset();
        this.cycleCountInput.value = 3;
        this.generateCycleInputs();
    }
    
    saveCustomExercises() {
        const customExercises = {};
        Object.keys(this.exercises).forEach(key => {
            if (key !== 'default') {
                customExercises[key] = this.exercises[key];
            }
        });
        localStorage.setItem('breathingAppExercises', JSON.stringify(customExercises));
    }
    
    loadCustomExercises() {
        const saved = localStorage.getItem('breathingAppExercises');
        if (saved) {
            const customExercises = JSON.parse(saved);
            Object.assign(this.exercises, customExercises);
        }
        
        this.updateExerciseDropdown();
    }
    
    updateExerciseDropdown() {
        this.customExercises.innerHTML = '';
        
        Object.keys(this.exercises).forEach(key => {
            if (key !== 'default') {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = this.exercises[key].name;
                item.addEventListener('click', () => this.selectExercise(key));
                this.customExercises.appendChild(item);
            }
        });
        
        // Add default exercise click handler
        const defaultItem = this.exerciseMenu.querySelector('.dropdown-item[data-exercise="default"]');
        if (defaultItem) {
            defaultItem.addEventListener('click', () => this.selectExercise('default'));
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BreathingApp();
});

// Settings persistence helpers
BreathingApp.prototype.saveSettings = function() {
    try {
        localStorage.setItem('breathingAppSettings', JSON.stringify(this.settings));
    } catch (e) {}
};

BreathingApp.prototype.loadSettings = function() {
    try {
        const saved = localStorage.getItem('breathingAppSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (typeof parsed.speechVolume === 'number') this.settings.speechVolume = parsed.speechVolume;
            if (typeof parsed.musicVolume === 'number') this.settings.musicVolume = parsed.musicVolume;
        }
    } catch (e) {}
    // Reflect settings in UI
    if (this.speechVolume) {
        this.speechVolume.value = this.settings.speechVolume;
        this.speechVolumeValue.textContent = `${this.settings.speechVolume}%`;
    }
    if (this.musicVolume) {
        this.musicVolume.value = this.settings.musicVolume;
        this.musicVolumeValue.textContent = `${this.settings.musicVolume}%`;
    }
    // Hide music setting until background audio is implemented
    if (this.musicSettingGroup) {
        this.musicSettingGroup.style.display = 'none';
    }
};
