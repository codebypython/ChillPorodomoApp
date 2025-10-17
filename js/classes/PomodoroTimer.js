/**
 * PomodoroTimer - Core Timer Logic
 * Manages timer state, sessions, and statistics
 */

import { storageManager } from './StorageManager.js';

export class PomodoroTimer {
    constructor(settings, audioManager) {
        this.settings = settings;
        this.audioManager = audioManager;

        // Timer state
        this.currentTime = 0; // in seconds
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'work'; // 'work', 'shortBreak', 'longBreak'
        this.completedPomodoros = 0;
        this.totalWorkTime = 0;
        this.totalBreakTime = 0;
        this.currentStreak = 0;
        this.sessionHistory = [];
        this.startTime = null;
        this.timerInterval = null;

        // Load saved state
        this.loadState();

        // UI elements
        this.timeDisplay = document.getElementById('timeDisplay');
        this.sessionTypeDisplay = document.getElementById('sessionType');
        this.sessionCountDisplay = document.getElementById('sessionCount');
        this.progressCircle = document.getElementById('progressCircle');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
    }

    /**
     * Load saved state from storage
     */
    loadState() {
        const savedState = storageManager.getTimerState();
        if (savedState) {
            this.completedPomodoros = savedState.completedPomodoros || 0;
            this.totalWorkTime = savedState.totalWorkTime || 0;
            this.totalBreakTime = savedState.totalBreakTime || 0;
            this.currentStreak = savedState.currentStreak || 0;
            this.sessionHistory = savedState.sessionHistory || [];
        }

        // Always start with work session at default duration
        this.setSessionTime();
    }

    /**
     * Save current state to storage
     */
    saveState() {
        const state = {
            completedPomodoros: this.completedPomodoros,
            totalWorkTime: this.totalWorkTime,
            totalBreakTime: this.totalBreakTime,
            currentStreak: this.currentStreak,
            sessionHistory: this.sessionHistory
        };
        storageManager.saveTimerState(state);
    }

    /**
     * Start timer
     */
    start() {
        if (this.currentTime <= 0) {
            this.setSessionTime();
        }

        // Clear any existing interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();

        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);

