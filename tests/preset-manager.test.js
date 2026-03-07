import { PresetManager } from '../js/classes/PresetManager.js';
import { Settings } from '../js/classes/Settings.js';
import { storageManager } from '../js/classes/StorageManager.js';

describe('PresetManager', () => {
    beforeEach(async () => {
        await storageManager.clearAllData();
        document.body.innerHTML = `
            <div id="notification"><span id="notificationText"></span></div>
            <div id="presetsList"></div>
        `;
    });

    it('stores and restores multi-track selections', async () => {
        const settings = new Settings();
        settings.selectedMusicTracks = [
            { id: '1', name: 'Lofi', volume: 35 },
            { id: '2', name: 'Rain', volume: 55 }
        ];
        settings.enableBackgroundMusic = true;

        const backgroundManager = {
            applyBackground: vi.fn()
        };
        const audioManager = {
            startBackgroundMusic: vi.fn(),
            stopBackgroundMusic: vi.fn()
        };

        const manager = new PresetManager(settings, backgroundManager, audioManager);
        await manager.saveCurrentAsPreset('Deep focus');
        await manager.loadPresets();
        await manager.loadPreset(manager.presets[0].id);

        expect(manager.presets[0].settings.selectedMusicTracks).toHaveLength(2);
        expect(settings.selectedMusicTracks).toHaveLength(2);
        expect(audioManager.startBackgroundMusic).toHaveBeenCalled();
    });
});
