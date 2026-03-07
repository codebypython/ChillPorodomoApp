/**
 * LibraryManager - Animation & Sound Library Management
 * Handles CRUD operations for custom animations and sounds
 */

import { storageManager } from './StorageManager.js';
import { notificationService } from '../services/NotificationService.js';

export class LibraryManager {
    constructor(backgroundManager = null, audioManager = null) {
        this.backgroundManager = backgroundManager;
        this.audioManager = audioManager;
        this.animations = [];
        this.sounds = [];
        this.currentModal = null;
        this.currentEditId = null;
        this.previewUrlCache = new Map();
    }

    /**
     * Load all library items
     */
    async loadAll() {
        await this.loadAnimations();
        await this.loadSounds();
    }

    /**
     * Load animations from storage
     */
    async loadAnimations() {
        this.revokePreviewUrls();
        this.animations = await storageManager.getAllItems('animations');
        return this.animations;
    }

    /**
     * Load sounds from storage
     */
    async loadSounds() {
        this.sounds = await storageManager.getAllItems('sounds');
        return this.sounds;
    }

    // ===== Animation Methods =====

    /**
     * Add new animation
     */
    async addAnimation(name, file, type) {
        try {
            // Validate file
            if (!storageManager.isFileSizeValid(file, 100)) {
                throw new Error('File quá lớn! Kích thước tối đa 100MB.');
            }

            // Determine storage method
            let data;
            let isBlob = false;

            if (storageManager.shouldUseBlob(file)) {
                data = storageManager.fileToBlob(file);
                isBlob = true;
            } else {
                data = await storageManager.fileToBase64(file);
            }

            const animation = {
                name: name,
                type: type,
                data: data,
                isBlob: isBlob,
                fileName: file.name,
                fileSize: file.size,
                createdAt: new Date().toISOString()
            };

            const id = await storageManager.addItem('animations', animation);

            // Reload animations
            await this.loadAnimations();

            // Reload in background manager
            if (this.backgroundManager) {
                await this.backgroundManager.reloadCustomBackgrounds();
            }

            return id;
        } catch (error) {
            console.error('Error adding animation:', error);
            throw error;
        }
    }

    /**
     * Delete animation
     */
    async deleteAnimation(id) {
        try {
            this.revokePreviewUrl(id);
            await storageManager.deleteItem('animations', id);

            // Reload animations
            await this.loadAnimations();

            // Reload in background manager
            if (this.backgroundManager) {
                await this.backgroundManager.reloadCustomBackgrounds();
            }

            return true;
        } catch (error) {
            console.error('Error deleting animation:', error);
            throw error;
        }
    }

    /**
     * Use animation as background
     */
    async useAnimation(id) {
        const animation = this.animations.find(a => a.id === id);
        if (!animation) {
            throw new Error('Animation not found');
        }

        if (this.backgroundManager) {
            this.backgroundManager.settings.backgroundType = id.toString();
            this.backgroundManager.settings.save();
            this.backgroundManager.applyBackground(id);
        }
    }

    // ===== Sound Methods =====

    /**
     * Add new sound
     */
    async addSound(name, file) {
        try {
            // Validate file
            if (!storageManager.isFileSizeValid(file, 50)) {
                throw new Error('File quá lớn! Kích thước tối đa 50MB.');
            }

            // Determine storage method
            let data;
            let isBlob = false;

            if (storageManager.shouldUseBlob(file)) {
                data = storageManager.fileToBlob(file);
                isBlob = true;
            } else {
                data = await storageManager.fileToBase64(file);
            }

            const sound = {
                name: name,
                data: data,
                isBlob: isBlob,
                fileName: file.name,
                fileSize: file.size,
                createdAt: new Date().toISOString()
            };

            const id = await storageManager.addItem('sounds', sound);

            // Reload sounds
            await this.loadSounds();

            // Reload in audio manager
            if (this.audioManager) {
                await this.audioManager.reloadCustomSounds();
            }

            return id;
        } catch (error) {
            console.error('Error adding sound:', error);
            throw error;
        }
    }

    /**
     * Delete sound
     */
    async deleteSound(id) {
        try {
            await storageManager.deleteItem('sounds', id);

            // Reload sounds
            await this.loadSounds();

            // Reload in audio manager
            if (this.audioManager) {
                await this.audioManager.reloadCustomSounds();
            }

            return true;
        } catch (error) {
            console.error('Error deleting sound:', error);
            throw error;
        }
    }

