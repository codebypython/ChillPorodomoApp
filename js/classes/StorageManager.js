/**
 * StorageManager - Unified Storage API
 * Manages localStorage and IndexedDB for different data types
 */

// Silence verbose debug noise while preserving real errors.
const console = {
    ...globalThis.console,
    log: () => {},
    warn: () => {}
};

export class StorageManager {
    constructor() {
        this.dbName = 'ChillPomodoroApp';
        this.dbVersion = 5;
        this.db = null;
        this.initPromise = this.initDB();
    }

    /**
     * Initialize IndexedDB
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;
                const ensureIndex = (store, indexName, keyPath, options = { unique: false }) => {
                    if (!store.indexNames.contains(indexName)) {
                        store.createIndex(indexName, keyPath, options);
                    }
                };

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('animations')) {
                    const animationStore = db.createObjectStore('animations', { keyPath: 'id', autoIncrement: true });
                    animationStore.createIndex('name', 'name', { unique: false });
                    animationStore.createIndex('type', 'type', { unique: false });
                } else if (transaction) {
                    const animationStore = transaction.objectStore('animations');
                    ensureIndex(animationStore, 'name', 'name');
                    ensureIndex(animationStore, 'type', 'type');
                }

                if (!db.objectStoreNames.contains('sounds')) {
                    const soundStore = db.createObjectStore('sounds', { keyPath: 'id', autoIncrement: true });
                    soundStore.createIndex('name', 'name', { unique: false });
                } else if (transaction) {
                    const soundStore = transaction.objectStore('sounds');
                    ensureIndex(soundStore, 'name', 'name');
                }

                if (!db.objectStoreNames.contains('presets')) {
                    const presetStore = db.createObjectStore('presets', { keyPath: 'id', autoIncrement: true });
                    presetStore.createIndex('name', 'name', { unique: false });
                } else if (transaction) {
                    const presetStore = transaction.objectStore('presets');
                    ensureIndex(presetStore, 'name', 'name');
                }

                if (!db.objectStoreNames.contains('schedules')) {
                    const scheduleStore = db.createObjectStore('schedules', { keyPath: 'id', autoIncrement: true });
                    scheduleStore.createIndex('name', 'name', { unique: false });
                    scheduleStore.createIndex('type', 'type', { unique: false });
                    scheduleStore.createIndex('date', 'date', { unique: false });
                    scheduleStore.createIndex('type_date', ['type', 'date'], { unique: false });
                    scheduleStore.createIndex('createdAt', 'createdAt', { unique: false });
                } else if (transaction) {
                    const scheduleStore = transaction.objectStore('schedules');
                    ensureIndex(scheduleStore, 'name', 'name');
                    ensureIndex(scheduleStore, 'type', 'type');
                    ensureIndex(scheduleStore, 'date', 'date');
                    ensureIndex(scheduleStore, 'type_date', ['type', 'date']);
                    ensureIndex(scheduleStore, 'createdAt', 'createdAt');
                }

                if (!db.objectStoreNames.contains('studyTasks')) {
                    const taskStore = db.createObjectStore('studyTasks', { keyPath: 'id', autoIncrement: true });
                    taskStore.createIndex('status', 'status', { unique: false });
                    taskStore.createIndex('subject', 'subject', { unique: false });
                    taskStore.createIndex('deadline', 'deadline', { unique: false });
                    taskStore.createIndex('targetDate', 'targetDate', { unique: false });
                    taskStore.createIndex('createdAt', 'createdAt', { unique: false });
                } else if (transaction) {
                    const taskStore = transaction.objectStore('studyTasks');
                    ensureIndex(taskStore, 'status', 'status');
                    ensureIndex(taskStore, 'subject', 'subject');
                    ensureIndex(taskStore, 'deadline', 'deadline');
                    ensureIndex(taskStore, 'targetDate', 'targetDate');
                    ensureIndex(taskStore, 'createdAt', 'createdAt');
                }

                if (!db.objectStoreNames.contains('focusSessions')) {
                    const focusStore = db.createObjectStore('focusSessions', { keyPath: 'id', autoIncrement: true });
                    focusStore.createIndex('taskId', 'taskId', { unique: false });
                    focusStore.createIndex('date', 'date', { unique: false });
                    focusStore.createIndex('subject', 'subject', { unique: false });
                    focusStore.createIndex('completed', 'completed', { unique: false });
                    focusStore.createIndex('createdAt', 'createdAt', { unique: false });
                } else if (transaction) {
                    const focusStore = transaction.objectStore('focusSessions');
                    ensureIndex(focusStore, 'taskId', 'taskId');
                    ensureIndex(focusStore, 'date', 'date');
                    ensureIndex(focusStore, 'subject', 'subject');
                    ensureIndex(focusStore, 'completed', 'completed');
                    ensureIndex(focusStore, 'createdAt', 'createdAt');
                }

                if (!db.objectStoreNames.contains('exerciseLibrary')) {
                    const exerciseStore = db.createObjectStore('exerciseLibrary', { keyPath: 'id', autoIncrement: true });
                    exerciseStore.createIndex('slug', 'slug', { unique: true });
                    exerciseStore.createIndex('primaryFocus', 'primaryFocus', { unique: false });
                    exerciseStore.createIndex('difficulty', 'difficulty', { unique: false });
                    exerciseStore.createIndex('createdAt', 'createdAt', { unique: false });
                } else if (transaction) {
                    const exerciseStore = transaction.objectStore('exerciseLibrary');
                    ensureIndex(exerciseStore, 'slug', 'slug', { unique: true });
                    ensureIndex(exerciseStore, 'primaryFocus', 'primaryFocus');
                    ensureIndex(exerciseStore, 'difficulty', 'difficulty');
                    ensureIndex(exerciseStore, 'createdAt', 'createdAt');
                }

                if (!db.objectStoreNames.contains('workoutPrograms')) {
                    const workoutProgramStore = db.createObjectStore('workoutPrograms', { keyPath: 'id', autoIncrement: true });
                    workoutProgramStore.createIndex('name', 'name', { unique: false });
                    workoutProgramStore.createIndex('templateId', 'templateId', { unique: false });
                    workoutProgramStore.createIndex('isArchived', 'isArchived', { unique: false });
                    workoutProgramStore.createIndex('createdAt', 'createdAt', { unique: false });
                } else if (transaction) {
                    const workoutProgramStore = transaction.objectStore('workoutPrograms');
                    ensureIndex(workoutProgramStore, 'name', 'name');
                    ensureIndex(workoutProgramStore, 'templateId', 'templateId');
                    ensureIndex(workoutProgramStore, 'isArchived', 'isArchived');
                    ensureIndex(workoutProgramStore, 'createdAt', 'createdAt');
                }

                if (!db.objectStoreNames.contains('workoutSessions')) {
                    const workoutSessionStore = db.createObjectStore('workoutSessions', { keyPath: 'id', autoIncrement: true });
                    workoutSessionStore.createIndex('programId', 'programId', { unique: false });
                    workoutSessionStore.createIndex('scheduledDate', 'scheduledDate', { unique: false });
                    workoutSessionStore.createIndex('status', 'status', { unique: false });
                    workoutSessionStore.createIndex('dayFocus', 'dayFocus', { unique: false });
                    workoutSessionStore.createIndex('createdAt', 'createdAt', { unique: false });
                } else if (transaction) {
                    const workoutSessionStore = transaction.objectStore('workoutSessions');
                    ensureIndex(workoutSessionStore, 'programId', 'programId');
                    ensureIndex(workoutSessionStore, 'scheduledDate', 'scheduledDate');
                    ensureIndex(workoutSessionStore, 'status', 'status');
                    ensureIndex(workoutSessionStore, 'dayFocus', 'dayFocus');
                    ensureIndex(workoutSessionStore, 'createdAt', 'createdAt');
                }
            };
        });
    }

    /**
     * Ensure DB is initialized before operations
     */
    async ensureDB() {
        if (!this.db) {
            await this.initPromise;
        }
        return this.db;
    }

