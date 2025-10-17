/**
 * BackgroundManager - Background Video/Image Management
 * Handles custom backgrounds and viewport optimization
 */

import { storageManager } from './StorageManager.js';
import { viewportManager } from '../utils/viewport.js';

export class BackgroundManager {
    constructor(settings) {
        this.settings = settings;
        this.customBackgrounds = new Map(); // Map of id -> background data
        this.currentBackground = null;
        this.currentBlobURL = null;
        this.videoElement = document.getElementById('backgroundVideo');
        this.imageElement = document.getElementById('backgroundImage');
        this.initPromise = this.initialize();
    }

    /**
     * Initialize background manager
     */
    async initialize() {
        await this.loadCustomBackgrounds();
        this.setupVideoOptimization();
        this.applyBackground();
        return true;
    }

    /**
     * Setup video element optimization for mobile
     */
    setupVideoOptimization() {
        if (!this.videoElement) return;

        // Add mobile-specific attributes
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('webkit-playsinline', 'true');
        this.videoElement.setAttribute('x5-video-player-type', 'h5');
        this.videoElement.setAttribute('x5-video-player-fullscreen', 'true');

        // Prevent context menu on video
        this.videoElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Handle video errors
        this.videoElement.addEventListener('error', (e) => {
            console.error('Video playback error:', e);
            this.clearAllBackgrounds();
        });

        // Auto-play when loaded
        this.videoElement.addEventListener('loadeddata', () => {
            if (this.videoElement.classList.contains('active')) {
                this.videoElement.play().catch(console.warn);
            }
        });

        // Double-tap/double-click to toggle fullscreen background mode
        const bgLayers = document.querySelector('.background-layers');
        if (bgLayers) {
            let lastTap = 0;
            bgLayers.addEventListener('click', () => {
                const now = Date.now();
                if (now - lastTap < 350) {
                    this.toggleBackgroundOnlyMode();
                }
                lastTap = now;
            }, { passive: true });
            bgLayers.addEventListener('dblclick', () => this.toggleBackgroundOnlyMode());
        }
    }

    /**
     * Load custom backgrounds from IndexedDB
     */
    async loadCustomBackgrounds() {
        try {
            const animations = await storageManager.getAllItems('animations');
            for (const bg of animations) {
                this.customBackgrounds.set(bg.id, bg);
            }
        } catch (error) {
            console.error('Error loading custom backgrounds:', error);
        }
    }

    /**
     * Reload custom backgrounds from IndexedDB
     */
    async reloadCustomBackgrounds() {
        this.customBackgrounds.clear();
        await this.loadCustomBackgrounds();
    }

    /**
     * Apply background based on current settings
     */
    applyBackground(backgroundId = null) {
        // Clear all backgrounds first
        this.clearAllBackgrounds();

        const idToApply = backgroundId || this.settings.backgroundType;

        if (!idToApply || idToApply === 'none') {
            this.currentBackground = null;
            return;
        }

        // Check if it's a custom background
        const customBg = this.customBackgrounds.get(parseInt(idToApply));
        if (customBg) {
            this.applyCustomBackground(customBg);
        } else {
            console.warn('Background not found:', idToApply);
        }

        this.currentBackground = idToApply;
    }

    /**
     * Apply custom background (video or image)
     */
    async applyCustomBackground(background) {
        let mediaURL;

        // Get media URL from data
        if (background.data instanceof Blob) {
            mediaURL = storageManager.createBlobURL(background.data);
            this.currentBlobURL = mediaURL; // Store for cleanup
        } else if (typeof background.data === 'string' && background.data.startsWith('data:')) {
            mediaURL = background.data;
        } else if (typeof background.data === 'string' && background.data.startsWith('http')) {
            mediaURL = background.data;
        } else {
            console.error('Invalid background data format');
            return;
        }

        // Apply based on type
        if (background.type === 'video') {
            await this.setVideoBackground(mediaURL);
        } else if (background.type === 'image') {
            this.setImageBackground(mediaURL);
        }

        // Set opacity
        this.setBackgroundOpacity();
    }