    /**
     * Use sound as background music
     */
    async useSound(id) {
        const sound = this.sounds.find(s => s.id === id);
        if (!sound) {
            throw new Error('Sound not found');
        }

        if (this.audioManager) {
            this.audioManager.settings.backgroundMusicType = id.toString();
            this.audioManager.settings.enableBackgroundMusic = true;
            this.audioManager.settings.save();
            await this.audioManager.startBackgroundMusic(id);
        }
    }

    // ===== UI Rendering Methods =====

    /**
     * Render animations list
     */
    renderAnimations() {
        const container = document.getElementById('animationsList');
        if (!container) return;

        if (this.animations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Chưa có animation nào. Thêm video hoặc ảnh background của bạn!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.animations.map(animation => {
            const preview = this.getAnimationPreview(animation);
            const typeLabel = animation.type === 'video' ? '🎬 Video' : '🖼️ Ảnh';
            const size = (animation.fileSize / (1024 * 1024)).toFixed(2);

            return `
                <div class="library-item" data-id="${animation.id}">
                    ${preview}
                    <div class="library-item-info">
                        <div class="library-item-name">${animation.name}</div>
                        <div class="library-item-meta">${typeLabel} • ${size}MB</div>
                    </div>
                    <div class="library-item-actions">
                        <button class="item-btn use" data-action="use-animation" data-id="${animation.id}">
                            Sử dụng
                        </button>
                        <button class="item-btn delete" data-action="delete-animation" data-id="${animation.id}">
                            Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-action="use-animation"]').forEach(button => {
            button.addEventListener('click', () => {
                this.useAnimation(parseInt(button.dataset.id, 10));
            });
        });

        container.querySelectorAll('[data-action="delete-animation"]').forEach(button => {
            button.addEventListener('click', () => {
                this.confirmDelete('animation', parseInt(button.dataset.id, 10));
            });
        });
    }

    /**
     * Get animation preview HTML
     */
    getAnimationPreview(animation) {
        const previewURL = this.getOrCreatePreviewUrl(animation);
        if (!previewURL) {
            return '<div class="library-item-preview" style="background: var(--bg-tertiary)"></div>';
        }

        if (animation.type === 'video') {
            return `<video class="library-item-preview" src="${previewURL}" muted loop></video>`;
        } else {
            return `<div class="library-item-preview" style="background-image: url('${previewURL}')"></div>`;
        }
    }

    getOrCreatePreviewUrl(animation) {
        if (this.previewUrlCache.has(animation.id)) {
            return this.previewUrlCache.get(animation.id);
        }

        let previewURL = null;
        if (animation.data instanceof Blob) {
            previewURL = storageManager.createBlobURL(animation.data);
        } else if (typeof animation.data === 'string') {
            previewURL = animation.data;
        }

        if (previewURL) {
            this.previewUrlCache.set(animation.id, previewURL);
        }

        return previewURL;
    }

    revokePreviewUrl(id) {
        const url = this.previewUrlCache.get(id);
        if (url && url.startsWith('blob:')) {
            storageManager.revokeBlobURL(url);
        }
        this.previewUrlCache.delete(id);
    }

    revokePreviewUrls() {
        for (const [id] of this.previewUrlCache.entries()) {
            this.revokePreviewUrl(id);
        }
    }

    /**
     * Render sounds list
     */
    renderSounds() {
        const container = document.getElementById('soundsList');
        if (!container) return;

        if (this.sounds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Chưa có sound nào. Thêm nhạc nền của bạn!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.sounds.map(sound => {
            const size = (sound.fileSize / (1024 * 1024)).toFixed(2);

            return `
                <div class="library-item" data-id="${sound.id}">
                    <div class="library-item-preview" style="display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); font-size: 3rem;">
                        🎵
                    </div>
                    <div class="library-item-info">
                        <div class="library-item-name">${sound.name}</div>
                        <div class="library-item-meta">Audio • ${size}MB</div>
                    </div>
                    <div class="library-item-actions">
                        <button class="item-btn use" data-action="use-sound" data-id="${sound.id}">
                            Phát
                        </button>
                        <button class="item-btn delete" data-action="delete-sound" data-id="${sound.id}">
                            Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-action="use-sound"]').forEach(button => {
            button.addEventListener('click', () => {
                this.useSound(parseInt(button.dataset.id, 10));
            });
        });

        container.querySelectorAll('[data-action="delete-sound"]').forEach(button => {
            button.addEventListener('click', () => {
                this.confirmDelete('sound', parseInt(button.dataset.id, 10));
            });
        });
    }