        this.updateControls();
        this.showNotification('Timer đã bắt đầu!', 'success');
    }

    /**
     * Pause timer
     */
    pause() {
        this.isRunning = false;
        this.isPaused = true;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.updateControls();
        this.showNotification('Timer đã tạm dừng', 'warning');
    }

    /**
     * Reset timer to current session duration
     */
    reset() {
        this.isRunning = false;
        this.isPaused = false;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.setSessionTime();
        this.updateDisplay();
        this.updateControls();

        this.showNotification('Timer đã được đặt lại', 'info');
    }

    /**
     * Skip to next session
     */
    skip() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.isRunning = false;
        this.currentTime = 0;

        this.complete();
        this.showNotification('Đã bỏ qua phiên hiện tại', 'info');
    }

    /**
     * Timer tick (every second)
     */
    tick() {
        this.currentTime--;

        if (this.currentTime <= 0) {
            this.complete();
        }

        this.updateDisplay();
    }

    /**
     * Complete current session
     */
    complete() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.isRunning = false;

        // Calculate actual duration
        const totalSessionTime = this.getSessionDuration() * 60;
        const actualDuration = totalSessionTime - this.currentTime;
        const durationInMinutes = Math.round(actualDuration / 60);

        // Save session to history
        const session = {
            id: Date.now(),
            type: this.currentSession,
            duration: durationInMinutes,
            completed: this.currentTime <= 0,
            timestamp: new Date().toISOString(),
            workDuration: this.settings.workDuration
        };

        const newState = storageManager.addSession(session);
        this.completedPomodoros = newState.completedPomodoros;
        this.totalWorkTime = newState.totalWorkTime;
        this.totalBreakTime = newState.totalBreakTime;
        this.currentStreak = newState.currentStreak;
        this.sessionHistory = newState.sessionHistory;

        // Play notification sound
        if (this.currentSession === 'work') {
            this.audioManager.playNotification('workComplete');
        } else {
            this.audioManager.playNotification('breakComplete');
        }

        // Move to next session
        this.moveToNextSession();

        this.updateDisplay();
        this.updateControls();
    }

    /**
     * Move to next session type
     */
    moveToNextSession() {
        if (this.currentSession === 'work') {
            // Check if it's time for long break
            const completedInCycle = this.completedPomodoros % this.settings.longBreakInterval;
            if (completedInCycle === 0 && this.completedPomodoros > 0) {
                this.currentSession = 'longBreak';
                this.showNotification('Nghỉ dài! Bạn đã hoàn thành một chu kỳ 🎉', 'success');
            } else {
                this.currentSession = 'shortBreak';
                this.showNotification('Nghỉ ngắn! Thư giãn nhé 😊', 'info');
            }
        } else {
            this.currentSession = 'work';
            this.showNotification('Trở lại làm việc! Tập trung nào 💪', 'info');
        }

        this.setSessionTime();

        // Auto-start if enabled
        if ((this.currentSession === 'work' && this.settings.autoStartPomodoros) ||
            (this.currentSession !== 'work' && this.settings.autoStartBreaks)) {
            setTimeout(() => this.start(), 2000);
        }
    }

    /**
     * Set timer to current session duration
     */
    setSessionTime() {
        this.currentTime = this.getSessionDuration() * 60;
    }

    /**
     * Get current session duration in minutes
     */
    getSessionDuration() {
        return this.settings.getSessionDuration(this.currentSession);
    }

    /**
     * Get current session name
     */
    getSessionName() {
        return this.settings.getSessionName(this.currentSession);
    }

    /**
     * Set quick timer
     */
    setQuickTimer(minutes, sessionType = 'work') {
        this.reset();
        this.currentTime = minutes * 60;
        this.currentSession = sessionType;
        this.updateDisplay();
        this.showNotification(`Đặt timer ${minutes} phút`, 'success');
    }

    /**
     * Update display
     */
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (this.timeDisplay) {
            this.timeDisplay.textContent = timeString;
        }

        if (this.sessionTypeDisplay) {
            this.sessionTypeDisplay.textContent = this.getSessionName();
        }

        if (this.sessionCountDisplay) {
            const sessionInCycle = (this.completedPomodoros % this.settings.longBreakInterval) + 1;
            this.sessionCountDisplay.textContent = sessionInCycle;
        }

        // Update progress circle
        this.updateProgressCircle();

        // Update page title
        if (this.isRunning) {
            document.title = `${timeString} - ${this.getSessionName()} - ChillPomodoro`;
        } else {
            document.title = 'ChillPomodoro - Focus & Relax';
        }
    }

    /**
     * Update progress circle
     */
    updateProgressCircle() {
        if (!this.progressCircle) return;

        const totalTime = this.getSessionDuration() * 60;
        const progress = (totalTime - this.currentTime) / totalTime;
        const circumference = 2 * Math.PI * 120; // r = 120

        const strokeDasharray = circumference * progress;
        this.progressCircle.style.strokeDasharray = `${strokeDasharray} ${circumference}`;

        // Add pulse animation if running
        const timerCircle = this.progressCircle.closest('.timer-circle');
        if (timerCircle) {
            if (this.settings.enableAnimations && this.isRunning) {
                timerCircle.classList.add('timer-pulse');
            } else {
                timerCircle.classList.remove('timer-pulse');
            }
        }
    }

    /**
     * Update control buttons
     */
    updateControls() {
        if (!this.startBtn || !this.pauseBtn) return;

        if (this.isRunning) {
            this.startBtn.style.display = 'none';
            this.pauseBtn.style.display = 'flex';
        } else {
            this.startBtn.style.display = 'flex';
            this.pauseBtn.style.display = 'none';

            const btnText = this.startBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = this.isPaused ? 'Tiếp tục' : 'Bắt đầu';
            }
        }
    }

    /**
     * Handle visibility change (tab switching)
     */
    handleVisibilityChange() {
        if (document.hidden && this.isRunning) {
            localStorage.setItem('chillpomodoro-hidden-time', Date.now().toString());
        } else if (!document.hidden && this.isRunning) {
            const hiddenTime = localStorage.getItem('chillpomodoro-hidden-time');
            if (hiddenTime) {
                const timePassed = Math.floor((Date.now() - parseInt(hiddenTime)) / 1000);
                this.currentTime = Math.max(0, this.currentTime - timePassed);
                localStorage.removeItem('chillpomodoro-hidden-time');

                if (this.currentTime <= 0) {
                    this.complete();
                } else {
                    this.updateDisplay();
                }
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');

        if (!notification || !text) return;

        text.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            completedPomodoros: this.completedPomodoros,
            totalWorkTime: this.totalWorkTime,
            totalBreakTime: this.totalBreakTime,
            currentStreak: this.currentStreak,
            sessionHistory: this.sessionHistory
        };
    }

    /**
     * Format time for display
     */
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }
}