    // ===== LocalStorage Methods =====

    /**
     * Get settings from localStorage
     */
    getSettings() {
        const settings = localStorage.getItem('chillpomodoro-settings');
        return settings ? JSON.parse(settings) : null;
    }

    /**
     * Save settings to localStorage
     */
    saveSettings(settings) {
        localStorage.setItem('chillpomodoro-settings', JSON.stringify(settings));
    }

    /**
     * Get timer state from localStorage
     */
    getTimerState() {
        const state = localStorage.getItem('chillpomodoro-state');
        return state ? JSON.parse(state) : null;
    }

    /**
     * Save timer state to localStorage
     */
    saveTimerState(state) {
        localStorage.setItem('chillpomodoro-state', JSON.stringify(state));
    }

    /**
     * Add a session to history
     */
    addSession(session) {
        const state = this.getTimerState() || {
            completedPomodoros: 0,
            totalWorkTime: 0,
            totalBreakTime: 0,
            currentStreak: 0,
            sessionHistory: []
        };

        state.sessionHistory.unshift(session);

        // Keep only last 100 sessions
        if (state.sessionHistory.length > 100) {
            state.sessionHistory = state.sessionHistory.slice(0, 100);
        }

        // Update statistics
        if (session.type === 'work' && session.completed) {
            state.completedPomodoros++;
            state.totalWorkTime += session.duration;
        } else if (session.type !== 'work') {
            state.totalBreakTime += session.duration;
        }

        // Update streak
        this.updateStreak(state);

        this.saveTimerState(state);
        return state;
    }

