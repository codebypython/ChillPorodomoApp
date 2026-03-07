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
import { ScheduleManager } from './classes/ScheduleManager.js';
import { ScheduleRenderer } from './utils/scheduleRenderer.js';
import { DailyActivityManager } from './classes/DailyActivityManager.js';
import { DailyScheduleRenderer } from './utils/DailyScheduleRenderer.js';
import { ActivityScheduler } from './utils/ActivityScheduler.js';
import { ScheduleValidator } from './utils/ScheduleValidator.js';
import { notificationService } from './services/NotificationService.js';
import { TaskPlannerManager } from './classes/TaskPlannerManager.js';
import { ScheduleController } from './controllers/ScheduleController.js';
import { formatDateKey } from './utils/TimeUtils.js';
import { WorkoutManager } from './classes/WorkoutManager.js';
import { WorkoutRenderer } from './utils/WorkoutRenderer.js';
import { WorkoutController } from './controllers/WorkoutController.js';

// Silence verbose debug noise while preserving real errors.
const console = {
    ...globalThis.console,
    log: () => {},
    warn: () => {}
};

class ChillPomodoroApp {
    constructor() {
        this.settings = null;
        this.audioManager = null;
        this.backgroundManager = null;
        this.timer = null;
        this.libraryManager = null;
        this.presetManager = null;
        this.scheduleManager = null;
        this.scheduleRenderer = null;
        this.dailyActivityManager = null;
        this.dailyScheduleRenderer = null;
        this.activityScheduler = null;
        this.scheduleValidator = null;
        this.taskPlannerManager = null;
        this.scheduleController = null;
        this.workoutManager = null;
        this.workoutRenderer = null;
        this.workoutController = null;
        this.currentTab = 'timer';
        this.currentScheduleType = 'class'; // 'class' or 'life'
        this.libraryDirty = false;
        this.classSchedulesDirty = true;
        this.dailySchedulesDirty = true;
        this.exerciseSchedulesDirty = true;
        this.activeFocusTaskId = null;
        this.currentFocusSessionStart = null;
        this.headerDropdownsInitialized = false;
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

            this.scheduleManager = new ScheduleManager();
            await this.scheduleManager.loadSchedules();
            this.scheduleRenderer = new ScheduleRenderer(this.scheduleManager);
            
            this.activityScheduler = new ActivityScheduler();
            this.scheduleValidator = new ScheduleValidator();
            this.dailyActivityManager = new DailyActivityManager(this.scheduleManager);
            this.dailyScheduleRenderer = new DailyScheduleRenderer(this.dailyActivityManager, this.activityScheduler);
            this.taskPlannerManager = new TaskPlannerManager();
            this.workoutManager = new WorkoutManager(this.scheduleManager, this.dailyActivityManager);
            await this.workoutManager.ensureSeedData();
            this.workoutRenderer = new WorkoutRenderer();
            this.scheduleController = new ScheduleController({
                scheduleManager: this.scheduleManager,
                scheduleRenderer: this.scheduleRenderer,
                dailyActivityManager: this.dailyActivityManager,
                dailyScheduleRenderer: this.dailyScheduleRenderer,
                notifier: (message, type) => this.showNotification(message, type),
                onDailyScheduleOpened: (schedule) => this.setupDailyScheduleActions(schedule)
            });
            this.workoutController = new WorkoutController({
                workoutManager: this.workoutManager,
                workoutRenderer: this.workoutRenderer,
                notifier: (message, type) => this.showNotification(message, type),
                onWorkoutUpdated: async () => {
                    this.exerciseSchedulesDirty = true;
                    await this.updateStatistics();
                }
            });

            // Seed default data on first run
            await this.seedDefaultData();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize UI
            this.initializeUI();

            // Hide loading screen
            loading.classList.add('hidden');

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

        document.addEventListener('timer:session-complete', (event) => {
            this.handleTimerSessionComplete(event.detail);
        });

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
            this.settings.backgroundMusicVolume = volume;
            this.settings.scheduleSave();
            this.audioManager.setBackgroundMusicVolume(volume);
        });

        document.getElementById('backgroundOpacity')?.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            document.getElementById('opacityDisplay').textContent = opacity + '%';
            this.settings.backgroundOpacity = opacity;
            this.settings.scheduleSave();
            this.backgroundManager.setBackgroundOpacity();
        });

        // Background type change
        document.getElementById('backgroundType')?.addEventListener('change', (e) => {
            this.settings.backgroundType = e.target.value;
            this.settings.scheduleSave();
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

        document.getElementById('plannerAddTaskBtn')?.addEventListener('click', () => {
            this.createTaskFromPlanner();
        });

        document.getElementById('plannerSaveGoalsBtn')?.addEventListener('click', () => {
            this.saveStudyGoals();
        });

        document.getElementById('focusTaskSelect')?.addEventListener('change', (e) => {
            const value = e.target.value ? parseInt(e.target.value, 10) : null;
            this.setActiveFocusTask(value);
        });

        document.getElementById('clearFocusTaskBtn')?.addEventListener('click', () => {
            this.setActiveFocusTask(null);
        });

        // Schedule actions
        this.setupScheduleListeners();

        // Header dropdowns
        this.setupHeaderDropdowns();
    }

    /**
     * Setup schedule event listeners
     */
    setupScheduleListeners() {
        // Upload schedule button
        document.getElementById('uploadScheduleBtn')?.addEventListener('click', () => {
            this.scheduleRenderer.showUploadModal(async (file, scheduleName) => {
                await this.handleScheduleUpload(file, scheduleName);
            });
        });

        // Close schedule upload modal
        document.getElementById('closeScheduleUploadModal')?.addEventListener('click', () => {
            this.scheduleRenderer.hideUploadModal();
        });

        // Schedule type buttons
        document.querySelectorAll('.schedule-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.disabled) return;
                
                const scheduleType = btn.dataset.type;
                this.currentScheduleType = scheduleType;
                
                // Update active state
                document.querySelectorAll('.schedule-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show/hide appropriate sections
                this.switchScheduleType(scheduleType);
            });
        });

        // Daily schedule buttons
        document.getElementById('createDailyScheduleBtn')?.addEventListener('click', () => {
            this.showCreateDailyScheduleForm();
        });

        document.getElementById('viewTodayScheduleBtn')?.addEventListener('click', () => {
            this.viewTodaySchedule();
        });
    }

    /**
     * Handle schedule file upload
     */
    async handleScheduleUpload(file, scheduleName) {
        const scheduleList = document.getElementById('scheduleList');
        const scheduleTableContainer = document.getElementById('scheduleTableContainer');
        
        try {
            // Show loading
            this.scheduleRenderer.showLoading(scheduleList, 'Đang xử lý file Excel...');

            // Create schedule
            const schedule = await this.scheduleManager.createClassScheduleFromXLSX(file, scheduleName);

            console.log('=== IN handleScheduleUpload - BEFORE RENDER ===');
            console.log('Schedule object:', {
                id: schedule.id,
                name: schedule.name,
                coursesCount: schedule.courses?.length || 0,
                hasCourses: !!schedule.courses,
                coursesIsArray: Array.isArray(schedule.courses)
            });

            // CRITICAL: Verify schedule has courses (we don't store weeklySchedule anymore)
            if (!schedule.courses || !Array.isArray(schedule.courses) || schedule.courses.length === 0) {
                console.error('ERROR: Schedule has no courses!', schedule);
                throw new Error('Lịch học không có dữ liệu môn học.');
            }

            // Verify courses have valid scheduleInfo (now an array)
            const validCourses = schedule.courses.filter(c => 
                c.scheduleInfo && 
                Array.isArray(c.scheduleInfo) && 
                c.scheduleInfo.length > 0 &&
                c.scheduleInfo.some(entry => entry.day && entry.periods && entry.periods.length > 0)
            );
            if (validCourses.length === 0) {
                console.error('ERROR: No courses with valid scheduleInfo!');
                throw new Error('Không có môn học nào có thông tin lịch học hợp lệ.');
            }

            console.log(`Schedule has ${validCourses.length} valid courses out of ${schedule.courses.length} total`);

            // Show success
            this.showNotification('Tạo lịch học thành công!', 'success');

            // Render schedule list
            this.classSchedulesDirty = true;
            await this.renderSchedules();

            // Auto show the schedule - render directly from courses
            console.log('=== RENDERING SCHEDULE ===');
            console.log('Using schedule object with courses:', {
                totalCourses: schedule.courses.length,
                validCourses: validCourses.length
            });
            
            this.scheduleManager.currentSchedule = schedule;
            this.scheduleRenderer.renderWeeklySchedule(scheduleTableContainer, schedule);
        } catch (error) {
            console.error('Error uploading schedule:', error);
            this.scheduleRenderer.showError(scheduleList, error.message || 'Có lỗi xảy ra khi tạo lịch học.');
            this.showNotification('Lỗi: ' + (error.message || 'Không thể tạo lịch học'), 'danger');
        }
    }

    /**
     * Render schedules list
     */
    async renderSchedules() {
        await this.scheduleController.renderClassSchedules();
        this.classSchedulesDirty = false;
    }

    /**
     * Switch between schedule types
     */
    switchScheduleType(type) {
        const classActions = document.getElementById('classScheduleActions');
        const dailyActions = document.getElementById('dailyScheduleActions');
        const exerciseActions = document.getElementById('exerciseScheduleActions');
        const scheduleList = document.getElementById('scheduleList');
        const dailyScheduleList = document.getElementById('dailyScheduleList');
        const exerciseProgramList = document.getElementById('exerciseProgramList');
        const exerciseSessionList = document.getElementById('exerciseSessionList');
        const scheduleTableContainer = document.getElementById('scheduleTableContainer');
        const dailyScheduleContainer = document.getElementById('dailyScheduleContainer');
        const exerciseScheduleContainer = document.getElementById('exerciseScheduleContainer');
        this.currentScheduleType = type;

        if (type === 'class') {
            if (classActions) classActions.style.display = 'flex';
            if (dailyActions) dailyActions.style.display = 'none';
            if (exerciseActions) exerciseActions.style.display = 'none';
            if (scheduleList) scheduleList.style.display = 'grid';
            if (dailyScheduleList) dailyScheduleList.style.display = 'none';
            if (exerciseProgramList) exerciseProgramList.style.display = 'none';
            if (exerciseSessionList) exerciseSessionList.style.display = 'none';
            if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
            if (dailyScheduleContainer) dailyScheduleContainer.style.display = 'none';
            if (exerciseScheduleContainer) exerciseScheduleContainer.style.display = 'none';
            if (this.classSchedulesDirty) {
                this.renderSchedules();
            }
        } else if (type === 'life') {
            if (classActions) classActions.style.display = 'none';
            if (dailyActions) dailyActions.style.display = 'flex';
            if (exerciseActions) exerciseActions.style.display = 'none';
            if (scheduleList) scheduleList.style.display = 'none';
            if (dailyScheduleList) dailyScheduleList.style.display = 'grid';
            if (exerciseProgramList) exerciseProgramList.style.display = 'none';
            if (exerciseSessionList) exerciseSessionList.style.display = 'none';
            if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
            if (dailyScheduleContainer) dailyScheduleContainer.style.display = 'none';
            if (exerciseScheduleContainer) exerciseScheduleContainer.style.display = 'none';
            if (this.dailySchedulesDirty) {
                this.renderDailySchedules();
            }
        } else if (type === 'exercise') {
            if (classActions) classActions.style.display = 'none';
            if (dailyActions) dailyActions.style.display = 'none';
            if (exerciseActions) exerciseActions.style.display = 'block';
            if (scheduleList) scheduleList.style.display = 'none';
            if (dailyScheduleList) dailyScheduleList.style.display = 'none';
            if (exerciseProgramList) exerciseProgramList.style.display = 'grid';
            if (exerciseSessionList) exerciseSessionList.style.display = 'grid';
            if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
            if (dailyScheduleContainer) dailyScheduleContainer.style.display = 'none';
            if (exerciseScheduleContainer) exerciseScheduleContainer.style.display = 'block';
            if (this.exerciseSchedulesDirty) {
                this.renderExerciseSchedules();
            }
        }
    }

    /**
     * Render daily schedules list
     */
    async renderDailySchedules() {
        await this.scheduleController.renderDailySchedules();
        this.dailySchedulesDirty = false;
    }

    async renderExerciseSchedules() {
        await this.workoutController.renderExerciseWorkspace();
        this.exerciseSchedulesDirty = false;
    }

    /**
     * Show create daily schedule form
     */
    async showCreateDailyScheduleForm() {
        const container = document.getElementById('dailyScheduleContainer');
        if (!container) return;

        // Default to tomorrow (22h tối hôm nay tạo cho ngày mai)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const plannedTasks = await this.taskPlannerManager.getTasksForPlanning(tomorrow);
        const recommendedWorkouts = (await this.workoutManager.getSessionsForDate(tomorrow))
            .filter(session => session.status === 'planned');
        this.dailyScheduleRenderer.renderCreateForm(container, tomorrow, plannedTasks, recommendedWorkouts);
        container.style.display = 'block';

        this.setupCreateDailyScheduleForm(tomorrow);
    }

    /**
     * Setup create daily schedule form handlers
     */
    setupCreateDailyScheduleForm(targetDate) {
        console.log('=== setupCreateDailyScheduleForm called ===');
        console.log('Target date:', targetDate);
        
        // Wait a bit for DOM to be ready
        setTimeout(() => {
            this.setupFormHandlers(targetDate);
        }, 100);
    }

    /**
     * Setup form handlers (internal)
     */
    setupFormHandlers(targetDate) {
        console.log('Setting up form handlers...');
        
        // Expand/collapse course details
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const courseId = btn.dataset.courseId;
                const details = document.querySelector(`.course-details[data-course-id="${courseId}"]`);
                if (details) {
                    const isHidden = details.style.display === 'none';
                    details.style.display = isHidden ? 'block' : 'none';
                    const icon = btn.querySelector('.expand-icon');
                    if (icon) icon.textContent = isHidden ? '▲' : '▼';
                }
            });
        });

        // Expand/collapse activity details
        document.querySelectorAll('.activity-select-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const activityId = checkbox.dataset.activityId;
                const details = document.querySelector(`.activity-details[data-activity-id="${activityId}"]`);
                if (details) {
                    details.style.display = checkbox.checked ? 'block' : 'none';
                }
            });
        });

        document.querySelectorAll('.planned-task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const taskId = checkbox.dataset.taskId;
                const details = document.querySelector(`.activity-details[data-task-id="${taskId}"]`);
                if (details) {
                    details.style.display = checkbox.checked ? 'block' : 'none';
                }
            });
        });

        document.querySelectorAll('.recommended-workout-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const sessionId = checkbox.dataset.workoutSessionId;
                const details = document.querySelector(`.activity-details[data-workout-session-id="${sessionId}"]`);
                if (details) {
                    details.style.display = checkbox.checked ? 'block' : 'none';
                }
            });
        });

        // Add custom course
        const addCustomCourseBtn = document.getElementById('addCustomCourseBtn');
        if (addCustomCourseBtn) {
            addCustomCourseBtn.addEventListener('click', () => {
                this.addCustomCourse();
            });
        }

        // Add custom activity
        const addActivityBtn = document.getElementById('addActivityBtn');
        if (addActivityBtn) {
            addActivityBtn.addEventListener('click', () => {
                this.addCustomActivity();
            });
        }

        // Cancel
        const cancelBtn = document.getElementById('cancelScheduleBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                const container = document.getElementById('dailyScheduleContainer');
                if (container) container.style.display = 'none';
            });
        }

        // Save draft (TODO: implement)
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                this.showNotification('Tính năng lưu nháp sẽ sớm có mặt', 'info');
            });
        }

        // Create schedule
        const createBtn = document.getElementById('createScheduleBtn');
        console.log('Looking for createScheduleBtn:', createBtn);
        
        if (createBtn) {
            // Remove existing listeners to avoid duplicates
            const newBtn = createBtn.cloneNode(true);
            createBtn.parentNode.replaceChild(newBtn, createBtn);
            
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('=== Create schedule button clicked ===');
                console.log('Target date:', targetDate);
                console.log('ScheduleValidator available:', !!this.scheduleValidator);
                
                // Disable button to prevent double-click
                newBtn.disabled = true;
                newBtn.textContent = '⏳ Đang tạo...';
                
                try {
                    if (!this.scheduleValidator) {
                        throw new Error('ScheduleValidator chưa được khởi tạo');
                    }
                    
                    await this.createDailySchedule(targetDate);
                    
                    // Re-enable button
                    newBtn.disabled = false;
                    newBtn.innerHTML = '✅ Tạo Lịch';
                } catch (error) {
                    console.error('Error in createDailySchedule:', error);
                    console.error('Error stack:', error.stack);
                    
                    // Re-enable button on error
                    newBtn.disabled = false;
                    newBtn.innerHTML = '✅ Tạo Lịch';
                    
                    this.showNotification('Lỗi khi tạo lịch: ' + (error.message || 'Lỗi không xác định'), 'danger');
                }
            });
            
            console.log('Event listener attached to createScheduleBtn');
        } else {
            console.error('createScheduleBtn not found!');
            console.error('Available buttons:', document.querySelectorAll('button').length);
            console.error('Container HTML:', document.getElementById('dailyScheduleContainer')?.innerHTML?.substring(0, 500));
        }
    }

    /**
     * Create daily schedule from form
     */
    async createDailySchedule(targetDate) {
        try {
            // Step 1: Validate date
            const dateValidation = this.scheduleValidator.validateDate(targetDate);
            if (!dateValidation.isValid) {
                this.showNotification(dateValidation.errors.join('. '), 'warning');
                return;
            }

            // Step 2: Check if schedule already exists for this date
            const existingSchedule = await this.dailyActivityManager.getDailyActivitySchedule(targetDate);
            if (existingSchedule) {
                const confirmReplace = confirm(
                    `Đã có lịch sinh hoạt cho ngày ${this.dailyScheduleRenderer.formatDateDisplay(targetDate)}. Bạn có muốn thay thế không?`
                );
                if (!confirmReplace) {
                    return;
                }
                // Delete existing schedule
                await this.dailyActivityManager.deleteDailyActivitySchedule(existingSchedule.id);
            }

            // Step 3: Collect and sanitize activities
            const activities = [];
            let activityIdCounter = 1;

            // Collect course activities
            document.querySelectorAll('.course-select-checkbox:checked').forEach(checkbox => {
                const courseId = checkbox.dataset.courseId;
                const courseItem = checkbox.closest('.course-selection-item');
                if (!courseItem) return;
                
                const topicInput = courseItem.querySelector('.course-topic-input');
                const contentInput = courseItem.querySelector('.course-content-input');
                const prioritySelect = courseItem.querySelector('.course-priority-select');
                const durationInput = courseItem.querySelector('.course-duration-input');
                const timeSlotSelect = courseItem.querySelector('.course-timeslot-select');
                const courseNameEl = courseItem.querySelector('.course-name');
                
                let topic = topicInput?.value || '';
                let content = contentInput?.value || '';
                const priority = prioritySelect?.value || 'medium';
                let duration = parseInt(durationInput?.value || 60);
                const timeSlot = timeSlotSelect?.value || 'auto';
                let courseName = courseNameEl?.textContent || 'Môn học';

                // Sanitize inputs
                topic = this.scheduleValidator.sanitizeString(topic);
                content = this.scheduleValidator.sanitizeString(content);
                courseName = this.scheduleValidator.sanitizeString(courseName);
                
                // Validate and clamp duration
                if (isNaN(duration) || duration < 15) duration = 15;
                if (duration > 480) duration = 480;

                const activity = {
                    id: `activity-${activityIdCounter++}`,
                    type: 'study',
                    courseId: courseId,
                    courseName: courseName,
                    topic: topic,
                    content: content,
                    priority: priority,
                    estimatedDuration: duration,
                    timeSlot: timeSlot === 'auto' ? null : timeSlot,
                    status: 'planned'
                };

                // Validate activity
                const validation = this.scheduleValidator.validateActivity(activity);
                if (!validation.isValid) {
                    console.warn(`Activity validation failed: ${validation.errors.join(', ')}`);
                    this.showNotification(
                        `Lỗi trong hoạt động "${courseName}": ${validation.errors.join(', ')}`,
                        'warning'
                    );
                    return; // Skip this activity
                }

                activities.push(this.scheduleValidator.sanitizeActivity(activity));
            });

            // Collect other activities
            document.querySelectorAll('.activity-select-checkbox:checked').forEach(checkbox => {
                const activityId = checkbox.dataset.activityId;
                const activityItem = checkbox.closest('.other-activity-item');
                if (!activityItem) return;
                
                const durationInput = activityItem.querySelector('.activity-duration-input');
                const timeSlotSelect = activityItem.querySelector('.activity-timeslot-select');
                const activityNameEl = activityItem.querySelector('.activity-name');
                
                let duration = parseInt(durationInput?.value || 30);
                const timeSlot = timeSlotSelect?.value || 'auto';
                let activityName = activityNameEl?.textContent || 'Hoạt động';
                const activityType = activityItem.dataset.activityId || 'personal';

                // Sanitize inputs
                activityName = this.scheduleValidator.sanitizeString(activityName);
                
                // Validate and clamp duration
                if (isNaN(duration) || duration < 15) duration = 15;
                if (duration > 480) duration = 480;

                const activity = {
                    id: `activity-${activityIdCounter++}`,
                    type: activityType,
                    name: activityName,
                    priority: 'medium',
                    estimatedDuration: duration,
                    timeSlot: timeSlot === 'auto' ? null : timeSlot,
                    status: 'planned'
                };

                // Validate activity
                const validation = this.scheduleValidator.validateActivity(activity);
                if (!validation.isValid) {
                    console.warn(`Activity validation failed: ${validation.errors.join(', ')}`);
                    this.showNotification(
                        `Lỗi trong hoạt động "${activityName}": ${validation.errors.join(', ')}`,
                        'warning'
                    );
                    return; // Skip this activity
                }

                activities.push(this.scheduleValidator.sanitizeActivity(activity));
            });

            // Collect planned tasks
            document.querySelectorAll('.planned-task-checkbox:checked').forEach(checkbox => {
                const taskId = checkbox.dataset.taskId;
                const taskItem = checkbox.closest('.other-activity-item');
                if (!taskItem) return;

                const titleEl = taskItem.querySelector('.activity-name');
                const subjectInput = taskItem.querySelector('.planned-task-subject');
                const durationInput = taskItem.querySelector('.planned-task-duration');
                const timeSlotSelect = taskItem.querySelector('.planned-task-timeslot');
                const prioritySelect = taskItem.querySelector('.planned-task-priority');
                const focusSelect = taskItem.querySelector('.planned-task-focus');

                const taskTitle = this.scheduleValidator.sanitizeString(titleEl?.textContent || 'Task học tập');
                const subject = this.scheduleValidator.sanitizeString(subjectInput?.value || 'Khác');
                let duration = parseInt(durationInput?.value || 45, 10);
                if (isNaN(duration) || duration < 15) duration = 15;
                if (duration > 480) duration = 480;

                const activity = {
                    id: `activity-${activityIdCounter++}`,
                    taskId,
                    taskTitle,
                    type: 'study',
                    courseName: subject,
                    topic: taskTitle,
                    content: `Task Planner`,
                    priority: prioritySelect?.value || 'medium',
                    focusLevel: focusSelect?.value || 'medium',
                    estimatedDuration: duration,
                    timeSlot: timeSlotSelect?.value === 'auto' ? null : timeSlotSelect?.value,
                    status: 'planned'
                };

                const validation = this.scheduleValidator.validateActivity(activity);
                if (!validation.isValid) {
                    this.showNotification(
                        `Lỗi trong task "${taskTitle}": ${validation.errors.join(', ')}`,
                        'warning'
                    );
                    return;
                }

                activities.push(this.scheduleValidator.sanitizeActivity(activity));
            });

            for (const checkbox of document.querySelectorAll('.recommended-workout-checkbox:checked')) {
                const sessionId = parseInt(checkbox.dataset.workoutSessionId, 10);
                const workoutSession = await this.workoutManager.getWorkoutSession(sessionId);
                const timeSlotSelect = document.querySelector(`.recommended-workout-timeslot[data-workout-session-id="${sessionId}"]`);

                if (!workoutSession) {
                    continue;
                }

                const activity = {
                    id: `activity-${activityIdCounter++}`,
                    type: 'workout',
                    name: workoutSession.label,
                    topic: workoutSession.dayFocus,
                    content: `${workoutSession.exercises.length} bài tập • ${workoutSession.estimatedDuration} phút`,
                    priority: 'high',
                    estimatedDuration: workoutSession.estimatedDuration,
                    timeSlot: timeSlotSelect?.value === 'auto' ? null : timeSlotSelect?.value,
                    status: 'planned',
                    workoutSessionId: workoutSession.id,
                    workoutProgramId: workoutSession.programId
                };

                const validation = this.scheduleValidator.validateActivity(activity);
                if (!validation.isValid) {
                    this.showNotification(
                        `Lỗi trong workout "${workoutSession.label}": ${validation.errors.join(', ')}`,
                        'warning'
                    );
                    continue;
                }

                activities.push(this.scheduleValidator.sanitizeActivity(activity));
            }

            console.log('Collected activities:', activities);
            
            // Step 4: Validate activities array
            const activitiesValidation = this.scheduleValidator.validateActivities(activities);
            if (!activitiesValidation.isValid) {
                this.showNotification(activitiesValidation.errors.join('. '), 'warning');
                return;
            }

            // Step 5: Validate notes
            const notesEl = document.getElementById('scheduleNotes');
            let notes = notesEl?.value || '';
            notes = this.scheduleValidator.sanitizeString(notes);
            
            const notesValidation = this.scheduleValidator.validateNotes(notes);
            if (!notesValidation.isValid) {
                this.showNotification(notesValidation.errors.join('. '), 'warning');
                return;
            }

            // Step 6: Calculate time slots
            console.log('Calculating time slots...');
            const timeSlots = this.dailyActivityManager.calculateTimeSlots(targetDate);
            console.log('Time slots:', timeSlots);
            
            // Validate time slots
            if (!timeSlots.morningSlot || !timeSlots.afternoonSlot) {
                throw new Error('Không thể tính toán khung giờ. Vui lòng kiểm tra lại lịch học.');
            }

            // Step 7: Separate activities by time slot
            const morningActivities = activities.filter(a => 
                a.timeSlot === 'morning' || (!a.timeSlot && (a.type === 'exercise' || a.type === 'meal'))
            );
            const afternoonActivities = activities.filter(a => 
                a.timeSlot === 'afternoon' || (!a.timeSlot && a.type !== 'exercise' && a.type !== 'meal')
            );

            // Step 8: Validate time slot capacity
            const morningValidation = this.scheduleValidator.validateTimeSlotCapacity(
                morningActivities,
                timeSlots.morningSlot
            );
            const afternoonValidation = this.scheduleValidator.validateTimeSlotCapacity(
                afternoonActivities,
                timeSlots.afternoonSlot
            );

            // Warn if activities don't fit
            const warnings = [];
            if (!morningValidation.canFit && morningActivities.length > 0) {
                warnings.push(
                    `Buổi sáng: Không đủ thời gian. Cần ${morningValidation.requiredTime} phút, có ${morningValidation.availableTime} phút. Thiếu ${morningValidation.overflow} phút.`
                );
            }
            if (!afternoonValidation.canFit && afternoonActivities.length > 0) {
                warnings.push(
                    `Buổi chiều: Không đủ thời gian. Cần ${afternoonValidation.requiredTime} phút, có ${afternoonValidation.availableTime} phút. Thiếu ${afternoonValidation.overflow} phút.`
                );
            }

            if (warnings.length > 0) {
                const proceed = confirm(
                    warnings.join('\n') + 
                    '\n\nMột số hoạt động có thể không được sắp xếp vào lịch. Bạn có muốn tiếp tục không?'
                );
                if (!proceed) {
                    return;
                }
            }

            // Step 9: Schedule activities
            const scheduledMorning = this.activityScheduler.scheduleActivities(
                morningActivities,
                timeSlots.morningSlot
            );
            const scheduledAfternoon = this.activityScheduler.scheduleActivities(
                afternoonActivities,
                timeSlots.afternoonSlot
            );

            // Check if any activities were skipped
            const skippedMorning = morningActivities.length - scheduledMorning.length;
            const skippedAfternoon = afternoonActivities.length - scheduledAfternoon.length;

            if (skippedMorning > 0 || skippedAfternoon > 0) {
                const skippedCount = skippedMorning + skippedAfternoon;
                this.showNotification(
                    `Đã tạo lịch nhưng ${skippedCount} hoạt động không thể sắp xếp do thiếu thời gian.`,
                    'warning'
                );
            }

            // Step 10: Combine all scheduled activities
            const allScheduledActivities = [...scheduledMorning, ...scheduledAfternoon];

            if (allScheduledActivities.length === 0) {
                this.showNotification('Không có hoạt động nào được sắp xếp vào lịch. Vui lòng kiểm tra lại thời gian.', 'warning');
                return;
            }

            // Step 11: Create schedule
            console.log('Creating schedule in IndexedDB...');
            const schedule = await this.dailyActivityManager.createDailyActivitySchedule(
                targetDate,
                allScheduledActivities,
                notes
            );
            console.log('Schedule created successfully:', schedule);

            this.showNotification('Đã tạo lịch sinh hoạt thành công!', 'success');
            
            // Step 12: Render the created schedule
            const container = document.getElementById('dailyScheduleContainer');
            if (container) {
                console.log('Rendering schedule view...');
                this.dailyScheduleRenderer.renderDailySchedule(container, schedule);
                this.setupDailyScheduleActions(schedule);
            } else {
                console.error('dailyScheduleContainer not found!');
            }
            
            // Step 13: Refresh list
            console.log('Refreshing daily schedules list...');
            await this.syncTasksFromSchedule(schedule);
            await this.syncWorkoutSessionsFromSchedule(schedule);
            this.dailySchedulesDirty = true;
            await this.renderDailySchedules();
            console.log('=== createDailySchedule completed successfully ===');

        } catch (error) {
            console.error('Error creating daily schedule:', error);
            console.error('Error stack:', error.stack);
            this.showNotification(
                error.message || 'Không thể tạo lịch sinh hoạt. Vui lòng thử lại.',
                'danger'
            );
        }
    }

    /**
     * Setup daily schedule actions
     */
    setupDailyScheduleActions(schedule) {
        this.scheduleController.showDailySchedule(schedule);
        this.scheduleController.bindDailyScheduleActions({
            onActivityStatus: async (selectedSchedule, activityId, status) => {
                try {
                    await this.dailyActivityManager.updateActivityStatus(selectedSchedule.id, activityId, status);
                    const updated = await this.scheduleController.refreshVisibleDailySchedule();
                    if (updated) {
                        await this.syncTasksFromSchedule(updated);
                        await this.syncWorkoutSessionsFromSchedule(updated);
                    }
                    this.dailySchedulesDirty = true;
                    await this.renderDailySchedules();
                } catch (error) {
                    console.error('Error updating activity status:', error);
                    this.showNotification('Không thể cập nhật trạng thái', 'danger');
                }
            },
            onEdit: () => {
                this.showNotification('Tính năng chỉnh sửa sẽ sớm có mặt', 'info');
            },
            onDelete: async (selectedSchedule) => {
                if (!confirm('Bạn có chắc muốn xóa lịch sinh hoạt này?')) {
                    return;
                }

                try {
                    await this.dailyActivityManager.deleteDailyActivitySchedule(selectedSchedule.id);
                    const container = document.getElementById('dailyScheduleContainer');
                    if (container) container.style.display = 'none';
                    this.dailySchedulesDirty = true;
                    await this.renderDailySchedules();
                    this.showNotification('Đã xóa lịch sinh hoạt', 'success');
                } catch (error) {
                    console.error('Error deleting schedule:', error);
                    this.showNotification('Không thể xóa lịch sinh hoạt', 'danger');
                }
            }
        });
    }

    /**
     * View today's schedule
     */
    async viewTodaySchedule() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        try {
            const schedule = await this.dailyActivityManager.getDailyActivitySchedule(today);
            const container = document.getElementById('dailyScheduleContainer');
            
            if (schedule) {
                this.setupDailyScheduleActions(schedule);
            } else {
                this.dailyScheduleRenderer.showEmpty(container, 'Chưa có lịch sinh hoạt cho hôm nay');
                if (container) container.style.display = 'block';
            }
        } catch (error) {
            console.error('Error viewing today schedule:', error);
            this.showNotification('Không thể tải lịch hôm nay', 'danger');
        }
    }

    /**
     * Add custom course
     */
    addCustomCourse() {
        const courseName = prompt('Nhập tên môn học:');
        if (!courseName) return;

        const list = document.getElementById('courseSelectionList');
        if (!list) return;

        const courseId = `custom-${Date.now()}`;
        const newItem = document.createElement('div');
        newItem.className = 'course-selection-item custom-course';
        newItem.innerHTML = `
            <div class="course-selection-header">
                <label class="course-checkbox">
                    <input type="checkbox" class="course-select-checkbox" data-course-id="${courseId}">
                    <span class="course-name">${courseName}</span>
                </label>
                <button class="expand-btn" data-course-id="${courseId}">
                    <span class="expand-icon">▼</span>
                </button>
            </div>
            <div class="course-details" data-course-id="${courseId}" style="display: none;">
                <div class="course-inputs">
                    <div class="input-group">
                        <label>Chủ đề:</label>
                        <input type="text" class="course-topic-input" placeholder="VD: Design Patterns, OOP, ...">
                    </div>
                    <div class="input-group">
                        <label>Nội dung chính:</label>
                        <textarea class="course-content-input" placeholder="Mỗi dòng là một nội dung cần làm"></textarea>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>Ưu tiên:</label>
                            <select class="course-priority-select">
                                <option value="high">🔴 Cao</option>
                                <option value="medium" selected>🟡 Trung bình</option>
                                <option value="low">🟢 Thấp</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Thời gian (phút):</label>
                            <input type="number" class="course-duration-input" value="60" min="15" step="15">
                        </div>
                        <div class="input-group">
                            <label>Khung giờ:</label>
                            <select class="course-timeslot-select">
                                <option value="auto">Tự động</option>
                                <option value="morning">Buổi sáng</option>
                                <option value="afternoon">Buổi chiều/tối</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(newItem);
        
        // Setup expand button
        const expandBtn = newItem.querySelector('.expand-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                const details = newItem.querySelector('.course-details');
                if (details) {
                    const isHidden = details.style.display === 'none';
                    details.style.display = isHidden ? 'block' : 'none';
                    const icon = expandBtn.querySelector('.expand-icon');
                    if (icon) icon.textContent = isHidden ? '▲' : '▼';
                }
            });
        }
    }

    /**
     * Add custom activity
     */
    addCustomActivity() {
        const activityName = prompt('Nhập tên hoạt động:');
        if (!activityName) return;

        const list = document.getElementById('otherActivitiesList');
        if (!list) return;

        const activityId = `custom-${Date.now()}`;
        const newItem = document.createElement('div');
        newItem.className = 'other-activity-item custom-activity';
        newItem.dataset.activityId = activityId;
        newItem.innerHTML = `
            <label class="activity-checkbox">
                <input type="checkbox" class="activity-select-checkbox" data-activity-id="${activityId}">
                <span class="activity-icon">📝</span>
                <span class="activity-name">${activityName}</span>
            </label>
            <div class="activity-details" data-activity-id="${activityId}" style="display: none;">
                <div class="input-row">
                    <div class="input-group">
                        <label>Thời gian (phút):</label>
                        <input type="number" class="activity-duration-input" value="30" min="15" step="15">
                    </div>
                    <div class="input-group">
                        <label>Khung giờ:</label>
                        <select class="activity-timeslot-select">
                            <option value="auto">Tự động</option>
                            <option value="morning">Buổi sáng</option>
                            <option value="afternoon">Buổi chiều/tối</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(newItem);
        
        // Setup checkbox
        const checkbox = newItem.querySelector('.activity-select-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                const details = newItem.querySelector('.activity-details');
                if (details) {
                    details.style.display = checkbox.checked ? 'block' : 'none';
                }
            });
        }
    }

    /**
     * Setup header dropdown menus
     */
    setupHeaderDropdowns() {
        if (this.headerDropdownsInitialized) {
            this.populateDropdowns();
            return;
        }

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
        this.headerDropdownsInitialized = true;
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
                    this.settings.scheduleSave();
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
                <div class="dropdown-section-title">Chọn nhiều nhạc nền</div>
                <div class="dropdown-divider"></div>
                <label class="dropdown-item">
                    <input type="checkbox" id="musicNoneCheckbox" ${(!this.settings.enableBackgroundMusic) ? 'checked' : ''} />
                    <span class="item-text">Không nhạc</span>
                </label>
                <div class="dropdown-divider"></div>
            `;

            const sounds = this.libraryManager.sounds;
            const selectedIds = new Set((this.settings.selectedMusicTracks || []).map(t => t.id.toString()));
            if (sounds.length > 0) {
                html += '<div class="dropdown-section-title">Nhạc nền</div>';
                sounds.forEach(sound => {
                    const checked = selectedIds.has(sound.id.toString());
                    html += `
                        <label class="dropdown-item">
                            <input type="checkbox" class="music-checkbox" data-id="${sound.id}" ${checked ? 'checked' : ''} />
                            <span class="item-text">${sound.name}</span>
                        </label>
                    `;
                });
            }

            musicScroll.innerHTML = html;

            // None checkbox
            const noneCb = musicScroll.querySelector('#musicNoneCheckbox');
            noneCb?.addEventListener('change', async (e) => {
                const off = e.target.checked;
                this.settings.enableBackgroundMusic = !off;
                if (off) {
                    // disable all tracks
                    this.audioManager.stopBackgroundMusic();
                } else {
                    // start selected tracks
                    await this.audioManager.startBackgroundMusic();
                }
                this.settings.scheduleSave();
                this.renderPerTrackSliders();
            });

            // Music checkboxes
            musicScroll.querySelectorAll('.music-checkbox').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const id = cb.dataset.id;
                    const sound = this.libraryManager.sounds.find(s => s.id.toString() === id.toString());
                    if (cb.checked) {
                        this.settings.addMusicTrack({ id, name: sound?.name, volume: this.settings.backgroundMusicVolume });
                        this.settings.enableBackgroundMusic = true;
                        await this.audioManager.addTrackById(id, this.settings.backgroundMusicVolume);
                    } else {
                        this.settings.removeMusicTrack(id);
                        this.audioManager.removeTrackById(id);
                    }
                    this.settings.scheduleSave();
                    this.renderPerTrackSliders();
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

        // Render per-track sliders
        this.renderPerTrackSliders();
        this.renderTaskPlanner();
        this.loadStudyGoals();
        this.renderFocusTaskOptions();

        // Render schedules
        this.renderSchedules();
        
        // Initialize daily schedule type if needed
        if (this.currentScheduleType === 'life') {
            this.renderDailySchedules();
        }

        // Switch to default tab
        this.switchTab('timer');
    }

    // Render per-track volume sliders in settings
    renderPerTrackSliders() {
        const container = document.getElementById('perTrackVolumeContainer');
        if (!container) return;

        const tracks = this.settings.selectedMusicTracks || [];
        if (!this.settings.enableBackgroundMusic || tracks.length === 0) {
            container.innerHTML = '<div class="text-muted">Chưa chọn nhạc nền nào.</div>';
            return;
        }

        container.innerHTML = tracks.map(t => {
            const volume = typeof t.volume === 'number' ? t.volume : this.settings.backgroundMusicVolume;
            return `
                <div class="mt-2">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <div style="font-weight:600;">${t.name || 'Track ' + t.id}</div>
                        <div class="text-muted" id="trackVolLabel-${t.id}">${volume}%</div>
                    </div>
                    <input type="range" class="track-volume" data-id="${t.id}" min="0" max="100" value="${volume}">
                </div>
            `;
        }).join('');

        // Wire events
        container.querySelectorAll('.track-volume').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const id = slider.dataset.id;
                const v = parseInt(slider.value);
                const label = document.getElementById(`trackVolLabel-${id}`);
                if (label) label.textContent = v + '%';
                this.settings.setMusicTrackVolume(id, v);
                this.audioManager.setTrackVolume(id, v);
            });
            slider.addEventListener('change', () => {
                this.settings.flushScheduledSave();
            });
        });
    }

    async renderTaskPlanner() {
        const summaryContainer = document.getElementById('plannerSummary');
        const taskList = document.getElementById('plannerTaskList');
        const dueSoonList = document.getElementById('plannerDueSoon');
        if (!summaryContainer || !taskList || !dueSoonList) {
            return;
        }

        const [tasks, analytics] = await Promise.all([
            this.taskPlannerManager.getAllTasks(),
            this.taskPlannerManager.getAnalytics()
        ]);
        const goals = this.taskPlannerManager.getGoals();

        summaryContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-value">${analytics.pendingTasks}</div>
                <div class="stat-label">Task đang mở</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${analytics.completedTasks}</div>
                <div class="stat-label">Task hoàn thành</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-value">${goals.dailyPomodoros}</div>
                <div class="stat-label">Mục tiêu Pomodoro/ngày</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📚</div>
                <div class="stat-value">${goals.weeklyStudyMinutes}m</div>
                <div class="stat-label">Mục tiêu học/tuần</div>
            </div>
        `;

        if (tasks.length === 0) {
            taskList.innerHTML = '<div class="empty-state"><p>Chưa có task học tập nào. Hãy thêm task đầu tiên để planner bắt đầu hỗ trợ.</p></div>';
        } else {
            taskList.innerHTML = tasks.map(task => `
                <div class="planner-task-card ${task.status}" data-task-id="${task.id}">
                    <div class="planner-task-header">
                        <div>
                            <div class="planner-task-title">${task.title}</div>
                            <div class="planner-task-meta">${task.subject} • ${task.estimatedDuration} phút • ${this.getPriorityLabel(task.priority)}</div>
                        </div>
                        <span class="planner-task-status">${this.getTaskStatusLabel(task.status)}</span>
                    </div>
                    <div class="planner-task-meta">
                        ${task.deadline ? `Deadline: ${task.deadline}` : 'Chưa đặt deadline'}
                        ${task.actualFocusMinutes ? ` • Đã tập trung ${task.actualFocusMinutes} phút` : ''}
                    </div>
                    ${task.notes ? `<div class="planner-task-notes">${task.notes}</div>` : ''}
                    <div class="schedule-card-actions">
                        <button class="schedule-card-btn view" data-action="toggle-task" data-id="${task.id}">
                            ${task.status === 'completed' ? '↩️ Mở lại' : '✅ Hoàn tất'}
                        </button>
                        <button class="schedule-card-btn delete" data-action="delete-task" data-id="${task.id}">
                            🗑️ Xóa
                        </button>
                    </div>
                </div>
            `).join('');
        }

        dueSoonList.innerHTML = analytics.dueSoon.length === 0
            ? '<div class="text-muted">Không có task cận hạn.</div>'
            : analytics.dueSoon.map(task => `
                <div class="planner-due-item">
                    <strong>${task.title}</strong>
                    <span>${task.subject} • ${task.deadline}</span>
                </div>
            `).join('');

        taskList.querySelectorAll('[data-action="toggle-task"]').forEach(button => {
            button.addEventListener('click', async () => {
                const taskId = parseInt(button.dataset.id, 10);
                await this.toggleTaskStatus(taskId);
            });
        });

        taskList.querySelectorAll('[data-action="delete-task"]').forEach(button => {
            button.addEventListener('click', async () => {
                const taskId = parseInt(button.dataset.id, 10);
                await this.deleteTask(taskId);
            });
        });

        await this.renderFocusTaskOptions();
    }

    loadStudyGoals() {
        const goals = this.taskPlannerManager.getGoals();
        const dailyInput = document.getElementById('plannerDailyPomodoros');
        const weeklyInput = document.getElementById('plannerWeeklyMinutes');

        if (dailyInput) {
            dailyInput.value = goals.dailyPomodoros;
        }
        if (weeklyInput) {
            weeklyInput.value = goals.weeklyStudyMinutes;
        }
    }

    saveStudyGoals() {
        const goals = this.taskPlannerManager.saveGoals({
            dailyPomodoros: document.getElementById('plannerDailyPomodoros')?.value,
            weeklyStudyMinutes: document.getElementById('plannerWeeklyMinutes')?.value
        });

        this.showNotification('Đã lưu mục tiêu học tập', 'success');
        this.loadStudyGoals();
        this.renderTaskPlanner();
        this.updateStatistics();
        return goals;
    }

    async createTaskFromPlanner() {
        try {
            const task = await this.taskPlannerManager.createTask({
                title: document.getElementById('plannerTaskTitle')?.value,
                subject: document.getElementById('plannerTaskSubject')?.value,
                estimatedDuration: document.getElementById('plannerTaskDuration')?.value,
                plannedPomodoros: document.getElementById('plannerTaskPomodoros')?.value,
                deadline: document.getElementById('plannerTaskDeadline')?.value,
                targetDate: document.getElementById('plannerTaskTargetDate')?.value,
                priority: document.getElementById('plannerTaskPriority')?.value,
                focusLevel: document.getElementById('plannerTaskFocusLevel')?.value,
                notes: document.getElementById('plannerTaskNotes')?.value
            });

            [
                'plannerTaskTitle',
                'plannerTaskSubject',
                'plannerTaskDuration',
                'plannerTaskPomodoros',
                'plannerTaskDeadline',
                'plannerTaskTargetDate',
                'plannerTaskNotes'
            ].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = '';
            });
            const durationInput = document.getElementById('plannerTaskDuration');
            if (durationInput) durationInput.value = '45';
            const pomodoroInput = document.getElementById('plannerTaskPomodoros');
            if (pomodoroInput) pomodoroInput.value = '1';

            this.showNotification(`Đã thêm task "${task.title}"`, 'success');
            await this.renderTaskPlanner();
        } catch (error) {
            console.error('Error creating task:', error);
            this.showNotification(error.message || 'Không thể tạo task', 'danger');
        }
    }

    async toggleTaskStatus(taskId) {
        const task = await this.taskPlannerManager.getTask(taskId);
        if (!task) {
            return;
        }

        const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
        await this.taskPlannerManager.setTaskStatus(taskId, nextStatus);
        await this.renderTaskPlanner();
        this.updateStatistics();
    }

    async deleteTask(taskId) {
        if (!confirm('Bạn có chắc muốn xóa task này?')) {
            return;
        }

        await this.taskPlannerManager.deleteTask(taskId);
        if (this.activeFocusTaskId === taskId) {
            this.setActiveFocusTask(null);
        }
        await this.renderTaskPlanner();
        this.updateStatistics();
        this.showNotification('Đã xóa task học tập', 'success');
    }

    async renderFocusTaskOptions() {
        const select = document.getElementById('focusTaskSelect');
        const summary = document.getElementById('focusTaskSummary');
        if (!select || !summary) {
            return;
        }

        const tasks = await this.taskPlannerManager.getPendingTasks();
        const storedTaskId = localStorage.getItem('chillpomodoro-active-focus-task');
        if (!this.activeFocusTaskId && storedTaskId) {
            this.activeFocusTaskId = parseInt(storedTaskId, 10);
        }

        select.innerHTML = '<option value="">Chọn task để gắn với phiên tập trung</option>' + tasks.map(task => `
            <option value="${task.id}" ${this.activeFocusTaskId === task.id ? 'selected' : ''}>
                ${task.title} (${task.subject})
            </option>
        `).join('');

        const activeTask = tasks.find(task => task.id === this.activeFocusTaskId) || null;
        if (!activeTask) {
            summary.innerHTML = '<div class="text-muted">Chưa gắn task focus nào. Chọn một task để app ghi nhận Pomodoro theo mục tiêu học tập.</div>';
            return;
        }

        summary.innerHTML = `
            <div class="planner-task-title">${activeTask.title}</div>
            <div class="planner-task-meta">${activeTask.subject} • ${activeTask.estimatedDuration} phút • ${this.getPriorityLabel(activeTask.priority)}</div>
            <div class="planner-task-meta">Đã hoàn thành ${activeTask.completedPomodoros || 0}/${activeTask.plannedPomodoros || 1} Pomodoro</div>
        `;
    }

    setActiveFocusTask(taskId) {
        this.activeFocusTaskId = taskId;
        if (taskId) {
            localStorage.setItem('chillpomodoro-active-focus-task', String(taskId));
            this.currentFocusSessionStart = new Date().toISOString();
        } else {
            localStorage.removeItem('chillpomodoro-active-focus-task');
            this.currentFocusSessionStart = null;
        }
        this.renderFocusTaskOptions();
    }

    async handleTimerSessionComplete(detail) {
        const session = detail?.session;
        if (!session || session.type !== 'work' || !session.completed) {
            return;
        }

        if (this.activeFocusTaskId) {
            const updatedTask = await this.taskPlannerManager.completePomodoroForTask(
                this.activeFocusTaskId,
                session.duration || this.settings.workDuration,
                {
                    plannedMinutes: this.settings.workDuration,
                    startedAt: this.currentFocusSessionStart,
                    endedAt: new Date().toISOString(),
                    date: formatDateKey(new Date())
                }
            );

            if (updatedTask?.status === 'completed') {
                this.showNotification(`Task "${updatedTask.title}" đã đạt mục tiêu thời gian`, 'success');
                this.setActiveFocusTask(null);
            }
        }

        await this.renderTaskPlanner();
        this.updateStatistics();
    }

    async syncTasksFromSchedule(schedule) {
        const activities = [
            ...(schedule?.morningSchedule?.activities || []),
            ...(schedule?.afternoonSchedule?.activities || [])
        ];

        for (const activity of activities) {
            if (!activity.taskId) {
                continue;
            }

            if (activity.status === 'completed') {
                await this.taskPlannerManager.setTaskStatus(parseInt(activity.taskId, 10), 'completed');
            } else if (activity.status === 'planned' || activity.status === 'in-progress') {
                await this.taskPlannerManager.setTaskStatus(parseInt(activity.taskId, 10), 'in_progress');
            }
        }

        await this.renderTaskPlanner();
    }

    async syncWorkoutSessionsFromSchedule(schedule) {
        const activities = [
            ...(schedule?.morningSchedule?.activities || []),
            ...(schedule?.afternoonSchedule?.activities || [])
        ];

        let hasWorkoutSync = false;
        for (const activity of activities) {
            if (!activity.workoutSessionId) {
                continue;
            }

            hasWorkoutSync = true;
            if (activity.status === 'completed') {
                await this.workoutManager.syncSessionStatus(parseInt(activity.workoutSessionId, 10), 'completed', 'daily-schedule');
            } else if (activity.status === 'skipped') {
                await this.workoutManager.syncSessionStatus(parseInt(activity.workoutSessionId, 10), 'skipped', 'daily-schedule');
            } else {
                await this.workoutManager.syncSessionStatus(parseInt(activity.workoutSessionId, 10), 'planned', 'daily-schedule');
            }
        }

        if (hasWorkoutSync) {
            this.exerciseSchedulesDirty = true;
            await this.renderExerciseSchedules();
            await this.updateStatistics();
        }
    }

    getTaskStatusLabel(status) {
        const labels = {
            pending: '⏳ Chờ làm',
            in_progress: '🔄 Đang làm',
            completed: '✅ Hoàn thành'
        };
        return labels[status] || '⏳ Chờ làm';
    }

    getPriorityLabel(priority) {
        const labels = {
            high: 'Ưu tiên cao',
            medium: 'Ưu tiên vừa',
            low: 'Ưu tiên thấp'
        };
        return labels[priority] || 'Ưu tiên vừa';
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
            if (this.libraryDirty) {
                this.libraryManager.renderAnimations();
                this.populateDropdowns();
                this.libraryDirty = false;
            }
        } else if (tabName === 'sounds') {
            if (this.libraryDirty) {
                this.libraryManager.renderSounds();
                this.populateDropdowns();
                this.libraryDirty = false;
            }
        } else if (tabName === 'presets') {
            this.presetManager.renderPresets();
        } else if (tabName === 'schedules') {
            if (this.currentScheduleType === 'class') {
                if (this.classSchedulesDirty) {
                    this.renderSchedules();
                }
            } else if (this.currentScheduleType === 'life') {
                if (this.dailySchedulesDirty) {
                    this.renderDailySchedules();
                }
            } else if (this.currentScheduleType === 'exercise' && this.exerciseSchedulesDirty) {
                this.renderExerciseSchedules();
            }
        } else if (tabName === 'planner') {
            this.renderTaskPlanner();
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
        this.renderPerTrackSliders();
    }

    /**
     * Save settings
     */
    saveSettings() {
        this.settings.flushScheduledSave();
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
        this.renderPerTrackSliders();

        this.showNotification('Cài đặt đã được lưu!', 'success');
    }

    /**
     * Reset settings
     */
    resetSettings() {
        if (confirm('Bạn có chắc chắn muốn đặt lại tất cả cài đặt về mặc định?')) {
            this.settings.reset();
            this.settings.loadToForm();
            this.renderPerTrackSliders();
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
    async updateStatistics() {
        const stats = this.timer.getStatistics();

        // Update summary cards
        document.getElementById('totalPomodoros').textContent = stats.completedPomodoros || 0;
        document.getElementById('totalWorkTime').textContent = this.timer.formatTime(stats.totalWorkTime || 0);
        document.getElementById('totalBreakTime').textContent = this.timer.formatTime(stats.totalBreakTime || 0);
        document.getElementById('currentStreak').textContent = stats.currentStreak || 0;

        // Update chart
        this.updateChart(stats.sessionHistory || []);

        if (!this.taskPlannerManager) {
            return;
        }

        const analytics = await this.taskPlannerManager.getAnalytics();
        const goals = this.taskPlannerManager.getGoals();
        const topSubject = analytics.bySubject[0];
        const bestHour = analytics.byHour.sort((a, b) => b.minutes - a.minutes)[0];

        const plannedVsActual = document.getElementById('plannedVsActual');
        const topSubjectEl = document.getElementById('topStudySubject');
        const bestHourEl = document.getElementById('bestFocusHour');
        const plannerProgressEl = document.getElementById('plannerGoalProgress');
        const analyticsList = document.getElementById('studyAnalyticsList');

        if (plannedVsActual) {
            plannedVsActual.textContent = `${analytics.actualMinutes}/${analytics.plannedMinutes || 0} phút`;
        }
        if (topSubjectEl) {
            topSubjectEl.textContent = topSubject ? `${topSubject.subject} (${topSubject.minutes}m)` : 'Chưa có dữ liệu';
        }
        if (bestHourEl) {
            bestHourEl.textContent = bestHour ? `${bestHour.hour}:00 (${bestHour.minutes}m)` : 'Chưa có dữ liệu';
        }
        if (plannerProgressEl) {
            plannerProgressEl.textContent = `${analytics.completedTasks}/${Math.max(analytics.totalTasks, 1)} task • mục tiêu ${goals.dailyPomodoros} Pomodoro/ngày`;
        }
        if (analyticsList) {
            analyticsList.innerHTML = analytics.bySubject.length === 0
                ? '<div class="text-muted">Bắt đầu gắn task với phiên Pomodoro để xem analytics học tập.</div>'
                : analytics.bySubject.map(item => `
                    <div class="planner-due-item">
                        <strong>${item.subject}</strong>
                        <span>${item.minutes} phút tập trung</span>
                    </div>
                `).join('');
        }

        if (!this.workoutManager) {
            return;
        }

        const workoutAnalytics = await this.workoutManager.getAnalytics();
        const workoutCompletedThisWeek = document.getElementById('workoutCompletedThisWeek');
        const workoutPlannedThisWeek = document.getElementById('workoutPlannedThisWeek');
        const workoutAdherence = document.getElementById('workoutAdherence');
        const topWorkoutMuscle = document.getElementById('topWorkoutMuscle');
        const workoutAnalyticsList = document.getElementById('workoutAnalyticsList');
        const workoutRecommendationsList = document.getElementById('workoutRecommendationsList');

        if (workoutCompletedThisWeek) {
            workoutCompletedThisWeek.textContent = workoutAnalytics.completedThisWeek || 0;
        }
        if (workoutPlannedThisWeek) {
            workoutPlannedThisWeek.textContent = workoutAnalytics.plannedThisWeek || 0;
        }
        if (workoutAdherence) {
            workoutAdherence.textContent = `${workoutAnalytics.adherence || 0}%`;
        }
        if (topWorkoutMuscle) {
            const topMuscle = workoutAnalytics.topMuscles[0];
            topWorkoutMuscle.textContent = topMuscle ? `${this.workoutRenderer.formatMuscle(topMuscle.muscle)} (${topMuscle.sets})` : 'Chưa có';
        }
        this.workoutRenderer.renderWorkoutAnalytics(workoutAnalyticsList, workoutAnalytics);
        if (workoutRecommendationsList) {
            workoutRecommendationsList.innerHTML = workoutAnalytics.recommendations.length === 0
                ? '<div class="text-muted">Workout module sẽ tạo khuyến nghị sau khi có dữ liệu adherence và progression.</div>'
                : workoutAnalytics.recommendations.map(item => `<div class="planner-due-item"><strong>Gợi ý</strong><span>${item}</span></div>`).join('');
        }
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
        notificationService.show(message, type);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ChillPomodoroApp();
    await app.init();

    // Make app globally accessible for debugging
    window.app = app;
});

