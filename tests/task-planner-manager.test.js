import { TaskPlannerManager } from '../js/classes/TaskPlannerManager.js';
import { storageManager } from '../js/classes/StorageManager.js';

describe('TaskPlannerManager', () => {
    beforeEach(async () => {
        await storageManager.clearAllData();
    });

    it('records focus time and completes tasks when estimated duration is reached', async () => {
        const manager = new TaskPlannerManager();
        const task = await manager.createTask({
            title: 'Lam de cuong OOP',
            subject: 'OOP',
            estimatedDuration: 25,
            plannedPomodoros: 1,
            deadline: '2026-03-10'
        });

        const updatedTask = await manager.completePomodoroForTask(task.id, 25, {
            startedAt: new Date('2026-03-07T08:00:00').toISOString(),
            endedAt: new Date('2026-03-07T08:25:00').toISOString(),
            date: '2026-03-07'
        });
        const analytics = await manager.getAnalytics();

        expect(updatedTask.status).toBe('completed');
        expect(updatedTask.actualFocusMinutes).toBe(25);
        expect(analytics.completedTasks).toBe(1);
        expect(analytics.bySubject[0]).toEqual({ subject: 'OOP', minutes: 25 });
    });
});