    /**
     * Update current streak
     */
    updateStreak(state) {
        if (state.sessionHistory.length === 0) return;

        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        const todaysSessions = state.sessionHistory.filter(s =>
            new Date(s.timestamp).toDateString() === today && s.type === 'work' && s.completed
        );

        const yesterdaysSessions = state.sessionHistory.filter(s =>
            new Date(s.timestamp).toDateString() === yesterday && s.type === 'work' && s.completed
        );

        if (todaysSessions.length > 0) {
            if (yesterdaysSessions.length > 0 || state.currentStreak === 0) {
                // Calculate consecutive days
                const uniqueDays = new Set();
                let consecutiveDays = 0;

                for (const session of state.sessionHistory) {
                    if (session.type === 'work' && session.completed) {
                        const day = new Date(session.timestamp).toDateString();
                        uniqueDays.add(day);
                    }
                }

                const daysSorted = Array.from(uniqueDays).sort((a, b) => new Date(b) - new Date(a));
                consecutiveDays = 1;

                for (let i = 1; i < daysSorted.length; i++) {
                    const prevDay = new Date(daysSorted[i - 1]);
                    const currDay = new Date(daysSorted[i]);
                    const diffDays = (prevDay - currDay) / (1000 * 60 * 60 * 24);

                    if (diffDays === 1) {
                        consecutiveDays++;
                    } else {
                        break;
                    }
                }

                state.currentStreak = consecutiveDays;
            }
        } else if (yesterdaysSessions.length === 0) {
            state.currentStreak = 0;
        }
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        // Clear localStorage
        localStorage.removeItem('chillpomodoro-settings');
        localStorage.removeItem('chillpomodoro-state');
        localStorage.removeItem('chillpomodoro-hidden-time');
        localStorage.removeItem('chillpomodoro-active-focus-task');
        localStorage.removeItem('chillpomodoro-study-goals');

        // Clear IndexedDB
        await this.ensureDB();
        const stores = ['animations', 'sounds', 'presets', 'schedules', 'studyTasks', 'focusSessions', 'exerciseLibrary', 'workoutPrograms', 'workoutSessions'];

        for (const storeName of stores) {
            await this.clearStore(storeName);
        }
    }

    /**
     * Clear a specific store
     */
    async clearStore(storeName) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ===== IndexedDB CRUD Methods =====

    /**
     * Add item to IndexedDB store
     */
    async addItem(storeName, item) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Remove id if it exists (let autoIncrement handle it)
            const itemToAdd = { ...item };
            delete itemToAdd.id;

            const request = store.add(itemToAdd);

            request.onsuccess = () => {
                resolve(request.result); // Returns the generated id
            };

