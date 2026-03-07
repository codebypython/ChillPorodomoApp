import { ScheduleManager } from '../js/classes/ScheduleManager.js';

describe('ScheduleManager', () => {
    it('parses multiple schedule entries from one course string', () => {
        const manager = new ScheduleManager();
        const entries = manager.parseScheduleString('Thứ 4,1-2,E2.403; Thứ 5,6-7,A141');

        expect(entries).toHaveLength(2);
        expect(entries[0]).toEqual({ day: 4, periods: [1, 2], room: 'E2.403' });
        expect(entries[1]).toEqual({ day: 5, periods: [6, 7], room: 'A141' });
    });

    it('maps array-based scheduleInfo into weekly slots', () => {
        const manager = new ScheduleManager();
        const weekly = manager.generateWeeklySchedule([
            {
                name: 'OOP',
                scheduleInfo: [
                    { day: 2, periods: [1, 2], room: 'A101' },
                    { day: 5, periods: [6], room: 'B202' }
                ]
            }
        ]);

        expect(weekly[0][0]).toHaveLength(1);
        expect(weekly[1][0]).toHaveLength(1);
        expect(weekly[5][3]).toHaveLength(1);
        expect(weekly[5][3][0].name).toBe('OOP');
    });
});
