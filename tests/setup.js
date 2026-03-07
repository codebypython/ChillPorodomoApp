import 'fake-indexeddb/auto';

globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

class MockAudio {
    constructor(url = '') {
        this.url = url;
        this.loop = false;
        this.volume = 1;
        this.currentTime = 0;
        this.paused = true;
        this.listeners = new Map();
    }

    play() {
        this.paused = false;
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
    }

    addEventListener(name, handler) {
        this.listeners.set(name, handler);
    }
}

class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
    }

    createGain() {
        return {
            gain: {
                value: 1,
                setValueAtTime() {},
                linearRampToValueAtTime() {},
                exponentialRampToValueAtTime() {}
            },
            connect() {},
            disconnect() {}
        };
    }

    createOscillator() {
        return {
            frequency: { value: 0 },
            type: 'sine',
            connect() {},
            start() {},
            stop() {}
        };
    }

    createMediaElementSource() {
        return {
            connect() {},
            disconnect() {}
        };
    }

    resume() {
        this.state = 'running';
        return Promise.resolve();
    }

    close() {
        this.state = 'closed';
        return Promise.resolve();
    }
}

globalThis.Audio = MockAudio;
globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;
globalThis.alert = () => {};
globalThis.confirm = () => true;

beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
});
