/**
 * AudioManager - Audio Playback Management
 * Handles background music, notification sounds, and custom audio
 */

import { storageManager } from './StorageManager.js';

export class AudioManager {
    constructor(settings) {
        this.settings = settings;
        this.audioContext = null;
        this.backgroundMusic = null;
        this.currentMusicId = null;
        this.customSounds = new Map(); // Map of id -> Audio object
        this.notificationSounds = {};
        // Multi-track mixing
        this.masterGain = null;
        this.tracks = new Map(); // id -> { element, sourceNode, gainNode, volume, isBlob, url }
        this.initPromise = this.initialize();
    }

    /**
     * Initialize Web Audio API and create notification sounds
     */
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.8; // default master
            this.masterGain.connect(this.audioContext.destination);
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

    // ===== Multi-track Mixing =====
    async addTrackFromSoundId(soundId, initialVolume = 80) {
        const sound = this.customSounds.get(parseInt(soundId));
        if (!sound) throw new Error('Sound not found');
        return this.addTrackFromData({ id: `sound-${sound.id}-${Date.now()}`, data: sound.data, initialVolume });
    }

    async addTrackFromData({ id, data, initialVolume = 80 }) {
        await this.ensureInitialized();

        // Resolve URL
        let url;
        let isBlob = false;
        if (data instanceof Blob) {
            url = storageManager.createBlobURL(data);
            isBlob = true;
        } else if (typeof data === 'string') {
            url = data;
        } else {
            throw new Error('Invalid sound data');
        }

        // Create media element + source node
        const element = new Audio(url);
        element.loop = true;
        element.crossOrigin = 'anonymous';

        let sourceNode;
        try {
            sourceNode = this.audioContext.createMediaElementSource(element);
        } catch (e) {
            // CORS or element reuse error fallback: play element unmanaged
            await element.play().catch(() => {});
            this.tracks.set(id, { element, sourceNode: null, gainNode: null, volume: initialVolume, isBlob, url });
            element.volume = initialVolume / 100;
            return id;
        }

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = initialVolume / 100;
        sourceNode.connect(gainNode);
        gainNode.connect(this.masterGain);

        await element.play().catch(() => {});

        this.tracks.set(id, { element, sourceNode, gainNode, volume: initialVolume, isBlob, url });
        return id;
    }

    removeTrack(id) {
        const track = this.tracks.get(id);
        if (!track) return;
        try {
            track.element.pause();
            track.element.currentTime = 0;
        } catch {}
        try {
            if (track.sourceNode) track.sourceNode.disconnect();
            if (track.gainNode) track.gainNode.disconnect();
        } catch {}
        if (track.isBlob && track.url?.startsWith('blob:')) {
            URL.revokeObjectURL(track.url);
        }
        this.tracks.delete(id);
    }

    setTrackVolume(id, volume) {
        const track = this.tracks.get(id);
        if (!track) return;
        track.volume = volume;
        if (track.gainNode) {
            track.gainNode.gain.value = volume / 100;
        } else if (track.element) {
            track.element.volume = volume / 100;
        }
    }

    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume / 100));
        }
    }

    listTracks() {
        return Array.from(this.tracks.entries()).map(([id, t]) => ({ id, volume: t.volume }));
    }

    async syncSelection(selectedIds = [], perTrackVolumes = {}) {
        await this.ensureInitialized();
        // Remove tracks not in selectedIds
        const selectedSet = new Set((selectedIds || []).map(x => x.toString()));
        Array.from(this.tracks.keys()).forEach(id => {
            // Only manage tracks created for settings selection (prefix 'sound-')
            if (id.startsWith('sound-') && !selectedSet.has(id.split('-')[1])) {
                this.removeTrack(id);
            }
        });

        // Add new tracks
        for (const sid of selectedSet) {
            const trackIdPrefix = `sound-${sid}`;
            const existing = Array.from(this.tracks.keys()).some(id => id.startsWith(trackIdPrefix));
            const vol = typeof perTrackVolumes[sid] === 'number' ? perTrackVolumes[sid] : 80;
            if (!existing) {
                await this.addTrackFromSoundId(sid, vol);
            } else {
                // Update volume
                const foundId = Array.from(this.tracks.keys()).find(id => id.startsWith(trackIdPrefix));
                if (foundId) this.setTrackVolume(foundId, vol);
            }
        }
    }

    /**
     * Start background music
     */
    async startBackgroundMusic(musicId = null) {
        if (!this.settings.enableBackgroundMusic) return;

        // Stop current music first
        this.stopBackgroundMusic();

        try {
            const idToPlay = musicId || this.currentMusicId || this.settings.backgroundMusicType;

            if (!idToPlay || idToPlay === 'none') {
                return;
            }

            // Check if it's a custom sound
            const customSound = this.customSounds.get(parseInt(idToPlay));
            if (customSound) {
                await this.playCustomSound(customSound);
            } else {
                console.warn('No music to play');
            }

            this.currentMusicId = idToPlay;
        } catch (error) {
            console.error('Background music failed to start:', error);
        }
    }

    /**
     * Play custom sound from IndexedDB
     */
    async playCustomSound(sound) {
        let audioURL;

        if (sound.data instanceof Blob) {
            audioURL = storageManager.createBlobURL(sound.data);
        } else if (typeof sound.data === 'string' && sound.data.startsWith('data:')) {
            audioURL = sound.data;
        } else if (typeof sound.data === 'string' && sound.data.startsWith('http')) {
            audioURL = sound.data;
        } else {
            console.error('Invalid sound data format');
            return;
        }

        const audio = new Audio(audioURL);
        audio.loop = true;
        audio.volume = this.settings.backgroundMusicVolume / 100 * 0.4;

        try {
            await audio.play();
            this.backgroundMusic = audio;

            // Store Blob URL for cleanup if needed
            if (audioURL.startsWith('blob:')) {
                this.backgroundMusic._blobURL = audioURL;
            }
        } catch (error) {
            console.error('Error playing custom sound:', error);
            if (audioURL.startsWith('blob:')) {
                URL.revokeObjectURL(audioURL);
            }
        }
    }

    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            try {
                this.backgroundMusic.pause();
                this.backgroundMusic.currentTime = 0;

                // Clean up Blob URL if exists
                if (this.backgroundMusic._blobURL) {
                    URL.revokeObjectURL(this.backgroundMusic._blobURL);
                }
            } catch (error) {
                console.warn('Error stopping background music:', error);
            }
            this.backgroundMusic = null;
        }
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

        if (this.backgroundMusic) {
            this.backgroundMusic.volume = volume / 100 * 0.4;
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

