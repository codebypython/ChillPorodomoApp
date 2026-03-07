import { DailyActivityManager } from '../js/classes/DailyActivityManager.js';
import { storageManager } from '../js/classes/StorageManager.js';

describe('DailyActivityManager', () => {
    beforeEach(async () => {
        await storageManager.clearAllData();
    });

    it('creates and retrieves daily schedules through indexed queries', async () => {
        const scheduleManager = {
            schedules: []
        };
        const manager = new DailyActivityManager(scheduleManager);
        const date = new Date('2026-03-09T00:00:00');

        const schedule = await manager.createDailyActivitySchedule(date, [
            {
                id: 'activity-1',
                type: 'study',
                courseName: 'Toan Roi Rac',
                topic: 'On tap',
                estimatedDuration: 60,
                timeSlot: 'morning',
                scheduledTime: '08:00',
                scheduledEndTime: '09:00',
                status: 'planned'
            }
        ]);

        const loaded = await manager.getDailyActivitySchedule(date);
        const all = await manager.getAllDailyActivitySchedules();

        expect(loaded.id).toBe(schedule.id);
        expect(loaded.date).toBe('2026-03-09');
        expect(all).toHaveLength(1);
        expect(all[0].morningSchedule.activities[0].topic).toBe('On tap');
    });
});