    /**
     * Set video background
     */
    async setVideoBackground(url) {
        if (!this.videoElement) return;

        try {
            const source = this.videoElement.querySelector('source');
            if (source) {
                source.src = url;
            } else {
                this.videoElement.src = url;
            }

            this.videoElement.load();
            this.videoElement.classList.add('active');

            // Try to play
            await this.videoElement.play().catch((error) => {
                console.warn('Video autoplay prevented:', error);
                // On mobile, video might need user interaction to play
            });
        } catch (error) {
            console.error('Error setting video background:', error);
        }
    }

    /**
     * Set image background
     */
    setImageBackground(url) {
        if (!this.imageElement) return;

        this.imageElement.style.backgroundImage = `url("${url}")`;
        this.imageElement.classList.add('active');
    }

    /**
     * Clear all backgrounds
     */
    clearAllBackgrounds() {
        // Clear video
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.currentTime = 0;
            this.videoElement.classList.remove('active');
            const source = this.videoElement.querySelector('source');
            if (source) {
                source.src = '';
            }
        }

        // Clear image
        if (this.imageElement) {
            this.imageElement.style.backgroundImage = '';
            this.imageElement.classList.remove('active');
        }

        // Clean up Blob URL
        if (this.currentBlobURL) {
            URL.revokeObjectURL(this.currentBlobURL);
            this.currentBlobURL = null;
        }
    }

    /**
     * Set background opacity
     */
    setBackgroundOpacity() {
        const opacity = this.settings.backgroundOpacity / 100;
        document.documentElement.style.setProperty('--background-opacity', opacity.toString());

        // Update active background elements
        const elements = document.querySelectorAll('.background-video.active, .background-image.active');
        elements.forEach(el => {
            el.style.opacity = opacity;
        });
    }

    /**
     * Get list of available backgrounds
     */
    getAvailableBackgrounds() {
        return Array.from(this.customBackgrounds.values());
    }

    /**
     * Toggle background only mode
     */
    toggleBackgroundOnlyMode() {
        const isActive = document.body.classList.contains('background-only-mode');

        if (isActive) {
            this.exitBackgroundOnlyMode();
        } else {
            this.enterBackgroundOnlyMode();
        }
    }

    /**
     * Enter background only mode (hide UI, show only background)
     */
    enterBackgroundOnlyMode() {
        document.body.classList.add('background-only-mode');

        // Lock scroll
        viewportManager.lockBodyScroll();

        // Hide cursor after 3 seconds of inactivity
        let hideTimeout;
        const hideCursor = () => {
            if (document.body.classList.contains('background-only-mode')) {
                document.body.style.cursor = 'none';
            }
        };
        const showCursor = () => {
            if (document.body.classList.contains('background-only-mode')) {
                document.body.style.cursor = 'default';
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(hideCursor, 3000);
            }
        };

        document.addEventListener('mousemove', showCursor);
        hideTimeout = setTimeout(hideCursor, 3000);

        // Store handlers for cleanup
        this._cursorHandler = showCursor;
        this._hideTimeout = hideTimeout;

        // Update toggle button
        const bgToggle = document.getElementById('backgroundToggle');
        if (bgToggle) {
            bgToggle.classList.add('active');
        }

        // Try to enter fullscreen for immersive experience
        try {
            // Standard fullscreen for container
            const container = document.querySelector('.background-layers') || document.documentElement;
            viewportManager.requestFullscreen(container).catch(() => {
                // iOS Safari video-specific fullscreen
                if (this.videoElement && this.videoElement.webkitEnterFullscreen) {
                    try { this.videoElement.webkitEnterFullscreen(); } catch (_) {}
                }
            });
        } catch (_) {}
    }

    /**
     * Exit background only mode
     */
    exitBackgroundOnlyMode() {
        document.body.classList.remove('background-only-mode');

        // Unlock scroll
        viewportManager.unlockBodyScroll();

        // Restore cursor
        document.body.style.cursor = 'default';

        // Cleanup cursor handlers
        if (this._cursorHandler) {
            document.removeEventListener('mousemove', this._cursorHandler);
            this._cursorHandler = null;
        }
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
            this._hideTimeout = null;
        }

        // Update toggle button
        const bgToggle = document.getElementById('backgroundToggle');
        if (bgToggle) {
            bgToggle.classList.remove('active');
        }

        // Exit fullscreen if active
        try {
            if (viewportManager.isFullscreen()) {
                viewportManager.exitFullscreen().catch(() => {});
            }
        } catch (_) {}
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.clearAllBackgrounds();
        this.customBackgrounds.clear();
    }
}