            request.onerror = () => {
                console.error(`Error adding item to ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get item from IndexedDB store
     */
    async getItem(storeName, id) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all items from IndexedDB store
     */
    async getAllItems(storeName) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all items matching an index value
     */
    async getItemsByIndex(storeName, indexName, value) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get first item matching an index value
     */
    async getFirstItemByIndex(storeName, indexName, value) {
        const items = await this.getItemsByIndex(storeName, indexName, value);
        return items[0] || null;
    }

    /**
     * Update item in IndexedDB store
     */
    async updateItem(storeName, item) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete item from IndexedDB store
     */
    async deleteItem(storeName, id) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Schedule-specific indexed queries
     */
    async getSchedulesByType(type) {
        return this.getItemsByIndex('schedules', 'type', type);
    }

    async getScheduleByTypeAndDate(type, date) {
        return this.getFirstItemByIndex('schedules', 'type_date', [type, date]);
    }

    async getStudyTasksByStatus(status) {
        return this.getItemsByIndex('studyTasks', 'status', status);
    }

    async getFocusSessionsByTask(taskId) {
        return this.getItemsByIndex('focusSessions', 'taskId', taskId);
    }

    async getExerciseBySlug(slug) {
        return this.getFirstItemByIndex('exerciseLibrary', 'slug', slug);
    }

    async getWorkoutPrograms() {
        return this.getAllItems('workoutPrograms');
    }

    async getActiveWorkoutPrograms() {
        const programs = await this.getWorkoutPrograms();
        return programs.filter(program => !program.isArchived);
    }

    async getWorkoutSessionsByDate(scheduledDate) {
        return this.getItemsByIndex('workoutSessions', 'scheduledDate', scheduledDate);
    }

    async getWorkoutSessionsByStatus(status) {
        return this.getItemsByIndex('workoutSessions', 'status', status);
    }

    async getWorkoutSessionsByProgram(programId) {
        return this.getItemsByIndex('workoutSessions', 'programId', programId);
    }

    // ===== Helper Methods for File Handling =====

    /**
     * Convert file to Blob (for IndexedDB storage)
     */
    fileToBlob(file) {
        return file; // File inherits from Blob, can store directly
    }

    /**
     * Convert file to Base64 (for smaller files)
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Create Blob URL from Blob
     */
    createBlobURL(blob) {
        if (!blob) return null;
        return URL.createObjectURL(blob);
    }

    /**
     * Revoke Blob URL to free memory
     */
    revokeBlobURL(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Determine if file should use Blob storage
     * Videos and large files (>5MB) should use Blob
     */
    shouldUseBlob(file) {
        return file.type.startsWith('video/') || file.size > 5 * 1024 * 1024;
    }

    /**
     * Validate file size
     */
    isFileSizeValid(file, maxSizeMB) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    }

    /**
     * Export all data as JSON
     */
    async exportData() {
        const animations = await this.getAllItems('animations');
        const sounds = await this.getAllItems('sounds');
        const presets = await this.getAllItems('presets');
        const schedules = await this.getAllItems('schedules');
        const studyTasks = await this.getAllItems('studyTasks');
        const focusSessions = await this.getAllItems('focusSessions');
        const exerciseLibrary = await this.getAllItems('exerciseLibrary');
        const workoutPrograms = await this.getAllItems('workoutPrograms');
        const workoutSessions = await this.getAllItems('workoutSessions');
        const settings = this.getSettings();
        const state = this.getTimerState();
        const studyGoals = localStorage.getItem('chillpomodoro-study-goals');

        // Convert Blobs to Base64 for export
        const exportAnimations = await Promise.all(animations.map(async (item) => {
            if (item.data instanceof Blob) {
                return {
                    ...item,
                    data: await this.fileToBase64(item.data),
                    isBlob: false
                };
            }
            return item;
        }));

        const exportSounds = await Promise.all(sounds.map(async (item) => {
            if (item.data instanceof Blob) {
                return {
                    ...item,
                    data: await this.fileToBase64(item.data),
                    isBlob: false
                };
            }
            return item;
        }));

        const data = {
            animations: exportAnimations,
            sounds: exportSounds,
            presets,
            schedules,
            studyTasks,
            focusSessions,
            exerciseLibrary,
            workoutPrograms,
            workoutSessions,
            studyGoals: studyGoals ? JSON.parse(studyGoals) : null,
            settings,
            state,
            exportDate: new Date().toISOString(),
            version: this.dbVersion
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chillpomodoro-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Create and export singleton instance
export const storageManager = new StorageManager();

