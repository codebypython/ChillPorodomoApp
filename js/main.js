/**
 * ChillPomodoroApp - Main Application Entry Point
 * Initializes all managers and sets up event handlers
 */

import { viewportManager } from './utils/viewport.js';
import { storageManager } from './classes/StorageManager.js';
import { Settings } from './classes/Settings.js';
import { AudioManager } from './classes/AudioManager.js';
import { BackgroundManager } from './classes/BackgroundManager.js';
import { PomodoroTimer } from './classes/PomodoroTimer.js';
import { LibraryManager } from './classes/LibraryManager.js';
import { PresetManager } from './classes/PresetManager.js';

class ChillPomodoroApp {
    constructor() {
        this.settings = null;
        this.audioManager = null;
        this.backgroundManager = null;
        this.timer = null;
        this.libraryManager = null;
        this.presetManager = null;
        this.currentTab = 'timer';
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Show loading
            const loading = document.getElementById('loading');

            // Initialize core managers
            this.settings = new Settings();
            this.settings.load();

            this.audioManager = new AudioManager(this.settings);
            await this.audioManager.ensureInitialized();

            this.backgroundManager = new BackgroundManager(this.settings);
            await this.backgroundManager.initPromise;

            this.timer = new PomodoroTimer(this.settings, this.audioManager);

            this.libraryManager = new LibraryManager(this.backgroundManager, this.audioManager);
            await this.libraryManager.loadAll();

            this.presetManager = new PresetManager(this.settings, this.backgroundManager, this.audioManager);
            await this.presetManager.loadPresets();

            // Make managers globally accessible for onclick handlers
            window.libraryManager = this.libraryManager;
            window.presetManager = this.presetManager;

            // Seed default data on first run
            await this.seedDefaultData();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize UI
            this.initializeUI();

            // Hide loading screen
            setTimeout(() => {
                loading.classList.add('hidden');
            }, 1000);

            console.log('ChillPomodoroApp initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Có lỗi khi khởi động ứng dụng. Vui lòng tải lại trang.');
        }
    }

    /**
     * Seed default backgrounds, sounds, and a sample preset (first run only)
     */
    async seedDefaultData() {
        try {
            if (localStorage.getItem('chillpomodoro-seeded') === 'true') return;

            // Seed backgrounds (external URLs)
            const defaultBackgrounds = [
                {
                    name: 'City Walk (Video)',
                    type: 'video',
                    url: 'https://chill-app.b-cdn.net/videos/livestreams/desktop/Endless_Stroll/City_Strollnorain.mp4'
                },
                {
                    name: 'Lofi Balcony (Video)',
                    type: 'video',
                    url: 'https://cdn.pixabay.com/video/2023/05/24/164805-833034862_large.mp4'
                },
                {
                    name: 'Unsplash Mountain (Image)',
                    type: 'image',
                    url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&h=1080&fit=crop'
                }
            ];

            for (const bg of defaultBackgrounds) {
                await storageManager.addItem('animations', {
                    name: bg.name,
                    type: bg.type,
                    data: bg.url, // store as URL string
                    isBlob: false,
                    fileName: bg.url.split('/').pop(),
                    fileSize: 0,
                    createdAt: new Date().toISOString()
                });
            }

            // Seed sounds (external URLs)
            const defaultSounds = [
                {
                    name: 'Lofi Large',
                    url: 'https://cdn.pixabay.com/download/audio/2021/09/30/audio_2b3d0f2e84.mp3?filename=lofi-study-112191.mp3'
                },
                {
                    name: 'Moonlit Waves',
                    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_5c1a9a1b37.mp3?filename=ocean-waves-ambient-113524.mp3'
                }
            ];

            for (const s of defaultSounds) {
                await storageManager.addItem('sounds', {
                    name: s.name,
                    data: s.url,
                    isBlob: false,
                    fileName: s.url.split('/').pop(),
                    fileSize: 0,
                    createdAt: new Date().toISOString()
                });
            }

            // Reload libraries into managers
            await this.libraryManager.loadAll();
            await this.audioManager.reloadCustomSounds();
            await this.backgroundManager.reloadCustomBackgrounds();

            // Create a sample preset
            await storageManager.addItem('presets', {
                name: 'Deep Focus Sample',
                settings: {
                    workDuration: 25,
                    shortBreakDuration: 5,
                    longBreakDuration: 15,
                    longBreakInterval: 4,
                    backgroundType: 'none',
                    backgroundOpacity: 80,
                    backgroundMusicType: 'none',
                    backgroundMusicVolume: 50,
                    enableBackgroundMusic: false,
                    notificationVolume: 70,
                    autoStartBreaks: false,
                    autoStartPomodoros: false
                },
                createdAt: new Date().toISOString()
            });

            await this.presetManager.loadPresets();

            // Mark seeded
            localStorage.setItem('chillpomodoro-seeded', 'true');
        } catch (e) {
            console.warn('Seeding default data failed (continuing):', e);
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Timer controls
        document.getElementById('startBtn')?.addEventListener('click', () => this.timer.start());
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.timer.pause());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.timer.reset());
        document.getElementById('skipBtn')?.addEventListener('click', () => this.timer.skip());

        // Quick timer buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.time);
                const action = btn.dataset.action;
                this.timer.setQuickTimer(minutes, action);
            });
        });

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Header buttons
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('musicToggle')?.addEventListener('click', () => this.toggleMusic());
        document.getElementById('backgroundToggle')?.addEventListener('click', () => {
            this.backgroundManager.toggleBackgroundOnlyMode();
        });
        document.getElementById('exitBackgroundMode')?.addEventListener('click', () => {
            this.backgroundManager.exitBackgroundOnlyMode();
        });

        // ESC key to exit background mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('background-only-mode')) {
                this.backgroundManager.exitBackgroundOnlyMode();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            this.timer.handleVisibilityChange();
        });

        // Library actions
        document.getElementById('addAnimationBtn')?.addEventListener('click', () => {
            this.libraryManager.showAddAnimationModal();
        });

        document.getElementById('addSoundBtn')?.addEventListener('click', () => {
            this.libraryManager.showAddSoundModal();
        });

        document.getElementById('savePresetBtn')?.addEventListener('click', () => {
            this.presetManager.showSavePresetModal();
        });

        // Settings
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettings')?.addEventListener('click', () => this.resetSettings());

        // Volume sliders
        document.getElementById('notificationVolume')?.addEventListener('input', (e) => {
            document.getElementById('volumeDisplay').textContent = e.target.value + '%';
        });

        document.getElementById('backgroundMusicVolume')?.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            document.getElementById('musicVolumeDisplay').textContent = volume + '%';
            this.audioManager.setBackgroundMusicVolume(volume);
        });

        document.getElementById('backgroundOpacity')?.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            document.getElementById('opacityDisplay').textContent = opacity + '%';
            this.settings.backgroundOpacity = opacity;
            this.backgroundManager.setBackgroundOpacity();
        });

        // Background type change
        document.getElementById('backgroundType')?.addEventListener('change', (e) => {
            this.settings.backgroundType = e.target.value;
            this.backgroundManager.applyBackground();
        });

        // Modal controls
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.libraryManager.hideModal();
        });

        document.getElementById('modalCancelBtn')?.addEventListener('click', () => {
            this.libraryManager.hideModal();
        });

        document.getElementById('modalSaveBtn')?.addEventListener('click', async () => {
            const modal = document.getElementById('modal');
            const type = modal?.dataset.type;

            try {
                if (type === 'preset') {
                    await this.presetManager.savePresetFromModal();
                    this.libraryManager.hideModal();
                } else {
                    await this.libraryManager.saveModal();
                }
            } catch (error) {
                console.error('Error saving:', error);
            }
        });

        // Notification close
        document.querySelector('.notification-close')?.addEventListener('click', () => {
            document.getElementById('notification')?.classList.remove('show');
        });

        // Stats
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            storageManager.exportData();
        });

        document.getElementById('clearDataBtn')?.addEventListener('click', async () => {
            if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu? Hành động này không thể hoàn tác.')) {
                await storageManager.clearAllData();
                location.reload();
            }
        });

        // Header dropdowns
        this.setupHeaderDropdowns();
    }

    /**
     * Setup header dropdown menus
     */
    setupHeaderDropdowns() {
        // Background dropdown
        const bgDropdownToggle = document.getElementById('backgroundDropdownToggle');
        const bgDropdown = document.getElementById('backgroundDropdown');

        bgDropdownToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            bgDropdown.classList.toggle('show');
            document.getElementById('musicDropdown')?.classList.remove('show');
        });

        // Music dropdown
        const musicDropdownToggle = document.getElementById('musicDropdownToggle');
        const musicDropdown = document.getElementById('musicDropdown');

        musicDropdownToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            musicDropdown.classList.toggle('show');
            bgDropdown?.classList.remove('show');
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            bgDropdown?.classList.remove('show');
            musicDropdown?.classList.remove('show');
        });

        // Populate dropdowns
        this.populateDropdowns();
    }

    /**
     * Populate header dropdown menus
     */
    populateDropdowns() {
        // Populate background dropdown
        const bgDropdown = document.getElementById('backgroundDropdown');
        const bgScroll = bgDropdown?.querySelector('.dropdown-scroll');

        if (bgScroll) {
            let html = `
                <button class="dropdown-item bg-option ${!this.settings.backgroundType || this.settings.backgroundType === 'none' ? 'active' : ''}" data-bg="none">
                    <span class="item-icon">🚫</span>
                    <span class="item-text">Không nền</span>
                </button>
                <div class="dropdown-divider"></div>
            `;

            const backgrounds = this.libraryManager.animations;
            if (backgrounds.length > 0) {
                html += '<div class="dropdown-section-title">Backgrounds</div>';
                backgrounds.forEach(bg => {
                    const isActive = this.settings.backgroundType === bg.id.toString();
                    const icon = bg.type === 'video' ? '🎬' : '🖼️';
                    html += `
                        <button class="dropdown-item bg-option ${isActive ? 'active' : ''}" data-bg="${bg.id}">
                            <span class="item-icon">${icon}</span>
                            <span class="item-text">${bg.name}</span>
                        </button>
                    `;
                });
            }

            bgScroll.innerHTML = html;

            // Add event listeners
            bgScroll.querySelectorAll('.bg-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const bgId = option.dataset.bg;

                    // Update active state
                    bgScroll.querySelectorAll('.bg-option').forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');

                    // Apply background
                    this.settings.backgroundType = bgId;
                    this.settings.save();
                    this.backgroundManager.applyBackground(bgId);

                    bgDropdown.classList.remove('show');

                    this.showNotification('Đã chọn background!', 'success');
                });
            });
        }

        // Populate music dropdown
        const musicDropdown = document.getElementById('musicDropdown');
        const musicScroll = musicDropdown?.querySelector('.dropdown-scroll');

        if (musicScroll) {
            let html = `
                <button class="dropdown-item music-option ${!this.settings.backgroundMusicType || this.settings.backgroundMusicType === 'none' ? 'active' : ''}" data-music="none">
                    <span class="item-icon">🚫</span>
                    <span class="item-text">Không nhạc</span>
                </button>
                <div class="dropdown-divider"></div>
            `;

            const sounds = this.libraryManager.sounds;
            if (sounds.length > 0) {
                html += '<div class="dropdown-section-title">Nhạc nền</div>';
                sounds.forEach(sound => {
                    const isActive = this.settings.backgroundMusicType === sound.id.toString();
                    html += `
                        <button class="dropdown-item music-option ${isActive ? 'active' : ''}" data-music="${sound.id}">
                            <span class="item-icon">🎵</span>
                            <span class="item-text">${sound.name}</span>
                        </button>
                    `;
                });
            }

            musicScroll.innerHTML = html;

            // Add event listeners
            musicScroll.querySelectorAll('.music-option').forEach(option => {
                option.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const musicId = option.dataset.music;

                    // Update active state
                    musicScroll.querySelectorAll('.music-option').forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');

                    // Apply music
                    this.settings.backgroundMusicType = musicId;
                    this.settings.enableBackgroundMusic = musicId !== 'none';
                    this.settings.save();

                    if (musicId !== 'none') {
                        await this.audioManager.startBackgroundMusic(musicId);
                    } else {
                        this.audioManager.stopBackgroundMusic();
                    }

                    musicDropdown.classList.remove('show');

                    this.showNotification('Đã chọn nhạc nền!', 'success');
                });
            });
        }
    }

    /**
     * Initialize UI
     */
    initializeUI() {
        // Load settings to form
        this.settings.loadToForm();

        // Update timer display
        this.timer.updateDisplay();
        this.timer.updateControls();

        // Populate background type select
        this.populateBackgroundTypeSelect();

        // Render libraries
        this.libraryManager.renderAnimations();
        this.libraryManager.renderSounds();
        this.presetManager.renderPresets();

        // Switch to default tab
        this.switchTab('timer');
    }

    /**
     * Populate background type select in settings
     */
    populateBackgroundTypeSelect() {
        const select = document.getElementById('backgroundType');
        if (!select) return;

        let html = '<option value="none">Không nền</option>';

        const backgrounds = this.libraryManager.animations;
        if (backgrounds.length > 0) {
            html += '<optgroup label="Backgrounds">';
            backgrounds.forEach(bg => {
                html += `<option value="${bg.id}">${bg.name}</option>`;
            });
            html += '</optgroup>';
        }

        select.innerHTML = html;
        select.value = this.settings.backgroundType || 'none';
    }

    /**
     * Switch tab
     */
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');

        this.currentTab = tabName;

        // Update stats if switching to stats tab
        if (tabName === 'stats') {
            setTimeout(() => {
                this.updateStatistics();
            }, 100);
        }

        // Re-render libraries if switching to library tabs
        if (tabName === 'animations') {
            this.libraryManager.renderAnimations();
            this.populateDropdowns(); // Refresh dropdowns
        } else if (tabName === 'sounds') {
            this.libraryManager.renderSounds();
            this.populateDropdowns(); // Refresh dropdowns
        } else if (tabName === 'presets') {
            this.presetManager.renderPresets();
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        this.settings.darkMode = !this.settings.darkMode;
        this.settings.save();
    }

    /**
     * Toggle music
     */
    async toggleMusic() {
        this.audioManager.toggleBackgroundMusic();
    }

    /**
     * Save settings
     */
    saveSettings() {
        this.settings.saveFromForm();
        this.backgroundManager.applyBackground();

        if (this.settings.enableBackgroundMusic) {
            this.audioManager.startBackgroundMusic();
        } else {
            this.audioManager.stopBackgroundMusic();
        }

        // Update timer if not running
        if (!this.timer.isRunning) {
            this.timer.setSessionTime();
            this.timer.updateDisplay();
        }

        // Update background type select
        this.populateBackgroundTypeSelect();

        this.showNotification('Cài đặt đã được lưu!', 'success');
    }

    /**
     * Reset settings
     */
    resetSettings() {
        if (confirm('Bạn có chắc chắn muốn đặt lại tất cả cài đặt về mặc định?')) {
            this.settings.reset();
            this.settings.loadToForm();
            this.showNotification('Cài đặt đã được đặt lại!', 'success');
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                if (this.timer.isRunning) {
                    this.timer.pause();
                } else {
                    this.timer.start();
                }
                break;
            case 'r':
                e.preventDefault();
                this.timer.reset();
                break;
            case 's':
                e.preventDefault();
                this.timer.skip();
                break;
        }
    }

    /**
     * Update statistics
     */
    updateStatistics() {
        const stats = this.timer.getStatistics();

        // Update summary cards
        document.getElementById('totalPomodoros').textContent = stats.completedPomodoros || 0;
        document.getElementById('totalWorkTime').textContent = this.timer.formatTime(stats.totalWorkTime || 0);
        document.getElementById('totalBreakTime').textContent = this.timer.formatTime(stats.totalBreakTime || 0);
        document.getElementById('currentStreak').textContent = stats.currentStreak || 0;

        // Update chart
        this.updateChart(stats.sessionHistory || []);
    }

    /**
     * Update activity chart
     */
    updateChart(sessions) {
        const canvas = document.getElementById('activityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Get last 7 days data
        const last7Days = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last7Days.push({
                date: date.toISOString().split('T')[0],
                day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
                minutes: 0
            });
        }

        // Calculate total minutes for each day
        sessions.forEach(session => {
            if (session.type === 'work' && session.completed) {
                const sessionDate = new Date(session.timestamp).toISOString().split('T')[0];
                const dayData = last7Days.find(d => d.date === sessionDate);
                if (dayData) {
                    dayData.minutes += session.duration || session.workDuration || 25;
                }
            }
        });

        const totalMinutes = last7Days.reduce((sum, day) => sum + day.minutes, 0);

        if (totalMinutes === 0) {
            this.drawEmptyChart(ctx, rect.width, rect.height);
            return;
        }

        this.drawBarChart(ctx, rect.width, rect.height, last7Days);
    }

    /**
     * Draw bar chart
     */
    drawBarChart(ctx, width, height, data) {
        const padding = 50;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const barWidth = (chartWidth / data.length) * 0.6;

        const maxValue = Math.max(...data.map(d => d.minutes), 1);

        const isDark = this.settings.darkMode;
        const textColor = isDark ? '#cbd5e1' : '#475569';
        const barColor = '#667eea';

        ctx.font = '12px system-ui, -apple-system, sans-serif';

        // Draw bars
        data.forEach((day, index) => {
            const x = padding + index * (chartWidth / data.length) + (chartWidth / data.length - barWidth) / 2;
            const barHeight = (day.minutes / maxValue) * chartHeight * 0.8;
            const y = padding + chartHeight - barHeight;

            ctx.fillStyle = barColor;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw day label
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.fillText(day.day, x + barWidth / 2, height - padding + 20);

            // Draw value label
            if (day.minutes > 0) {
                ctx.fillText(day.minutes + 'm', x + barWidth / 2, y - 8);
            }
        });

        // Draw axes
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
    }

    /**
     * Draw empty chart
     */
    drawEmptyChart(ctx, width, height) {
        const isDark = this.settings.darkMode;
        const textColor = isDark ? '#cbd5e1' : '#475569';

        ctx.fillStyle = textColor;
        ctx.font = '16px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Chưa có dữ liệu thống kê', width / 2, height / 2 - 10);
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillText('Hãy hoàn thành phiên làm việc đầu tiên!', width / 2, height / 2 + 15);
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ChillPomodoroApp();
    await app.init();

    // Make app globally accessible for debugging
    window.app = app;
});

