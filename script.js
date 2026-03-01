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
        this.pausedTimeRemaining = 0;
        this.lastFocusedElement = null;
        this.keyDownActive = false; // prevent repeat on keydown
        this.sessionStartTime = null; // track session duration
        
        this.settings = {
            speechVolume: 70,
            soundVolume: 50,
            darkMode: false,
            hapticFeedback: true
        };
        this.editingExerciseKey = null;
        // Session history
        this.history = [];
        // Audio cue management
        this.audio = {
            cues: {},
            files: {}
        };
        this.audioUnlocked = false;
        this.recoveryCuePlayed = false;
        this.initAudio();
        
        this.initializeElements();
        this.loadSettings();
        this.loadHistory();
        this.bindEvents();
        this.loadCustomExercises();
        this.updateExerciseInfo();
        
        // Initialize Lucide icons
        lucide.createIcons();
        // Try to detect audio files on load to enable music UI
        setTimeout(() => this.checkForAudioFiles(), 0);
    }

    unlockAudio() {
        // iOS Safari often blocks audio until a user gesture occurs.
        // Call this from a click/touch handler (e.g., Start button).
        if (this.audioUnlocked) return;
        this.audioUnlocked = true;

        try {
            Object.keys(this.audio.files || {}).forEach((key) => {
                const src = this.audio.files[key];
                if (!src) return;
                if (!this.audio.cues[key]) {
                    const a = new Audio(src);
                    a.preload = 'auto';
                    a.volume = 0;
                    this.audio.cues[key] = a;
                }
            });

            // Attempt to start/stop one audio element silently.
            const firstKey = Object.keys(this.audio.cues || {})[0];
            const audio = firstKey ? this.audio.cues[firstKey] : null;
            if (audio) {
                const p = audio.play();
                if (p && typeof p.then === 'function') {
                    p.then(() => {
                        setTimeout(() => {
                            try {
                                audio.pause();
                                audio.currentTime = 0;
                                audio.volume = this.settings.soundVolume / 100;
                            } catch (_) {}
                        }, 50);
                    }).catch(() => {
                        // If unlock fails, we'll still fallback to speech.
                    });
                }
            }
        } catch (e) {
            // Best-effort only.
        }
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
        this.soundVolume = document.getElementById('soundVolume');
        this.speechVolumeValue = document.getElementById('speechVolumeValue');
        this.soundVolumeValue = document.getElementById('soundVolumeValue');
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
        // Delete confirmation modal elements
        this.deleteConfirmModal = document.getElementById('deleteConfirmModal');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.pendingDeleteKey = null;

        // History modal elements
        this.historyBtn = document.getElementById('historyBtn');
        this.historyModal = document.getElementById('historyModal');
        this.closeHistoryBtn = document.getElementById('closeHistory');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.totalSessionsEl = document.getElementById('totalSessions');
        this.totalMinutesEl = document.getElementById('totalMinutes');
        this.currentStreakEl = document.getElementById('currentStreak');
        
        // Settings toggles
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.hapticToggle = document.getElementById('hapticToggle');
        
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
        this.soundVolume.addEventListener('input', () => this.updateVolume('sound'));
        
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

        // update settings list when settings modal opens
        this.settingsBtn.addEventListener('click', () => {
            // slight delay so modal becomes active and element references exist
            setTimeout(() => this.updateSettingsExerciseList(), 50);
        });

        // Delete confirm buttons
        if (this.confirmDeleteBtn) this.confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteExercise());
        if (this.cancelDeleteBtn) this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteConfirmation());

        // Rescan audio button
        const rescanBtn = document.getElementById('rescanAudioBtn');
        if (rescanBtn) rescanBtn.addEventListener('click', () => this.checkForAudioFiles());

        // History modal events
        if (this.historyBtn) this.historyBtn.addEventListener('click', () => this.openHistory());
        if (this.closeHistoryBtn) this.closeHistoryBtn.addEventListener('click', () => this.closeModal(this.historyModal));
        if (this.historyModal) this.historyModal.addEventListener('click', (e) => {
            if (e.target === this.historyModal) this.closeModal(this.historyModal);
        });
        if (this.clearHistoryBtn) this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        // Dark mode toggle
        if (this.darkModeToggle) this.darkModeToggle.addEventListener('change', () => this.toggleDarkMode());

        // Haptic feedback toggle
        if (this.hapticToggle) this.hapticToggle.addEventListener('change', () => {
            this.settings.hapticFeedback = this.hapticToggle.checked;
            this.saveSettings();
        });

        // Global ESC to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.deleteConfirmModal && this.deleteConfirmModal.classList.contains('active')) this.closeDeleteConfirmation();
                else if (this.historyModal && this.historyModal.classList.contains('active')) this.closeModal(this.historyModal);
                else if (this.createExerciseModal.classList.contains('active')) this.closeModal(this.createExerciseModal);
                else if (this.settingsModal.classList.contains('active')) this.closeModal(this.settingsModal);
                else if (this.cancelConfirmModal.classList.contains('active')) this.closeCancelConfirmation();
            }
        });

        // Auto-select text/number inputs on focus for quicker editing
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (el && (el.matches('input[type="text"]') || el.matches('input[type="number"]') || el.matches('textarea'))) {
                try { el.select(); } catch (_) {}
            }
        });
    }
    
    handleBreathStart() {
        if (this.sessionState !== 'breathing' || this.isPaused) return;

        // Ensure audio is unlocked from a user gesture.
        this.unlockAudio();
        
        this.breathingBtn.classList.add('pressed');
        this.buttonText.textContent = 'Inhale';
        this.vibrate(30);

        // If this is the last inhale of the cycle, play the special cue
        const currentCycleData = this.exercises[this.currentExercise].cycles[this.currentCycle];
        if (this.currentBreath === currentCycleData.breaths - 1) {
            this.playCue('last_breath_now_hold');
        }
    }
    
    handleBreathEnd() {
        if (this.sessionState !== 'breathing' || this.isPaused) return;
        
        this.breathingBtn.classList.remove('pressed');
        this.buttonText.textContent = 'Exhale';
        this.vibrate(15);
        
        this.currentBreath++;
        const currentCycleData = this.exercises[this.currentExercise].cycles[this.currentCycle];
        
        if (this.currentBreath >= currentCycleData.breaths) {
            // Last breath of cycle
            setTimeout(() => {
                this.startHoldPhase();
            }, 500);
        }
    }
    
    startSession() {
        // Start button click is a user gesture - unlock audio here.
        this.unlockAudio();

        this.sessionState = 'breathing';
        this.currentCycle = 0;
        this.currentBreath = 0;
        this.isPaused = false;
        this.sessionStartTime = Date.now();
        
        document.body.classList.add('session-active');
        document.body.classList.remove('paused');
        this.startBtn.style.display = 'none';
        this.pauseBtn.style.display = 'flex';
        this.cancelBtn.style.display = 'flex';
        
        this.buttonText.textContent = 'Ready - press and hold to inhale';
        this.playCue('start_session');
        this.vibrate(100);
        
        setTimeout(() => {
            this.buttonText.textContent = 'Ready';
        }, 3000);
    }
    
    startHoldPhase() {
        this.sessionState = 'holding';
        this.recoveryCuePlayed = false;
        const currentCycleData = this.exercises[this.currentExercise].cycles[this.currentCycle];
        this.timeRemaining = currentCycleData.holdTime;
        
        this.buttonText.textContent = 'Hold';
        this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
        this.timerDisplay.classList.add('visible');
        this.vibrate([100, 50, 100]); // double vibration for hold phase
        
        const startTime = Date.now();
        const totalTime = this.timeRemaining;

        this.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            this.timeRemaining = totalTime - elapsed;
            
            if (this.timeRemaining < 0) this.timeRemaining = 0;
            this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timer);
                // Play cue right as hold ends (before recovery breath starts)
                if (!this.recoveryCuePlayed) {
                    this.recoveryCuePlayed = true;
                    if (!this.playCue('recovery_breathe_in_hold')) {
                        this.speak('Breathe in and hold');
                    }
                }
                this.startRecoveryPhase();
            }
        }, 100);
    }
    
    startRecoveryPhase() {
        this.sessionState = 'recovery';
        this.timeRemaining = 10;
        
        this.buttonText.textContent = 'Recovery Breath';
        this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
        
        const startTime = Date.now();
        const totalTime = this.timeRemaining;

        this.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            this.timeRemaining = totalTime - elapsed;
            
            if (this.timeRemaining < 0) this.timeRemaining = 0;
            this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timer);
                this.nextCycle();
            }
        }, 100);
    }
    
    nextCycle() {
        this.currentCycle++;
        this.currentBreath = 0;
        
        if (this.currentCycle >= this.exercises[this.currentExercise].cycles.length) {
            this.finishSession();
            return;
        }
        
    this.timerDisplay.classList.remove('visible');
    this.playCue('next_cycle');
        
        setTimeout(() => {
            this.sessionState = 'breathing';
            this.buttonText.textContent = 'Ready';
        }, 4000);
    }
    
    finishSession() {
        this.sessionState = 'finished';
        this.timerDisplay.classList.remove('visible');
        if (!this.playCue('session_finished')) {
            this.speak('Session finished - well done');
        }
        this.vibrate([100, 80, 100, 80, 200]); // celebration vibration

        // Record session in history
        this.recordSession();
        
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
        const startTime = Date.now();
        const totalTime = this.timeRemaining;

        if (this.sessionState === 'holding') {
            this.timer = setInterval(() => {
                if (this.isPaused) return;
                
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                this.timeRemaining = totalTime - elapsed;
                if (this.timeRemaining < 0) this.timeRemaining = 0;
                this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
                
                if (this.timeRemaining <= 0) {
                    clearInterval(this.timer);
                    // Play cue right as hold ends (before recovery breath starts)
                    if (!this.recoveryCuePlayed) {
                        this.recoveryCuePlayed = true;
                        if (!this.playCue('recovery_breathe_in_hold')) {
                            this.speak('Breathe in and hold');
                        }
                    }
                    this.startRecoveryPhase();
                }
            }, 100);
        } else if (this.sessionState === 'recovery') {
            this.timer = setInterval(() => {
                if (this.isPaused) return;
                
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                this.timeRemaining = totalTime - elapsed;
                if (this.timeRemaining < 0) this.timeRemaining = 0;
                this.timerDisplay.textContent = this.formatTime(this.timeRemaining);
                
                if (this.timeRemaining <= 0) {
                    clearInterval(this.timer);
                    this.nextCycle();
                }
            }, 100);
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
        // Update lists and audio helper when opening
        this.updateSettingsExerciseList();
        this.checkForAudioFiles();
    }
    
    openCreateExercise() {
        this.closeModal(this.settingsModal);
        this.lastFocusedElement = document.activeElement;
        this.editingExerciseKey = null; // new exercise by default
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
            this.settings.soundVolume = this.soundVolume.value;
            this.soundVolumeValue.textContent = `${this.soundVolume.value}%`;
            // apply to any loaded audio cues
            if (this.audio && this.audio.cues) {
                Object.values(this.audio.cues).forEach(a => { try { a.volume = this.settings.soundVolume / 100; } catch(_){} });
            }
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
        
        const rawName = this.exerciseNameInput.value.trim();
        // Sanitize exercise name to prevent XSS
        const name = rawName.replace(/[<>&"']/g, '').trim().substring(0, 100);
        const cycleCount = parseInt(this.cycleCountInput.value);
        
        if (!name) return;
        
        const cycles = [];
        for (let i = 0; i < cycleCount; i++) {
            const breaths = parseInt(document.querySelector(`input[name="breaths-${i}"]`).value);
            const holdTime = parseInt(document.querySelector(`input[name="hold-${i}"]`).value);
            cycles.push({ breaths, holdTime });
        }
        
        // slugify and ensure unique key
        const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let newKey = slugify(name);
        if (!newKey) newKey = `exercise-${Date.now()}`;

        // If editing an existing exercise
        if (this.editingExerciseKey) {
            // if name changed and key collides with another, ensure uniqueness
            if (newKey !== this.editingExerciseKey && this.exercises[newKey]) {
                let i = 1;
                while (this.exercises[`${newKey}-${i}`]) i++;
                newKey = `${newKey}-${i}`;
            }
            // delete old key if changed
            if (newKey !== this.editingExerciseKey) {
                delete this.exercises[this.editingExerciseKey];
            }
        } else {
            // creating new - ensure unique
            if (this.exercises[newKey]) {
                let i = 1;
                while (this.exercises[`${newKey}-${i}`]) i++;
                newKey = `${newKey}-${i}`;
            }
        }

        this.exercises[newKey] = { name, cycles };

        this.saveCustomExercises();
        // update UI lists and dropdown
        this.updateExerciseDropdown();
        this.updateSettingsExerciseList();
        this.selectExercise(newKey);
        this.closeModal(this.createExerciseModal);

        // Reset form
        this.exerciseForm.reset();
        this.cycleCountInput.value = 3;
        this.generateCycleInputs();
        this.editingExerciseKey = null;
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
        // Also refresh settings list if visible
        if (document.getElementById('customExerciseList')) this.updateSettingsExerciseList();
    }

    updateSettingsExerciseList() {
        const container = document.getElementById('customExerciseList');
        if (!container) return;
        container.innerHTML = '';

        const keys = Object.keys(this.exercises).filter(k => k !== 'default');
        if (keys.length === 0) {
            container.innerHTML = '<div style="color:#6b7280; font-size:13px">No custom exercises yet.</div>';
            return;
        }

        keys.forEach(key => {
            const ex = this.exercises[key];
            const item = document.createElement('div');
            item.className = 'settings-exercise-item';

            const left = document.createElement('div');
            left.className = 'settings-exercise-info';
            
            const title = document.createElement('div');
            title.className = 'settings-exercise-title';
            title.textContent = ex.name;
            
            const meta = document.createElement('div');
            meta.className = 'settings-exercise-meta';
            meta.textContent = `${ex.cycles.length} cycles · ${ex.cycles.map(c=>c.breaths+'b/'+c.holdTime+'s').join(' · ')}`;
            
            left.appendChild(title);
            left.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'settings-exercise-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'icon-button';
            editBtn.title = 'Edit';
            editBtn.innerHTML = '<i data-lucide="edit" aria-hidden="true"></i>';
            editBtn.addEventListener('click', () => this.openEditExercise(key));

            const dupBtn = document.createElement('button');
            dupBtn.className = 'icon-button';
            dupBtn.title = 'Duplicate';
            dupBtn.innerHTML = '<i data-lucide="copy" aria-hidden="true"></i>';
            dupBtn.addEventListener('click', () => this.duplicateExercise(key));

            const delBtn = document.createElement('button');
            delBtn.className = 'icon-button';
            delBtn.title = 'Delete';
            delBtn.innerHTML = '<i data-lucide="trash" aria-hidden="true"></i>';
            delBtn.addEventListener('click', () => this.showDeleteConfirmation(key));

            actions.appendChild(editBtn);
            actions.appendChild(dupBtn);
            actions.appendChild(delBtn);

            item.appendChild(left);
            item.appendChild(actions);

            container.appendChild(item);
        });

        // re-render icons inside list
        lucide.createIcons();
    }

    showDeleteConfirmation(key) {
        this.pendingDeleteKey = key;
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.classList.add('active');
            this.confirmDeleteBtn && this.confirmDeleteBtn.focus();
        } else {
            // fallback
            this.deleteExercise(key);
        }
    }

    closeDeleteConfirmation() {
        if (this.deleteConfirmModal) this.deleteConfirmModal.classList.remove('active');
        this.pendingDeleteKey = null;
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
            this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
        }
    }

    confirmDeleteExercise() {
        if (!this.pendingDeleteKey) return this.closeDeleteConfirmation();
        const key = this.pendingDeleteKey;
        this.deleteExerciseNow(key);
        this.closeDeleteConfirmation();
    }

    deleteExerciseNow(key) {
        if (!this.exercises[key]) return;
        delete this.exercises[key];
        this.saveCustomExercises();
        this.updateExerciseDropdown();
        this.updateSettingsExerciseList();
        if (this.currentExercise === key) this.selectExercise('default');
    }

    // replace previous deleteExercise which used confirm()
    deleteExercise(key) {
        // Deprecated - kept for compatibility. Use showDeleteConfirmation instead.
        this.showDeleteConfirmation(key);
    }

    // Attempt to detect audio files in the Audio/ folder. If found, enable music controls.
    async checkForAudioFiles() {
        // candidate filenames to try
        const candidates = [
            'Audio/ambient.mp3',
            'Audio/ambient.ogg',
            'Audio/music.mp3',
            'Audio/music.ogg'
        ];
        let found = false;
        for (const path of candidates) {
            try {
                const resp = await fetch(path, { method: 'HEAD' });
                if (resp && resp.ok) {
                    found = true;
                    break;
                }
            } catch (e) {
                // try full GET as some servers don't allow HEAD
                try {
                    const r2 = await fetch(path);
                    if (r2 && r2.ok) { found = true; break; }
                } catch (err) {}
            }
        }

        if (found) {
            if (this.musicSettingGroup) this.musicSettingGroup.style.display = '';
            const helper = document.getElementById('musicHelper');
            if (helper) helper.textContent = 'Audio files detected — music control enabled.';
            // ensure UI matches stored setting
            // this.soundVolume && (this.soundVolume.disabled = false); // No longer disabling volume
        } else {
            if (this.musicSettingGroup) this.musicSettingGroup.style.display = '';
            const helper = document.getElementById('musicHelper');
            if (helper) helper.textContent = 'No background music files detected. Add files to Audio/ to enable music.';
            // this.soundVolume && (this.soundVolume.disabled = true); // No longer disabling volume
        }
    }

    openEditExercise(key) {
        const ex = this.exercises[key];
        if (!ex) return;
        this.editingExerciseKey = key;
        // Close settings and open create modal prefilled
        this.closeModal(this.settingsModal);
        this.createExerciseModal.classList.add('active');
        this.exerciseNameInput.value = ex.name;
        this.cycleCountInput.value = ex.cycles.length;
        this.generateCycleInputs();
        // fill cycles
        ex.cycles.forEach((c, i) => {
            const breathsInput = document.querySelector(`input[name="breaths-${i}"]`);
            const holdInput = document.querySelector(`input[name="hold-${i}"]`);
            if (breathsInput) breathsInput.value = c.breaths;
            if (holdInput) holdInput.value = c.holdTime;
        });
        this.closeCreateExercise.focus();
    }

    duplicateExercise(key) {
        const ex = this.exercises[key];
        if (!ex) return;
        const baseName = this.sanitize(`${ex.name} (copy)`);
        const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let newKey = slugify(baseName);
        if (!newKey) newKey = `exercise-${Date.now()}`;
        if (this.exercises[newKey]) {
            let i = 1;
            while (this.exercises[`${newKey}-${i}`]) i++;
            newKey = `${newKey}-${i}`;
        }
        this.exercises[newKey] = { name: baseName, cycles: JSON.parse(JSON.stringify(ex.cycles)) };
        this.saveCustomExercises();
        this.updateExerciseDropdown();
        this.updateSettingsExerciseList();
    }

    // ===================
    // Haptic Feedback
    // ===================
    vibrate(pattern) {
        if (!this.settings.hapticFeedback) return;
        if ('vibrate' in navigator) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    }

    // ===================
    // Dark Mode
    // ===================
    toggleDarkMode() {
        this.settings.darkMode = this.darkModeToggle.checked;
        document.body.classList.toggle('dark-mode', this.settings.darkMode);
        // Update theme-color meta tag
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', this.settings.darkMode ? '#0f172a' : '#1e3a8a');
        this.saveSettings();
    }

    // ===================
    // Session History
    // ===================
    recordSession() {
        const exercise = this.exercises[this.currentExercise];
        const durationMs = Date.now() - (this.sessionStartTime || Date.now());
        const durationSec = Math.round(durationMs / 1000);
        
        const record = {
            id: Date.now(),
            date: new Date().toISOString(),
            exerciseName: exercise ? exercise.name : 'Unknown',
            exerciseKey: this.currentExercise,
            cycles: exercise ? exercise.cycles.length : 0,
            durationSeconds: durationSec
        };
        
        this.history.unshift(record);
        // Keep last 100 sessions
        if (this.history.length > 100) this.history.length = 100;
        this.saveHistory();
    }

    saveHistory() {
        try {
            localStorage.setItem('breathingAppHistory', JSON.stringify(this.history));
        } catch (e) {}
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('breathingAppHistory');
            if (saved) {
                this.history = JSON.parse(saved);
                if (!Array.isArray(this.history)) this.history = [];
            }
        } catch (e) {
            this.history = [];
        }
    }

    openHistory() {
        this.lastFocusedElement = document.activeElement;
        this.renderHistory();
        this.historyModal.classList.add('active');
        if (this.closeHistoryBtn) this.closeHistoryBtn.focus();
    }

    renderHistory() {
        // Update stats
        const totalSessions = this.history.length;
        const totalSeconds = this.history.reduce((sum, h) => sum + (h.durationSeconds || 0), 0);
        const totalMinutes = Math.round(totalSeconds / 60);
        const streak = this.calculateStreak();

        if (this.totalSessionsEl) this.totalSessionsEl.textContent = totalSessions;
        if (this.totalMinutesEl) this.totalMinutesEl.textContent = totalMinutes;
        if (this.currentStreakEl) this.currentStreakEl.textContent = streak;

        // Render list
        if (!this.historyList) return;
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="history-empty">No sessions recorded yet. Complete an exercise to see your history.</div>';
            return;
        }

        this.historyList.innerHTML = '';
        this.history.forEach(record => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const dateObj = new Date(record.date);
            const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            const mins = Math.floor((record.durationSeconds || 0) / 60);
            const secs = (record.durationSeconds || 0) % 60;
            const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

            item.innerHTML = `
                <div class="history-item-info">
                    <div class="history-item-name">${this.escapeHtml(record.exerciseName || 'Unknown')}</div>
                    <div class="history-item-date">${dateStr} at ${timeStr} · ${record.cycles || 0} cycles</div>
                </div>
                <div class="history-item-duration">${durationStr}</div>
            `;
            this.historyList.appendChild(item);
        });
    }

    calculateStreak() {
        if (this.history.length === 0) return 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get unique dates (as day strings)
        const uniqueDays = [...new Set(this.history.map(h => {
            const d = new Date(h.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }))].sort((a, b) => b - a); // newest first

        let streak = 0;
        const oneDay = 86400000;
        let expectedDay = today.getTime();

        for (const day of uniqueDays) {
            if (day === expectedDay) {
                streak++;
                expectedDay -= oneDay;
            } else if (day === expectedDay - oneDay) {
                // Allow checking yesterday if today not yet done
                if (streak === 0) {
                    expectedDay = day;
                    streak++;
                    expectedDay -= oneDay;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        return streak;
    }

    clearHistory() {
        if (!confirm('Clear all session history? This cannot be undone.')) return;
        this.history = [];
        this.saveHistory();
        this.renderHistory();
    }

    // ===================
    // Input Sanitization
    // ===================
    sanitize(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>&"']/g, (c) => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
        }[c] || c)).trim().substring(0, 100);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BreathingApp();
});

