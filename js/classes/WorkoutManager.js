import { storageManager } from './StorageManager.js';
import { WorkoutValidator } from '../utils/WorkoutValidator.js';
import { formatDateKey, parseDateKey } from '../utils/TimeUtils.js';

export class WorkoutManager {
    constructor(scheduleManager, dailyActivityManager) {
        this.storageManager = storageManager;
        this.scheduleManager = scheduleManager;
        this.dailyActivityManager = dailyActivityManager;
        this.validator = new WorkoutValidator();
        this.seedKey = 'chillpomodoro-workout-seeded';
    }

    async ensureSeedData() {
        if (localStorage.getItem(this.seedKey) === 'true') {
            return;
        }

        const existing = await this.storageManager.getAllItems('exerciseLibrary');
        if (existing.length > 0) {
            localStorage.setItem(this.seedKey, 'true');
            return;
        }

        const exercises = this.getDefaultExerciseLibrary();
        for (const exercise of exercises) {
            await this.storageManager.addItem('exerciseLibrary', {
                ...exercise,
                createdAt: new Date().toISOString()
            });
        }

        localStorage.setItem(this.seedKey, 'true');
    }

    getDefaultExerciseLibrary() {
        return [
            {
                slug: 'push_up',
                name: 'Push-up',
                primaryFocus: 'chest',
                primaryMuscles: ['chest', 'triceps', 'front_shoulders'],
                secondaryMuscles: ['core'],
                difficulty: 'beginner',
                repMin: 8,
                repMax: 15,
                tempo: '3110',
                restSeconds: 75,
                progression: 'Nâng chân cao hoặc close-grip khi chạm ngưỡng rep trên',
                regression: 'Incline push-up trên mép bàn hoặc tường',
                safetyNotes: 'Giữ thân người thẳng, siết core, không võng lưng',
                equipment: 'none'
            },
            {
                slug: 'diamond_push_up',
                name: 'Diamond Push-up',
                primaryFocus: 'triceps',
                primaryMuscles: ['triceps', 'chest'],
                secondaryMuscles: ['front_shoulders', 'core'],
                difficulty: 'intermediate',
                repMin: 6,
                repMax: 12,
                tempo: '3010',
                restSeconds: 90,
                progression: 'Giảm thời gian nghỉ hoặc thêm set',
                regression: 'Close-grip push-up',
                safetyNotes: 'Không để khuỷu tay xoè quá mạnh',
                equipment: 'none'
            },
            {
                slug: 'pike_push_up',
                name: 'Pike Push-up',
                primaryFocus: 'shoulders',
                primaryMuscles: ['shoulders', 'triceps'],
                secondaryMuscles: ['upper_chest', 'core'],
                difficulty: 'intermediate',
                repMin: 6,
                repMax: 12,
                tempo: '3110',
                restSeconds: 90,
                progression: 'Elevated pike push-up với chân kê trên ghế vững',
                regression: 'Pike push-up tầm ngắn',
                safetyNotes: 'Giữ hông cao và đầu di chuyển chéo về trước',
                equipment: 'none'
            },
            {
                slug: 'bodyweight_squat',
                name: 'Bodyweight Squat',
                primaryFocus: 'quads',
                primaryMuscles: ['quads', 'glutes'],
                secondaryMuscles: ['core'],
                difficulty: 'beginner',
                repMin: 12,
                repMax: 20,
                tempo: '3111',
                restSeconds: 60,
                progression: 'Pause squat hoặc jump squat kiểm soát',
                regression: 'Box squat với ghế thấp',
                safetyNotes: 'Giữ gót chân bám sàn và đầu gối đi theo mũi chân',
                equipment: 'none'
            },
            {
                slug: 'split_squat',
                name: 'Split Squat',
                primaryFocus: 'quads',
                primaryMuscles: ['quads', 'glutes'],
                secondaryMuscles: ['adductors', 'core'],
                difficulty: 'intermediate',
                repMin: 8,
                repMax: 15,
                tempo: '3111',
                restSeconds: 75,
                progression: 'Bulgarian split squat với chân sau kê trên ghế chắc chắn',
                regression: 'Static split squat ROM ngắn',
                safetyNotes: 'Giữ thân người trung lập, không đổ gối vào trong',
                equipment: 'none'
            },
            {
                slug: 'single_leg_glute_bridge',
                name: 'Single-leg Glute Bridge',
                primaryFocus: 'glutes',
                primaryMuscles: ['glutes', 'hamstrings'],
                secondaryMuscles: ['core'],
                difficulty: 'intermediate',
                repMin: 10,
                repMax: 18,
                tempo: '2111',
                restSeconds: 60,
                progression: 'Tăng hold ở đỉnh hoặc thêm reps',
                regression: 'Glute bridge hai chân',
                safetyNotes: 'Giữ xương chậu cân bằng, không ngửa lưng dưới',
                equipment: 'none'
            },
            {
                slug: 'hamstring_walkout',
                name: 'Hamstring Walkout',
                primaryFocus: 'hamstrings',
                primaryMuscles: ['hamstrings', 'glutes'],
                secondaryMuscles: ['calves', 'core'],
                difficulty: 'intermediate',
                repMin: 8,
                repMax: 12,
                tempo: '2111',
                restSeconds: 75,
                progression: 'Tăng số bước hoặc thêm hold cuối ROM',
                regression: 'Glute bridge march',
                safetyNotes: 'Di chuyển chậm, giữ hông không rơi xuống sàn',
                equipment: 'none'
            },
            {
                slug: 'reverse_snow_angel',
                name: 'Reverse Snow Angel',
                primaryFocus: 'upper_back',
                primaryMuscles: ['upper_back', 'rear_shoulders'],
                secondaryMuscles: ['lower_back'],
                difficulty: 'beginner',
                repMin: 12,
                repMax: 20,
                tempo: '2121',
                restSeconds: 45,
                progression: 'Tăng hold cuối biên hoặc thêm slow eccentric',
                regression: 'Prone Y raise biên độ ngắn',
                safetyNotes: 'Biên độ vừa phải; nhóm kéo lưng với no-equipment bị giới hạn nên ưu tiên kiểm soát',
                equipment: 'none'
            },
            {
                slug: 'prone_swimmer',
                name: 'Prone Swimmer',
                primaryFocus: 'upper_back',
                primaryMuscles: ['upper_back', 'rear_shoulders', 'mid_back'],
                secondaryMuscles: ['glutes'],
                difficulty: 'beginner',
                repMin: 10,
                repMax: 16,
                tempo: '2121',
                restSeconds: 45,
                progression: 'Tăng hold cuối hoặc thêm pause ở vị trí mở rộng',
                regression: 'Reverse snow angel',
                safetyNotes: 'Không rướn cổ; tập trung kéo bả vai',
                equipment: 'none'
            },
            {
                slug: 'hollow_body_hold',
                name: 'Hollow Body Hold',
                primaryFocus: 'core',
                primaryMuscles: ['core'],
                secondaryMuscles: ['hip_flexors'],
                difficulty: 'intermediate',
                repMin: 20,
                repMax: 45,
                tempo: 'isometric',
                restSeconds: 45,
                progression: 'Duỗi tay qua đầu hoặc kéo dài thời gian hold',
                regression: 'Tuck hollow hold',
                safetyNotes: 'Ép lưng dưới xuống sàn trong suốt bài',
                equipment: 'none'
            },
            {
                slug: 'side_plank_reach',
                name: 'Side Plank Reach',
                primaryFocus: 'core',
                primaryMuscles: ['obliques', 'core'],
                secondaryMuscles: ['shoulders'],
                difficulty: 'beginner',
                repMin: 8,
                repMax: 15,
                tempo: '2111',
                restSeconds: 40,
                progression: 'Kéo dài hold hoặc thêm reps mỗi bên',
                regression: 'Side plank gối chạm sàn',
                safetyNotes: 'Giữ vai xếp chồng lên cổ tay',
                equipment: 'none'
            }
        ];
    }

