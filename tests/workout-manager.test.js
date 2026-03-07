import { storageManager } from '../js/classes/StorageManager.js';
import { ScheduleManager } from '../js/classes/ScheduleManager.js';
import { DailyActivityManager } from '../js/classes/DailyActivityManager.js';
import { WorkoutManager } from '../js/classes/WorkoutManager.js';
import { formatDateKey } from '../js/utils/TimeUtils.js';

describe('WorkoutManager', () => {
    let manager;

    beforeEach(async () => {
        await storageManager.clearAllData();
        localStorage.removeItem('chillpomodoro-workout-seeded');

        const scheduleManager = new ScheduleManager();
        const dailyActivityManager = new DailyActivityManager(scheduleManager);
        manager = new WorkoutManager(scheduleManager, dailyActivityManager);
    });

    it('seeds the no-equipment exercise library and creates template-based programs', async () => {
        await manager.ensureSeedData();
        const library = await manager.getExerciseLibrary();

        expect(library.some(exercise => exercise.slug === 'push_up')).toBe(true);
        expect(library.some(exercise => exercise.slug === 'reverse_snow_angel')).toBe(true);

        const program = await manager.createProgramFromTemplate({
            name: 'Bodyweight Growth',
            templateId: 'push_legs_core_3day',
            startDate: '2026-03-09'
        });

        expect(program.sessions).toHaveLength(3);
        expect(program.sessions.every(session => session.status === 'planned')).toBe(true);
        expect(program.sessions[0].exercises[0].exerciseName).toBeTruthy();
    });

    it('computes workout analytics and progression signals from completed sessions', async () => {
        const startDate = formatDateKey(new Date());
        const program = await manager.createProgramFromTemplate({
            name: 'Hypertrophy Week',
            templateId: 'full_body_density_3day',
            startDate
        });

        const firstSession = program.sessions[0];
        const exerciseUpdates = firstSession.exercises.map(exercise => ({
            actualCompletedSets: exercise.prescribedSets,
            actualMaxReps: exercise.repMax,
            actualRpe: 9
        }));

        const completed = await manager.completeSession(firstSession.id, exerciseUpdates);
        const analytics = await manager.getAnalytics();

        expect(completed.status).toBe('completed');
        expect(analytics.completedThisWeek).toBeGreaterThanOrEqual(1);
        expect(analytics.topMuscles.length).toBeGreaterThan(0);
        expect(analytics.progressionQueue.length).toBeGreaterThan(0);
    });
});
