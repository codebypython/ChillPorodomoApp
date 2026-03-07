/**
 * PomodoroTimer - Core Timer Logic
 * Manages timer state, sessions, and statistics
 */

import { storageManager } from './StorageManager.js';
import { notificationService } from '../services/NotificationService.js';

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
        this.lastPersistedAt = 0;
        this.renderState = {};
        this.shouldResumeRunning = false;
        this.pendingExpiredRuntime = false;

        // Load saved state
        this.loadState();

        // UI elements
        this.timeDisplay = document.getElementById('timeDisplay');
        this.sessionTypeDisplay = document.getElementById('sessionType');
        this.sessionCountDisplay = document.getElementById('sessionCount');
        this.progressCircle = document.getElementById('progressCircle');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');

        if (this.pendingExpiredRuntime) {
            this.complete();
        } else if (this.shouldResumeRunning) {
            this.resumePersistedSession();
        }
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

            const runtime = savedState.runtime || {};
            this.currentSession = runtime.currentSession || this.currentSession;
            this.isPaused = Boolean(runtime.isPaused);

            if (typeof runtime.currentTime === 'number' && runtime.currentTime > 0) {
                this.currentTime = runtime.currentTime;
            }

            if (runtime.isRunning && runtime.lastTickAt) {
                const elapsedSeconds = Math.floor((Date.now() - runtime.lastTickAt) / 1000);
                this.currentTime = Math.max(0, (runtime.currentTime || 0) - elapsedSeconds);
                if (this.currentTime > 0) {
                    this.shouldResumeRunning = true;
                    this.isRunning = true;
                    this.isPaused = false;
                } else {
                    this.currentTime = 0;
                    this.pendingExpiredRuntime = true;
                }
            }
        }

        if (this.currentTime <= 0) {
            this.setSessionTime();
        }
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
            sessionHistory: this.sessionHistory,
            runtime: {
                currentTime: this.currentTime,
                isRunning: this.isRunning,
                isPaused: this.isPaused,
                currentSession: this.currentSession,
                lastTickAt: this.isRunning ? Date.now() : null,
                startedAt: this.startTime
            }
        };
        storageManager.saveTimerState(state);
        this.lastPersistedAt = Date.now();
    }

    persistRuntimeIfNeeded(force = false) {
        if (force || Date.now() - this.lastPersistedAt >= 15000) {
            this.saveState();
        }
    }

    resumePersistedSession() {
        this.startTime = Date.now();
        this.startInterval();
        this.updateControls();
        this.updateDisplay();
        this.emitTimerEvent('timer:resume', this.getSessionSnapshot());
    }

    startInterval() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    /**
     * Start timer
     */
    start(showNotification = true) {
        if (this.currentTime <= 0) {
            this.setSessionTime();
        }

        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.startInterval();

        this.updateControls();
        this.updateDisplay();
        this.saveState();
        if (showNotification) {
            this.showNotification('Timer đã bắt đầu!', 'success');
        }
        this.emitTimerEvent('timer:start', this.getSessionSnapshot());
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
        this.saveState();
        this.showNotification('Timer đã tạm dừng', 'warning');
        this.emitTimerEvent('timer:pause', this.getSessionSnapshot());
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
        this.saveState();

        this.showNotification('Timer đã được đặt lại', 'info');
        this.emitTimerEvent('timer:reset', this.getSessionSnapshot());
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
        this.saveState();

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
            return;
        }

        this.updateDisplay();
        this.persistRuntimeIfNeeded();
    }

    /**
     * Complete current session
     */
    complete() {
        const completedSessionType = this.currentSession;
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
            type: completedSessionType,
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
        if (completedSessionType === 'work') {
            this.audioManager.playNotification('workComplete');
        } else {
            this.audioManager.playNotification('breakComplete');
        }

        this.emitTimerEvent('timer:session-complete', {
            session,
            stats: this.getStatistics()
        });

        // Move to next session
        this.moveToNextSession();

        this.updateDisplay();
        this.updateControls();
        this.saveState();
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
            setTimeout(() => this.start(false), 2000);
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
        const sessionName = this.getSessionName();
        const sessionInCycle = (this.completedPomodoros % this.settings.longBreakInterval) + 1;

        if (this.timeDisplay && this.renderState.timeString !== timeString) {
            this.timeDisplay.textContent = timeString;
            this.renderState.timeString = timeString;
        }

        if (this.sessionTypeDisplay && this.renderState.sessionName !== sessionName) {
            this.sessionTypeDisplay.textContent = sessionName;
            this.renderState.sessionName = sessionName;
        }

        if (this.sessionCountDisplay && this.renderState.sessionInCycle !== sessionInCycle) {
            this.sessionCountDisplay.textContent = sessionInCycle;
            this.renderState.sessionInCycle = sessionInCycle;
        }

        // Update progress circle
        this.updateProgressCircle();

        // Update page title
        const nextTitle = this.isRunning
            ? `${timeString} - ${sessionName} - ChillPomodoro`
            : 'ChillPomodoro - Focus & Relax';
        if (this.renderState.title !== nextTitle) {
            document.title = nextTitle;
            this.renderState.title = nextTitle;
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
        if (this.renderState.strokeDasharray !== strokeDasharray) {
            this.renderState.strokeDasharray = strokeDasharray;
            requestAnimationFrame(() => {
                this.progressCircle.style.strokeDasharray = `${strokeDasharray} ${circumference}`;
            });
        }

        // Add pulse animation if running
        const timerCircle = this.progressCircle.closest('.timer-circle');
        if (timerCircle) {
            const shouldAnimate = this.settings.enableAnimations && this.isRunning;
            if (shouldAnimate && !this.renderState.timerPulseActive) {
                timerCircle.classList.add('timer-pulse');
                this.renderState.timerPulseActive = true;
            } else if (!shouldAnimate && this.renderState.timerPulseActive) {
                timerCircle.classList.remove('timer-pulse');
                this.renderState.timerPulseActive = false;
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
            this.saveState();
        } else if (!document.hidden && this.isRunning) {
            const savedState = storageManager.getTimerState();
            const lastTickAt = savedState?.runtime?.lastTickAt;
            if (lastTickAt) {
                const timePassed = Math.floor((Date.now() - parseInt(lastTickAt, 10)) / 1000);
                this.currentTime = Math.max(0, this.currentTime - timePassed);

                if (this.currentTime <= 0) {
                    this.complete();
                } else {
                    this.updateDisplay();
                    this.saveState();
                }
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        notificationService.show(message, type);
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

    getSessionSnapshot() {
        return {
            currentTime: this.currentTime,
            currentSession: this.currentSession,
            isRunning: this.isRunning,
            isPaused: this.isPaused
        };
    }

    emitTimerEvent(name, detail) {
        document.dispatchEvent(new CustomEvent(name, { detail }));
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