// ===========================
// Settings persistence helpers
// ===========================
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
            if (typeof parsed.soundVolume === 'number') this.settings.soundVolume = parsed.soundVolume;
            if (typeof parsed.darkMode === 'boolean') this.settings.darkMode = parsed.darkMode;
            if (typeof parsed.hapticFeedback === 'boolean') this.settings.hapticFeedback = parsed.hapticFeedback;
        }
    } catch (e) {}
    // Reflect settings in UI
    if (this.speechVolume) {
        this.speechVolume.value = this.settings.speechVolume;
        this.speechVolumeValue.textContent = `${this.settings.speechVolume}%`;
    }
    if (this.soundVolume) {
        this.soundVolume.value = this.settings.soundVolume;
        this.soundVolumeValue.textContent = `${this.settings.soundVolume}%`;
    }
    // Apply dark mode on load
    if (this.settings.darkMode) {
        document.body.classList.add('dark-mode');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', '#0f172a');
    }
    if (this.darkModeToggle) this.darkModeToggle.checked = this.settings.darkMode;
    if (this.hapticToggle) this.hapticToggle.checked = this.settings.hapticFeedback;
    // Show music setting
    if (this.musicSettingGroup) {
        this.musicSettingGroup.style.display = '';
    }
};

// ==============
// Audio helpers
// ==============
BreathingApp.prototype.initAudio = function() {
    this.audio.files = {
        last_breath_now_hold: 'Audio/last-breathe_now-hold.mp3',
        start_session: 'Audio/three_two_one.mp3',
        recovery_breathe_in_hold: 'Audio/hold_for_10_seconds.mp3',
        next_cycle: 'Audio/next-cycle.mp3',
        start_hold: 'Audio/hold.mp3',
        session_finished: 'Audio/session-finished.mp3'
    };
};

BreathingApp.prototype.playCue = function(key) {
    const src = this.audio.files[key];
    if (!src) return false;
    if (!this.audio.cues[key]) {
        try {
            const a = new Audio(src);
            a.preload = 'auto';
            a.volume = this.settings.soundVolume / 100;
            this.audio.cues[key] = a;
        } catch (e) {
            return false;
        }
    }
    const audio = this.audio.cues[key];
    try {
        audio.currentTime = 0;
        audio.volume = this.settings.soundVolume / 100;
        const p = audio.play();
        if (p && typeof p.then === 'function') {
            p.catch(() => {
                // Audio play failed - try speech fallback
                this.speakFallback(key);
            });
        }
        return true;
    } catch (e) {
        this.speakFallback(key);
        return false;
    }
};

// Speech fallback when audio files are missing
BreathingApp.prototype.speakFallback = function(key) {
    const messages = {
        start_session: 'Three, two, one, begin',
        last_breath_now_hold: 'Last breath, now hold',
        recovery_breathe_in_hold: 'Breathe in and hold for ten seconds',
        next_cycle: 'Next cycle',
        session_finished: 'Session finished, well done'
    };
    if (messages[key]) this.speak(messages[key]);
};
