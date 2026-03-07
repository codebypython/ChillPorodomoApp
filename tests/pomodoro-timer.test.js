import { PomodoroTimer } from '../js/classes/PomodoroTimer.js';
import { Settings } from '../js/classes/Settings.js';
import { storageManager } from '../js/classes/StorageManager.js';

function mountTimerDom() {
    document.body.innerHTML = `
        <div id="notification"><span id="notificationText"></span></div>
        <div class="timer-circle">
            <svg><circle id="progressCircle"></circle></svg>
        </div>
        <div id="timeDisplay"></div>
        <div id="sessionType"></div>
        <div id="sessionCount"></div>
        <button id="startBtn"><span class="btn-text"></span></button>
        <button id="pauseBtn"></button>
    `;
}

describe('PomodoroTimer', () => {
    beforeEach(async () => {
        await storageManager.clearAllData();
        mountTimerDom();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('persists running state and resumes remaining time after reload', () => {
        const settings = new Settings();
        settings.workDuration = 25;
        const audioManager = {
            playNotification: vi.fn()
        };

        const timer = new PomodoroTimer(settings, audioManager);
        timer.currentTime = 1500;
        timer.start(false);

        const persisted = storageManager.getTimerState();
        persisted.runtime.currentTime = 1200;
        persisted.runtime.isRunning = true;
        persisted.runtime.lastTickAt = Date.now() - 30_000;
        storageManager.saveTimerState(persisted);

        const restored = new PomodoroTimer(settings, audioManager);

        expect(restored.isRunning).toBe(true);
        expect(restored.currentSession).toBe('work');
        expect(restored.currentTime).toBeLessThanOrEqual(1170);

        restored.pause();
    });
});
