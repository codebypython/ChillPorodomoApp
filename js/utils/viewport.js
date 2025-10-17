/**
 * ViewportManager - Mobile Viewport Optimization
 * Handles dynamic viewport height, fullscreen API, and device detection
 */

export class ViewportManager {
    constructor() {
        this.init();
    }

    init() {
        this.setViewportHeight();
        this.setupEventListeners();
    }

    /**
     * Set CSS custom property for viewport height
     * Fixes issues with mobile browsers that have dynamic UI (address bar)
     */
    setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    /**
     * Setup event listeners for viewport changes
     */
    setupEventListeners() {
        // Update on resize
        window.addEventListener('resize', () => {
            this.setViewportHeight();
        });

        // Update on orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.setViewportHeight();
            }, 100);
        });

        // Update on scroll (for mobile browser UI hiding/showing)
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.setViewportHeight();
            }, 100);
        }, { passive: true });

        // Update on visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.setViewportHeight();
            }
        });
    }

    /**
     * Attempt to hide address bar on mobile
     */
    hideAddressBar() {
        if (!this.isMobile()) return;

        setTimeout(() => {
            window.scrollTo(0, 1);
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        }, 500);
    }

    /**
     * Check if device is mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Check if device is iOS
     */
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    /**
     * Check if device is Safari
     */
    isSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    /**
     * Lock body scroll (for overlays/modals)
     */
    lockBodyScroll() {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
    }

    /**
     * Unlock body scroll
     */
    unlockBodyScroll() {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }

    /**
     * Request fullscreen with fallbacks
     */
    requestFullscreen(element = document.documentElement) {
        if (element.requestFullscreen) {
            return element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            return element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            return element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            return element.msRequestFullscreen();
        }
        return Promise.reject(new Error('Fullscreen not supported'));
    }

    /**
     * Exit fullscreen
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            return document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            return document.msExitFullscreen();
        }
        return Promise.reject(new Error('Exit fullscreen not supported'));
    }

    /**
     * Check if currently in fullscreen
     */
    isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }

    /**
     * Toggle fullscreen
     */
    async toggleFullscreen(element) {
        if (this.isFullscreen()) {
            await this.exitFullscreen();
        } else {
            await this.requestFullscreen(element);
        }
    }
}

// Create and export singleton instance
export const viewportManager = new ViewportManager();