    getProgramTemplates() {
        return [
            {
                id: 'upper_lower_4day',
                name: 'UpperLower4Day',
                summary: '4 buổi/tuần, ưu tiên tăng cơ thân trên và chân với volume cân bằng',
                daysPerWeek: 4,
                estimatedDuration: 42,
                splitType: 'upper-lower',
                sessions: [
                    {
                        key: 'upper_push',
                        label: 'Upper Push Strength',
                        focus: 'Upper Push',
                        duration: 40,
                        exercises: [
                            { slug: 'push_up', prescribedSets: 4, repMin: 8, repMax: 15, restSeconds: 75 },
                            { slug: 'diamond_push_up', prescribedSets: 3, repMin: 6, repMax: 10, restSeconds: 90 },
                            { slug: 'pike_push_up', prescribedSets: 3, repMin: 6, repMax: 10, restSeconds: 90 },
                            { slug: 'hollow_body_hold', prescribedSets: 3, repMin: 25, repMax: 40, restSeconds: 45 }
                        ]
                    },
                    {
                        key: 'lower_a',
                        label: 'Lower Body A',
                        focus: 'Lower Body',
                        duration: 42,
                        exercises: [
                            { slug: 'bodyweight_squat', prescribedSets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
                            { slug: 'split_squat', prescribedSets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
                            { slug: 'single_leg_glute_bridge', prescribedSets: 3, repMin: 12, repMax: 18, restSeconds: 60 },
                            { slug: 'side_plank_reach', prescribedSets: 3, repMin: 10, repMax: 15, restSeconds: 40 }
                        ]
                    },
                    {
                        key: 'upper_back_shoulder',
                        label: 'Upper Back and Shoulder Density',
                        focus: 'Upper Back + Shoulder',
                        duration: 38,
                        exercises: [
                            { slug: 'reverse_snow_angel', prescribedSets: 4, repMin: 12, repMax: 20, restSeconds: 45 },
                            { slug: 'prone_swimmer', prescribedSets: 3, repMin: 10, repMax: 16, restSeconds: 45 },
                            { slug: 'pike_push_up', prescribedSets: 3, repMin: 6, repMax: 12, restSeconds: 90 },
                            { slug: 'push_up', prescribedSets: 2, repMin: 10, repMax: 16, restSeconds: 60 }
                        ]
                    },
                    {
                        key: 'lower_b',
                        label: 'Lower Body B + Core',
                        focus: 'Lower Body + Core',
                        duration: 40,
                        exercises: [
                            { slug: 'split_squat', prescribedSets: 4, repMin: 8, repMax: 12, restSeconds: 75 },
                            { slug: 'hamstring_walkout', prescribedSets: 3, repMin: 8, repMax: 12, restSeconds: 75 },
                            { slug: 'bodyweight_squat', prescribedSets: 3, repMin: 15, repMax: 20, restSeconds: 60 },
                            { slug: 'hollow_body_hold', prescribedSets: 3, repMin: 25, repMax: 45, restSeconds: 45 }
                        ]
                    }
                ]
            },
            {
                id: 'push_legs_core_3day',
                name: 'PushLegsCore3Day',
                summary: '3 buổi/tuần, dễ duy trì khi lịch học dày nhưng vẫn đủ volume hypertrophy cơ bản',
                daysPerWeek: 3,
                estimatedDuration: 35,
                splitType: 'push-legs-core',
                sessions: [
                    {
                        key: 'push',
                        label: 'Push Day',
                        focus: 'Push',
                        duration: 34,
                        exercises: [
                            { slug: 'push_up', prescribedSets: 4, repMin: 8, repMax: 15, restSeconds: 75 },
                            { slug: 'diamond_push_up', prescribedSets: 3, repMin: 6, repMax: 10, restSeconds: 90 },
                            { slug: 'pike_push_up', prescribedSets: 3, repMin: 6, repMax: 12, restSeconds: 90 }
                        ]
                    },
                    {
                        key: 'legs',
                        label: 'Leg Day',
                        focus: 'Legs',
                        duration: 36,
                        exercises: [
                            { slug: 'bodyweight_squat', prescribedSets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
                            { slug: 'split_squat', prescribedSets: 4, repMin: 8, repMax: 15, restSeconds: 75 },
                            { slug: 'single_leg_glute_bridge', prescribedSets: 3, repMin: 12, repMax: 18, restSeconds: 60 }
                        ]
                    },
                    {
                        key: 'core_back',
                        label: 'Core + Back Density',
                        focus: 'Core + Back',
                        duration: 32,
                        exercises: [
                            { slug: 'reverse_snow_angel', prescribedSets: 4, repMin: 12, repMax: 20, restSeconds: 45 },
                            { slug: 'prone_swimmer', prescribedSets: 3, repMin: 10, repMax: 16, restSeconds: 45 },
                            { slug: 'hollow_body_hold', prescribedSets: 3, repMin: 25, repMax: 45, restSeconds: 45 },
                            { slug: 'side_plank_reach', prescribedSets: 3, repMin: 10, repMax: 15, restSeconds: 40 }
                        ]
                    }
                ]
            },
            {
                id: 'full_body_density_3day',
                name: 'FullBodyDensity3Day',
                summary: '3 buổi toàn thân, phù hợp khi cần rải volume đều cho cả tuần',
                daysPerWeek: 3,
                estimatedDuration: 38,
                splitType: 'full-body',
                sessions: [
                    {
                        key: 'full_a',
                        label: 'Full Body A',
                        focus: 'Full Body',
                        duration: 38,
                        exercises: [
                            { slug: 'push_up', prescribedSets: 3, repMin: 8, repMax: 15, restSeconds: 75 },
                            { slug: 'bodyweight_squat', prescribedSets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
                            { slug: 'reverse_snow_angel', prescribedSets: 3, repMin: 12, repMax: 20, restSeconds: 45 },
                            { slug: 'hollow_body_hold', prescribedSets: 3, repMin: 25, repMax: 40, restSeconds: 45 }
                        ]
                    },
                    {
                        key: 'full_b',
                        label: 'Full Body B',
                        focus: 'Full Body',
                        duration: 40,
                        exercises: [
                            { slug: 'pike_push_up', prescribedSets: 3, repMin: 6, repMax: 12, restSeconds: 90 },
                            { slug: 'split_squat', prescribedSets: 3, repMin: 8, repMax: 15, restSeconds: 75 },
                            { slug: 'prone_swimmer', prescribedSets: 3, repMin: 10, repMax: 16, restSeconds: 45 },
                            { slug: 'single_leg_glute_bridge', prescribedSets: 3, repMin: 12, repMax: 18, restSeconds: 60 }
                        ]
                    },
                    {
                        key: 'full_c',
                        label: 'Full Body C',
                        focus: 'Full Body',
                        duration: 36,
                        exercises: [
                            { slug: 'diamond_push_up', prescribedSets: 3, repMin: 6, repMax: 12, restSeconds: 90 },
                            { slug: 'hamstring_walkout', prescribedSets: 3, repMin: 8, repMax: 12, restSeconds: 75 },
                            { slug: 'bodyweight_squat', prescribedSets: 3, repMin: 15, repMax: 20, restSeconds: 60 },
                            { slug: 'side_plank_reach', prescribedSets: 3, repMin: 10, repMax: 15, restSeconds: 40 }
                        ]
                    }
                ]
            }
        ];
    }

    async getExerciseLibrary() {
        await this.ensureSeedData();
        return this.storageManager.getAllItems('exerciseLibrary');
    }

    async getExerciseMap() {
        const exercises = await this.getExerciseLibrary();
        return new Map(exercises.map(exercise => [exercise.slug, exercise]));
    }

    async buildAvailabilityMap(startDate, daysToScan = 10) {
        const results = [];
        const current = new Date(startDate);
        current.setHours(0, 0, 0, 0);

        for (let i = 0; i < daysToScan; i++) {
            const date = new Date(current);
            date.setDate(current.getDate() + i);

            const timeSlots = this.dailyActivityManager.calculateTimeSlots(date);
            const dailySchedule = await this.dailyActivityManager.getDailyActivitySchedule(date);
            const scheduledActivities = [
                ...(dailySchedule?.morningSchedule?.activities || []),
                ...(dailySchedule?.afternoonSchedule?.activities || [])
            ];
            const usedMinutes = scheduledActivities.reduce((sum, activity) => sum + (activity.estimatedDuration || 0), 0);
            const freeMinutes = Math.max(0, timeSlots.morningSlot.duration + timeSlots.afternoonSlot.duration - usedMinutes);

            results.push({
                date: formatDateKey(date),
                hasClassToday: timeSlots.hasClassToday,
                freeMinutes,
                usedMinutes,
                dailyScheduleExists: Boolean(dailySchedule)
            });
        }

        return results;
    }

    async recommendScheduleForTemplate(template, startDate) {
        const availability = await this.buildAvailabilityMap(startDate, 12);
        const recommendations = [];
        const idealGap = template.daysPerWeek >= 4 ? 1 : 2;
        let lastChosenDate = null;

        template.sessions.forEach((sessionBlueprint, index) => {
            const targetIndex = index * idealGap;
            let bestCandidate = null;

            availability.forEach(candidate => {
                if (recommendations.some(item => item.date === candidate.date)) {
                    return;
                }

                const dateObj = parseDateKey(candidate.date);
                const previousGap = lastChosenDate
                    ? Math.round((dateObj - parseDateKey(lastChosenDate)) / 86400000)
                    : idealGap;

                if (lastChosenDate && previousGap < 1) {
                    return;
                }

                const score =
                    candidate.freeMinutes -
                    (candidate.hasClassToday ? 25 : 0) -
                    Math.abs(targetIndex - availability.indexOf(candidate)) * 5 -
                    (candidate.dailyScheduleExists ? 20 : 0);

                if (!bestCandidate || score > bestCandidate.score) {
                    bestCandidate = {
                        ...candidate,
                        score,
                        reason: candidate.hasClassToday
                            ? 'Ngày có lịch học nhưng vẫn còn đủ thời lượng trống cho buổi tập'
                            : 'Ngày rảnh hơn, phù hợp để giữ hiệu suất hypertrophy'
                    };
                }
            });

            if (!bestCandidate) {
                return;
            }

            lastChosenDate = bestCandidate.date;
            recommendations.push({
                ...bestCandidate,
                sessionKey: sessionBlueprint.key,
                focus: sessionBlueprint.focus,
                label: sessionBlueprint.label,
                duration: sessionBlueprint.duration
            });
        });

        return recommendations.sort((a, b) => a.date.localeCompare(b.date));
    }

    async createProgramFromTemplate(request) {
        await this.ensureSeedData();
        const validation = this.validator.validateProgramRequest(request);
        if (!validation.isValid) {
            throw new Error(validation.errors.join('. '));
        }

        const template = this.getProgramTemplates().find(item => item.id === request.templateId);
        if (!template) {
            throw new Error('Template lịch tập không tồn tại');
        }

        const exerciseMap = await this.getExerciseMap();
        const recommendedDates = await this.recommendScheduleForTemplate(template, request.startDate);
        const createdAt = new Date().toISOString();

        const program = {
            name: request.name.trim(),
            templateId: template.id,
            templateName: template.name,
            summary: template.summary,
            goal: 'muscle-focused',
            strictNoEquipment: true,
            daysPerWeek: template.daysPerWeek,
            splitType: template.splitType,
            startDate: request.startDate,
            recommendationNotes: recommendedDates.map(item => ({
                date: item.date,
                reason: item.reason,
                freeMinutes: item.freeMinutes
            })),
            sessionBlueprints: template.sessions.map(session => ({
                key: session.key,
                label: session.label,
                focus: session.focus,
                duration: session.duration
            })),
            createdAt,
            updatedAt: createdAt,
            isArchived: false
        };

        const programId = await this.storageManager.addItem('workoutPrograms', program);
        const sessions = [];

        for (let index = 0; index < template.sessions.length; index++) {
            const sessionBlueprint = template.sessions[index];
            const recommendation = recommendedDates[index];
            const exercises = sessionBlueprint.exercises.map(exerciseConfig => {
                const exercise = exerciseMap.get(exerciseConfig.slug);
                return {
                    slug: exerciseConfig.slug,
                    exerciseName: exercise?.name || exerciseConfig.slug,
                    primaryMuscles: exercise?.primaryMuscles || [],
                    primaryFocus: exercise?.primaryFocus || '',
                    progression: exercise?.progression || '',
                    safetyNotes: exercise?.safetyNotes || '',
                    tempo: exerciseConfig.tempo || exercise?.tempo || '3010',
                    restSeconds: exerciseConfig.restSeconds || exercise?.restSeconds || 60,
                    prescribedSets: exerciseConfig.prescribedSets || 3,
                    repMin: exerciseConfig.repMin || exercise?.repMin || 8,
                    repMax: exerciseConfig.repMax || exercise?.repMax || 15,
                    actualCompletedSets: 0,
                    actualMaxReps: 0,
                    actualRpe: 0
                };
            });

            const session = {
                programId,
                programName: program.name,
                templateId: template.id,
                scheduledDate: recommendation?.date || request.startDate,
                label: sessionBlueprint.label,
                sessionKey: sessionBlueprint.key,
                dayFocus: sessionBlueprint.focus,
                estimatedDuration: sessionBlueprint.duration,
                status: 'planned',
                exercises,
                recommendationContext: recommendation || null,
                createdAt,
                updatedAt: createdAt
            };

            session.id = await this.storageManager.addItem('workoutSessions', session);
            sessions.push(session);
        }

        return {
            ...program,
            id: programId,
            sessions
        };
    }

    async getPrograms() {
        const programs = await this.storageManager.getActiveWorkoutPrograms();
        return programs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async getProgram(id) {
        return this.storageManager.getItem('workoutPrograms', id);
    }

    async getSessionsForProgram(programId) {
        const sessions = await this.storageManager.getWorkoutSessionsByProgram(programId);
        return sessions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    }

    async getSessionsForDate(date) {
        const dateKey = typeof date === 'string' ? date : formatDateKey(date);
        const sessions = await this.storageManager.getWorkoutSessionsByDate(dateKey);
        return sessions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    async getUpcomingSessions(daysAhead = 14) {
        const allSessions = await this.storageManager.getAllItems('workoutSessions');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + daysAhead);

        return allSessions
            .filter(session => {
                const sessionDate = parseDateKey(session.scheduledDate);
                return sessionDate >= today && sessionDate <= maxDate;
            })
            .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    }

    async getRecommendedWorkoutForDate(date) {
        const sessions = await this.getSessionsForDate(date);
        return sessions.find(session => session.status === 'planned') || sessions[0] || null;
    }

    async getWorkoutSession(id) {
        return this.storageManager.getItem('workoutSessions', id);
    }

    async completeSession(sessionId, exerciseUpdates = []) {
        const session = await this.getWorkoutSession(sessionId);
        if (!session) {
            throw new Error('Workout session không tồn tại');
        }

        const sanitizedExercises = this.validator.sanitizeSessionCompletion(
            session.exercises.map((exercise, index) => ({
                ...exercise,
                ...(exerciseUpdates[index] || {})
            }))
        );

        const validation = this.validator.validateSessionCompletion(sanitizedExercises);
        if (!validation.isValid) {
            throw new Error(validation.errors.join('. '));
        }

        session.exercises = sanitizedExercises;
        session.status = 'completed';
        session.completedExercises = sanitizedExercises.filter(exercise => exercise.actualCompletedSets > 0).length;
        session.completedAt = new Date().toISOString();
        session.updatedAt = new Date().toISOString();
        session.progressionSignals = this.calculateProgressionSignals(session.exercises);
        await this.storageManager.updateItem('workoutSessions', session);
        return session;
    }

    async syncSessionStatus(sessionId, status, source = 'workout-tab') {
        const session = await this.getWorkoutSession(sessionId);
        if (!session) {
            return null;
        }

        session.status = status;
        session.updatedAt = new Date().toISOString();
        session.syncedFrom = source;
        if (status === 'completed') {
            session.completedAt = new Date().toISOString();
        }

        await this.storageManager.updateItem('workoutSessions', session);
        return session;
    }

    calculateProgressionSignals(exercises = []) {
        return exercises
            .filter(exercise => exercise.actualCompletedSets >= exercise.prescribedSets && exercise.actualMaxReps >= exercise.repMax)
            .map(exercise => ({
                exerciseName: exercise.exerciseName,
                suggestion: exercise.progression || 'Đạt ngưỡng rep trên ổn định, có thể chuyển sang biến thể khó hơn'
            }));
    }

    async getAnalytics() {
        const [programs, sessions] = await Promise.all([
            this.getPrograms(),
            this.storageManager.getAllItems('workoutSessions')
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        const startKey = formatDateKey(startOfWeek);

        const thisWeekSessions = sessions.filter(session => session.scheduledDate >= startKey);
        const plannedThisWeek = thisWeekSessions.length;
        const completedThisWeek = thisWeekSessions.filter(session => session.status === 'completed').length;

        const muscleVolume = new Map();
        const progressionQueue = [];
        thisWeekSessions
            .filter(session => session.status === 'completed')
            .forEach(session => {
                session.exercises.forEach(exercise => {
                    const setCount = exercise.actualCompletedSets || exercise.prescribedSets || 0;
                    (exercise.primaryMuscles || []).forEach(muscle => {
                        muscleVolume.set(muscle, (muscleVolume.get(muscle) || 0) + setCount);
                    });
                });

                (session.progressionSignals || []).forEach(signal => {
                    progressionQueue.push({
                        scheduledDate: session.scheduledDate,
                        ...signal
                    });
                });
            });

        const adherence = plannedThisWeek === 0 ? 0 : Math.round((completedThisWeek / plannedThisWeek) * 100);
        const topMuscles = Array.from(muscleVolume.entries())
            .map(([muscle, sets]) => ({ muscle, sets }))
            .sort((a, b) => b.sets - a.sets);

        const recommendations = [];
        if (adherence > 0 && adherence < 60) {
            recommendations.push('Tỷ lệ hoàn thành lịch tập đang thấp; cân nhắc dùng template 3 buổi/tuần hoặc rút ngắn duration mỗi buổi.');
        }
        if (topMuscles[0]?.sets >= 12) {
            recommendations.push(`Nhóm ${topMuscles[0].muscle} đã chạm volume tốt trong tuần này; giữ recovery đủ 24-48h trước khi lặp lại.`);
        }
        if (progressionQueue.length > 0) {
            recommendations.push('Một số bài đã chạm trần rep mục tiêu; nên chuyển sang biến thể khó hơn hoặc tăng density.');
        }

        return {
            totalPrograms: programs.length,
            totalSessions: sessions.length,
            upcomingSessions: sessions.filter(session => session.status === 'planned').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, 5),
            plannedThisWeek,
            completedThisWeek,
            adherence,
            topMuscles,
            progressionQueue: progressionQueue.slice(0, 5),
            recommendations
        };
    }
}