    // ===== Modal Methods =====

    /**
     * Show add animation modal
     */
    showAddAnimationModal() {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalForm = document.getElementById('modalForm');

        if (!modal || !modalTitle || !modalForm) return;

        modalTitle.textContent = 'Thêm Animation';
        modalForm.innerHTML = `
            <div class="setting-item">
                <label>Tên Animation</label>
                <input type="text" id="animationName" placeholder="Ví dụ: Lofi Study">
            </div>
            <div class="setting-item">
                <label>Loại</label>
                <select id="animationType">
                    <option value="video">Video</option>
                    <option value="image">Ảnh</option>
                </select>
            </div>
            <div class="setting-item">
                <label>File (Video: MP4, WebM | Ảnh: JPG, PNG, GIF)</label>
                <input type="file" id="animationFile" accept="video/*,image/*">
            </div>
        `;

        this.currentModal = 'animation';
        modal.classList.add('show');
    }

    /**
     * Show add sound modal
     */
    showAddSoundModal() {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalForm = document.getElementById('modalForm');

        if (!modal || !modalTitle || !modalForm) return;

        modalTitle.textContent = 'Thêm Sound';
        modalForm.innerHTML = `
            <div class="setting-item">
                <label>Tên Sound</label>
                <input type="text" id="soundName" placeholder="Ví dụ: Lofi Chill Beats">
            </div>
            <div class="setting-item">
                <label>File (MP3, M4A, WAV, OGG)</label>
                <input type="file" id="soundFile" accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/x-m4a,.mp3,.m4a,.aac,.wav,.ogg">
            </div>
        `;

        this.currentModal = 'sound';
        modal.classList.add('show');
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('show');
            this.currentModal = null;
            this.currentEditId = null;
        }
    }

    /**
     * Save modal data
     */
    async saveModal() {
        try {
            if (this.currentModal === 'animation') {
                await this.saveAnimation();
            } else if (this.currentModal === 'sound') {
                await this.saveSound();
            }

            this.hideModal();
        } catch (error) {
            alert(error.message || 'Có lỗi xảy ra!');
        }
    }

    /**
     * Save animation from modal
     */
    async saveAnimation() {
        const name = document.getElementById('animationName')?.value;
        const type = document.getElementById('animationType')?.value;
        const fileInput = document.getElementById('animationFile');
        const file = fileInput?.files[0];

        if (!name || !name.trim()) {
            throw new Error('Vui lòng nhập tên animation!');
        }

        if (!file) {
            throw new Error('Vui lòng chọn file!');
        }

        await this.addAnimation(name.trim(), file, type);
        this.renderAnimations();

        // Show success notification
        this.showNotification('Đã thêm animation thành công!', 'success');
    }

    /**
     * Save sound from modal
     */
    async saveSound() {
        const name = document.getElementById('soundName')?.value;
        const fileInput = document.getElementById('soundFile');
        const file = fileInput?.files[0];

        if (!name || !name.trim()) {
            throw new Error('Vui lòng nhập tên sound!');
        }

        if (!file) {
            throw new Error('Vui lòng chọn file!');
        }

        await this.addSound(name.trim(), file);
        this.renderSounds();

        // Show success notification
        this.showNotification('Đã thêm sound thành công!', 'success');
    }

    /**
     * Confirm delete
     */
    confirmDelete(type, id) {
        if (confirm(`Bạn có chắc chắn muốn xóa ${type === 'animation' ? 'animation' : 'sound'} này?`)) {
            if (type === 'animation') {
                this.deleteAnimation(id).then(() => {
                    this.renderAnimations();
                    this.showNotification('Đã xóa animation!', 'info');
                }).catch(err => {
                    alert('Lỗi khi xóa: ' + err.message);
                });
            } else if (type === 'sound') {
                this.deleteSound(id).then(() => {
                    this.renderSounds();
                    this.showNotification('Đã xóa sound!', 'info');
                }).catch(err => {
                    alert('Lỗi khi xóa: ' + err.message);
                });
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        notificationService.show(message, type);
    }
}

