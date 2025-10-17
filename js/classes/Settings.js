/**
 * Settings - Application Settings Management
 */

import { storageManager } from './StorageManager.js';

export class Settings {
    constructor() {
        // Default settings
        this.workDuration = 25; // minutes
        this.shortBreakDuration = 5; // minutes
        this.longBreakDuration = 15; // minutes
        this.longBreakInterval = 4; // sessions before long break
        this.enableNotifications = true;
        this.notificationVolume = 70;
        this.enableBackgroundMusic = false;
        this.backgroundMusicVolume = 50; // Master volume for legacy single-track
        this.backgroundMusicType = 'none'; // Legacy single-track id (kept for compatibility)
        // New multi-track selection
        this.selectedMusicIds = []; // array of sound ids (as strings)
        this.selectedMusicVolumes = {}; // { [id: string]: number(0-100) }
        this.backgroundType = 'none'; // Default no background
        this.backgroundOpacity = 80;
        this.enableAnimations = true;
        this.darkMode = false;
        this.autoStartBreaks = false;
        this.autoStartPomodoros = false;
    }

    /**
     * Load settings from storage
     */
    load() {
        const saved = storageManager.getSettings();
        if (saved) {
            Object.assign(this, saved);
        }
        this.apply();
        return this;
    }

    /**
     * Save settings to storage
     */
    save() {
        const settingsData = {
            workDuration: this.workDuration,
            shortBreakDuration: this.shortBreakDuration,
            longBreakDuration: this.longBreakDuration,
            longBreakInterval: this.longBreakInterval,
            enableNotifications: this.enableNotifications,
            notificationVolume: this.notificationVolume,
            enableBackgroundMusic: this.enableBackgroundMusic,
            backgroundMusicVolume: this.backgroundMusicVolume,
            backgroundMusicType: this.backgroundMusicType,
            selectedMusicIds: this.selectedMusicIds,
            selectedMusicVolumes: this.selectedMusicVolumes,
            backgroundType: this.backgroundType,
            backgroundOpacity: this.backgroundOpacity,
            enableAnimations: this.enableAnimations,
            darkMode: this.darkMode,
            autoStartBreaks: this.autoStartBreaks,
            autoStartPomodoros: this.autoStartPomodoros
        };
        storageManager.saveSettings(settingsData);
        this.apply();
    }

    /**
     * Reset settings to defaults
     */
    reset() {
        const defaults = new Settings();
        Object.assign(this, defaults);
        this.save();
    }

    /**
     * Apply settings to DOM and environment
     */
    apply() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');

        // Update theme toggle icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.darkMode ? '☀️' : '🌙';
        }

        // Update background opacity CSS variable
        document.documentElement.style.setProperty('--background-opacity', (this.backgroundOpacity / 100).toString());

        // Update music toggle button state
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            const icon = musicToggle.querySelector('span');
            if (this.enableBackgroundMusic) {
                musicToggle.classList.add('active');
                icon.textContent = '🔊';
                musicToggle.title = 'Tắt nhạc nền';
            } else {
                musicToggle.classList.remove('active');
                icon.textContent = '🔇';
                musicToggle.title = 'Bật nhạc nền';
            }
        }
    }

    /**
     * Load settings into form inputs
     */
    loadToForm() {
        // Timer settings
        this.setInputValue('workDuration', this.workDuration);
        this.setInputValue('shortBreakDuration', this.shortBreakDuration);
        this.setInputValue('longBreakDuration', this.longBreakDuration);
        this.setInputValue('longBreakInterval', this.longBreakInterval);

        // Audio settings
        this.setInputValue('enableNotifications', this.enableNotifications, 'checkbox');
        this.setInputValue('notificationVolume', this.notificationVolume);
        this.setInputValue('enableBackgroundMusic', this.enableBackgroundMusic, 'checkbox');
        this.setInputValue('backgroundMusicVolume', this.backgroundMusicVolume);
        // Multi-select music will be populated by main.js

        // Display settings
        this.setInputValue('backgroundType', this.backgroundType);
        this.setInputValue('backgroundOpacity', this.backgroundOpacity);

        // Behavior settings
        this.setInputValue('autoStartBreaks', this.autoStartBreaks, 'checkbox');
        this.setInputValue('autoStartPomodoros', this.autoStartPomodoros, 'checkbox');

        // Update display values
        this.updateDisplay('volumeDisplay', this.notificationVolume + '%');
        this.updateDisplay('musicVolumeDisplay', this.backgroundMusicVolume + '%');
        this.updateDisplay('opacityDisplay', this.backgroundOpacity + '%');
    }

    /**
     * Save settings from form inputs
     */
    saveFromForm() {
        // Timer settings
        this.workDuration = this.getInputValue('workDuration', 'number');
        this.shortBreakDuration = this.getInputValue('shortBreakDuration', 'number');
        this.longBreakDuration = this.getInputValue('longBreakDuration', 'number');
        this.longBreakInterval = this.getInputValue('longBreakInterval', 'number');

        // Audio settings
        this.enableNotifications = this.getInputValue('enableNotifications', 'checkbox');
        this.notificationVolume = this.getInputValue('notificationVolume', 'number');
        this.enableBackgroundMusic = this.getInputValue('enableBackgroundMusic', 'checkbox');
        this.backgroundMusicVolume = this.getInputValue('backgroundMusicVolume', 'number');
        // Multi-select handled in main.js, which updates selectedMusicIds/Volumes before save

        // Display settings
        this.backgroundType = this.getInputValue('backgroundType', 'text');
        this.backgroundOpacity = this.getInputValue('backgroundOpacity', 'number');

        // Behavior settings
        this.autoStartBreaks = this.getInputValue('autoStartBreaks', 'checkbox');
        this.autoStartPomodoros = this.getInputValue('autoStartPomodoros', 'checkbox');

        this.save();
    }

    /**
     * Helper: Set input value
     */
    setInputValue(id, value, type = 'text') {
        const element = document.getElementById(id);
        if (!element) return;

        if (type === 'checkbox') {
            element.checked = value;
        } else {
            element.value = value;
        }
    }

    /**
     * Helper: Get input value
     */
    getInputValue(id, type = 'text') {
        const element = document.getElementById(id);
        if (!element) return null;

        if (type === 'checkbox') {
            return element.checked;
        } else if (type === 'number') {
            return parseInt(element.value) || 0;
        } else {
            return element.value;
        }
    }

    /**
     * Helper: Update display element
     */
    updateDisplay(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Get session duration in minutes
     */
    getSessionDuration(sessionType) {
        switch (sessionType) {
            case 'work':
                return this.workDuration;
            case 'shortBreak':
                return this.shortBreakDuration;
            case 'longBreak':
                return this.longBreakDuration;
            default:
                return this.workDuration;
        }
    }

    /**
     * Get session name
     */
    getSessionName(sessionType) {
        switch (sessionType) {
            case 'work':
                return 'Làm việc';
            case 'shortBreak':
                return 'Nghỉ ngắn';
            case 'longBreak':
                return 'Nghỉ dài';
            default:
                return 'Làm việc';
        }
    }
}

