/**
 * PresetManager - Preset Management
 * Handles saving and loading complete app configurations
 */

import { storageManager } from './StorageManager.js';

export class PresetManager {
    constructor(settings, backgroundManager, audioManager) {
        this.settings = settings;
        this.backgroundManager = backgroundManager;
        this.audioManager = audioManager;
        this.presets = [];
    }

    /**
     * Load presets from storage
     */
    async loadPresets() {
        this.presets = await storageManager.getAllItems('presets');
        return this.presets;
    }

    /**
     * Save current configuration as preset
     */
    async saveCurrentAsPreset(name) {
        try {
            if (!name || !name.trim()) {
                throw new Error('Vui lòng nhập tên preset!');
            }

            const preset = {
                name: name.trim(),
                settings: {
                    workDuration: this.settings.workDuration,
                    shortBreakDuration: this.settings.shortBreakDuration,
                    longBreakDuration: this.settings.longBreakDuration,
                    longBreakInterval: this.settings.longBreakInterval,
                    backgroundType: this.settings.backgroundType,
                    backgroundOpacity: this.settings.backgroundOpacity,
                    backgroundMusicType: this.settings.backgroundMusicType,
                    backgroundMusicVolume: this.settings.backgroundMusicVolume,
                    enableBackgroundMusic: this.settings.enableBackgroundMusic,
                    notificationVolume: this.settings.notificationVolume,
                    autoStartBreaks: this.settings.autoStartBreaks,
                    autoStartPomodoros: this.settings.autoStartPomodoros
                },
                createdAt: new Date().toISOString()
            };

            const id = await storageManager.addItem('presets', preset);
            await this.loadPresets();

            return id;
        } catch (error) {
            console.error('Error saving preset:', error);
            throw error;
        }
    }

    /**
     * Load preset configuration
     */
    async loadPreset(id) {
        try {
            const preset = this.presets.find(p => p.id === id);
            if (!preset) {
                throw new Error('Preset not found');
            }

            // Apply settings
            Object.assign(this.settings, preset.settings);
            this.settings.save();

            // Apply background
            if (this.backgroundManager) {
                this.backgroundManager.applyBackground(preset.settings.backgroundType);
            }

            // Apply music
            if (this.audioManager) {
                if (preset.settings.enableBackgroundMusic) {
                    await this.audioManager.startBackgroundMusic(preset.settings.backgroundMusicType);
                } else {
                    this.audioManager.stopBackgroundMusic();
                }
            }

            return true;
        } catch (error) {
            console.error('Error loading preset:', error);
            throw error;
        }
    }

    /**
     * Delete preset
     */
    async deletePreset(id) {
        try {
            await storageManager.deleteItem('presets', id);
            await this.loadPresets();
            return true;
        } catch (error) {
            console.error('Error deleting preset:', error);
            throw error;
        }
    }

    // ===== UI Rendering Methods =====

    /**
     * Render presets list
     */
    renderPresets() {
        const container = document.getElementById('presetsList');
        if (!container) return;

        if (this.presets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Chưa có preset nào. Lưu cấu hình hiện tại để sử dụng lại sau!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.presets.map(preset => {
            const date = new Date(preset.createdAt).toLocaleDateString('vi-VN');
            const settings = preset.settings;

            return `
                <div class="library-item" data-id="${preset.id}">
                    <div class="library-item-preview" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-tertiary); padding: 1rem;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚙️</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary); text-align: center;">
                            ${settings.workDuration}/${settings.shortBreakDuration}/${settings.longBreakDuration} phút
                        </div>
                    </div>
                    <div class="library-item-info">
                        <div class="library-item-name">${preset.name}</div>
                        <div class="library-item-meta">Đã lưu ${date}</div>
                    </div>
                    <div class="library-item-actions">
                        <button class="item-btn use" onclick="window.presetManager.loadPreset(${preset.id})">
                            Tải
                        </button>
                        <button class="item-btn delete" onclick="window.presetManager.confirmDelete(${preset.id})">
                            Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Show save preset modal
     */
    showSavePresetModal() {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalForm = document.getElementById('modalForm');

        if (!modal || !modalTitle || !modalForm) return;

        modalTitle.textContent = 'Lưu Preset';
        modalForm.innerHTML = `
            <div class="setting-item">
                <label>Tên Preset</label>
                <input type="text" id="presetName" placeholder="Ví dụ: Deep Focus Session">
            </div>
            <div class="setting-item">
                <label>Cấu hình hiện tại:</label>
                <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); margin-top: 0.5rem;">
                    <div style="margin-bottom: 0.5rem;"><strong>Timer:</strong> ${this.settings.workDuration}/${this.settings.shortBreakDuration}/${this.settings.longBreakDuration} phút</div>
                    <div style="margin-bottom: 0.5rem;"><strong>Background:</strong> ${this.getBackgroundName()}</div>
                    <div><strong>Music:</strong> ${this.settings.enableBackgroundMusic ? 'Bật' : 'Tắt'}</div>
                </div>
            </div>
        `;

        modal.classList.add('show');
        modal.dataset.type = 'preset';
    }

    /**
     * Get background name for display
     */
    getBackgroundName() {
        if (!this.settings.backgroundType || this.settings.backgroundType === 'none') {
            return 'Không có';
        }

        const bgId = parseInt(this.settings.backgroundType);
        if (this.backgroundManager) {
            const bg = this.backgroundManager.customBackgrounds.get(bgId);
            if (bg) {
                return bg.name;
            }
        }

        return 'Background #' + bgId;
    }

    /**
     * Save preset from modal
     */
    async savePresetFromModal() {
        const nameInput = document.getElementById('presetName');
        const name = nameInput?.value;

        if (!name || !name.trim()) {
            throw new Error('Vui lòng nhập tên preset!');
        }

        await this.saveCurrentAsPreset(name.trim());
        this.renderPresets();

        // Show success notification
        this.showNotification('Đã lưu preset thành công!', 'success');
    }

    /**
     * Confirm delete
     */
    confirmDelete(id) {
        if (confirm('Bạn có chắc chắn muốn xóa preset này?')) {
            this.deletePreset(id).then(() => {
                this.renderPresets();
                this.showNotification('Đã xóa preset!', 'info');
            }).catch(err => {
                alert('Lỗi khi xóa: ' + err.message);
            });
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
}

