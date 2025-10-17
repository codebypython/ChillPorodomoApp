/**
 * AudioManager - Audio Playback Management
 * Handles background music, notification sounds, and custom audio
 */

import { storageManager } from './StorageManager.js';

export class AudioManager {
    constructor(settings) {
        this.settings = settings;
        this.audioContext = null;
        // Multi-track registry: id -> { audio, sourceNode, gainNode, url }
        this.tracks = new Map();
        this.currentMusicId = null; // legacy
        this.customSounds = new Map(); // Map of id -> Audio object
        this.notificationSounds = {};
        this.initPromise = this.initialize();
    }

    /**
     * Initialize Web Audio API and create notification sounds
     */
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createNotificationSounds();
            await this.loadCustomSounds();
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            return false;
        }
    }

    /**
     * Ensure audio context is initialized
     */
    async ensureInitialized() {
        await this.initPromise;
    }

    /**
     * Create simple notification sounds using Web Audio API
     */
    createNotificationSounds() {
        this.notificationSounds = {
            workComplete: () => this.playWorkCompleteSound(),
            breakComplete: () => this.playBreakCompleteSound(),
            warning: () => this.playWarningSound(),
            tick: () => this.playTickSound()
        };
    }

    /**
     * Play work complete notification sound (pleasant ascending melody)
     */
    playWorkCompleteSound() {
        if (!this.audioContext || !this.settings.enableNotifications) return;

        const frequencies = [523, 659, 783, 1047]; // C, E, G, C (major chord)
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);

        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const noteGain = this.audioContext.createGain();

            oscillator.connect(noteGain);
            noteGain.connect(gainNode);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            const startTime = this.audioContext.currentTime + (index * 0.15);
            const duration = 0.4;

            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(this.settings.notificationVolume / 100 * 0.3, startTime + 0.05);
            noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }

    /**
     * Play break complete notification sound (softer bell-like sound)
     */
    playBreakCompleteSound() {
        if (!this.audioContext || !this.settings.enableNotifications) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        const startTime = this.audioContext.currentTime;
        const duration = 1.0;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.settings.notificationVolume / 100 * 0.2, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    /**
     * Play warning notification sound
     */
    playWarningSound() {
        if (!this.audioContext || !this.settings.enableNotifications) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 400;
        oscillator.type = 'square';

        const duration = 0.1;

        gainNode.gain.setValueAtTime(this.settings.notificationVolume / 100 * 0.1, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Play tick sound (subtle)
     */
    playTickSound() {
        if (!this.audioContext || !this.settings.enableNotifications) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        const duration = 0.05;

        gainNode.gain.setValueAtTime(this.settings.notificationVolume / 100 * 0.05, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Play notification by type
     */
    playNotification(type) {
        if (this.notificationSounds[type]) {
            this.notificationSounds[type]();
        }
    }

    // ===== Background Music Methods =====

    /**
     * Load custom sounds from IndexedDB
     */
    async loadCustomSounds() {
        try {
            const sounds = await storageManager.getAllItems('sounds');
            for (const sound of sounds) {
                this.customSounds.set(sound.id, sound);
            }
        } catch (error) {
            console.error('Error loading custom sounds:', error);
        }
    }

    /**
     * Reload custom sounds from IndexedDB
     */
    async reloadCustomSounds() {
        this.customSounds.clear();
        await this.loadCustomSounds();
    }

    /**
     * Start background music
     */
    async startBackgroundMusic(musicId = null) {
        if (!this.settings.enableBackgroundMusic) return;

        try {
            // Determine selected tracks (multi) or fallback to legacy single
            const selections = Array.isArray(this.settings.selectedMusicTracks) && this.settings.selectedMusicTracks.length > 0
                ? this.settings.selectedMusicTracks
                : (this.settings.backgroundMusicType && this.settings.backgroundMusicType !== 'none'
                    ? [{ id: this.settings.backgroundMusicType, volume: this.settings.backgroundMusicVolume, name: 'Track' }]
                    : []);

            // Start each selected track
            for (const sel of selections) {
                const id = parseInt(sel.id);
                const sound = this.customSounds.get(id);
                if (sound) {
                    await this.ensureTrackPlaying(id, sound, sel.volume);
                }
            }
        } catch (error) {
            console.error('Background music failed to start:', error);
        }
    }

    // Create or start a track with gain control and looping
    async ensureTrackPlaying(id, sound, volumePercent) {
        const existing = this.tracks.get(id);
        if (existing && existing.audio) {
            // just ensure playing and volume
            existing.audio.loop = true;
            existing.audio.volume = (typeof volumePercent === 'number' ? volumePercent : this.settings.backgroundMusicVolume) / 100;
            try { await existing.audio.play(); } catch {}
            if (existing.gainNode) {
                existing.gainNode.gain.setValueAtTime(existing.audio.volume, this.audioContext.currentTime);
            }
            return;
        }

        let audioURL;
        if (sound.data instanceof Blob) {
            audioURL = storageManager.createBlobURL(sound.data);
        } else if (typeof sound.data === 'string') {
            audioURL = sound.data;
        } else {
            console.error('Invalid sound data format');
            return;
        }

        const audio = new Audio(audioURL);
        audio.loop = true;
        // Base element volume used as starting point; main control via GainNode
        const vol = (typeof volumePercent === 'number' ? volumePercent : this.settings.backgroundMusicVolume) / 100;
        audio.volume = vol;

        // Hook restart safety
        audio.addEventListener('ended', () => {
            try { audio.currentTime = 0; audio.play().catch(() => {}); } catch {}
        });

        // Connect to Web Audio for per-track gain
        let sourceNode = null;
        let gainNode = null;
        try {
            if (this.audioContext && this.audioContext.state !== 'closed') {
                sourceNode = this.audioContext.createMediaElementSource(audio);
                gainNode = this.audioContext.createGain();
                gainNode.gain.value = vol;
                sourceNode.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
            }
        } catch (e) {
            console.warn('MediaElementSource connection failed (fallback to element volume):', e);
        }

        try { await audio.play(); } catch (e) { /* likely autoplay policy until first gesture */ }

        this.tracks.set(id, { audio, sourceNode, gainNode, url: audioURL });
    }

    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        // Stop and cleanup all tracks
        for (const [id, t] of this.tracks.entries()) {
            try {
                t.audio.pause();
                t.audio.currentTime = 0;
                if (t.url && t.url.startsWith('blob:')) {
                    try { URL.revokeObjectURL(t.url); } catch {}
                }
                if (t.sourceNode) { try { t.sourceNode.disconnect(); } catch {} }
                if (t.gainNode) { try { t.gainNode.disconnect(); } catch {} }
            } catch (error) {
                console.warn('Error stopping track', id, error);
            }
        }
        this.tracks.clear();
    }

    /**
     * Pause background music
     */
    pauseBackgroundMusic() {
        if (this.backgroundMusic && !this.backgroundMusic.paused) {
            try {
                this.backgroundMusic.pause();
            } catch (error) {
                console.warn('Error pausing background music:', error);
            }
        }
    }

    /**
     * Resume background music
     */
    resumeBackgroundMusic() {
        if (this.backgroundMusic && this.backgroundMusic.paused) {
            try {
                this.backgroundMusic.play().catch(console.warn);
            } catch (error) {
                console.warn('Error resuming background music:', error);
            }
        }
    }

    /**
     * Set background music volume
     */
    setBackgroundMusicVolume(volume) {
        this.settings.backgroundMusicVolume = volume;
        // Update default volume for any track that doesn't have a custom volume
        for (const [, t] of this.tracks.entries()) {
            if (t.gainNode) {
                t.gainNode.gain.setValueAtTime(volume / 100, this.audioContext.currentTime);
            } else {
                t.audio.volume = volume / 100;
            }
        }
    }

    /**
     * Toggle background music on/off
     */
    toggleBackgroundMusic() {
        if (this.settings.enableBackgroundMusic) {
            this.stopBackgroundMusic();
            this.settings.enableBackgroundMusic = false;
        } else {
            this.settings.enableBackgroundMusic = true;
            this.startBackgroundMusic();
        }
        this.settings.save();
    }

    /**
     * Get list of available background music (custom sounds)
     */
    getAvailableMusic() {
        return Array.from(this.customSounds.values());
    }

    /**
     * Add/remove/update a specific music track by id
     */
    async addTrackById(id, volumePercent) {
        const sound = this.customSounds.get(parseInt(id));
        if (!sound) return;
        await this.ensureTrackPlaying(parseInt(id), sound, volumePercent);
    }

    removeTrackById(id) {
        const t = this.tracks.get(parseInt(id));
        if (t) {
            try { t.audio.pause(); } catch {}
            try { if (t.sourceNode) t.sourceNode.disconnect(); } catch {}
            try { if (t.gainNode) t.gainNode.disconnect(); } catch {}
            try { if (t.url && t.url.startsWith('blob:')) URL.revokeObjectURL(t.url); } catch {}
        }
        this.tracks.delete(parseInt(id));
    }

    setTrackVolume(id, volumePercent) {
        const t = this.tracks.get(parseInt(id));
        if (!t) return;
        const v = (volumePercent || 0) / 100;
        if (t.gainNode) {
            try { t.gainNode.gain.setValueAtTime(v, this.audioContext.currentTime); } catch {}
        } else if (t.audio) {
            t.audio.volume = v;
        }
    }

    resumeAll() {
        for (const [, t] of this.tracks.entries()) {
            try { t.audio.play().catch(() => {}); } catch {}
        }
        try { if (this.audioContext && this.audioContext.state === 'suspended') this.audioContext.resume(); } catch {}
    }

    /**
     * Check if music is currently playing
     */
    isPlaying() {
        return this.backgroundMusic && !this.backgroundMusic.paused;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopBackgroundMusic();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.customSounds.clear();
    }
}

