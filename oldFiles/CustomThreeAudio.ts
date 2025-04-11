import * as THREE from "three";

export class MyAudio extends THREE.Audio {
    constructor(listener: THREE.AudioListener, gain: GainNode) {
        super(listener);
        this.gain.disconnect(listener.getInput());
        this.gain = gain;
        this.gain.connect(listener.getInput());
    }
}

export class MyPositionalAudio extends THREE.PositionalAudio {
    constructor(listener: THREE.AudioListener, gain: GainNode) {
        super(listener);
        this.gain.disconnect(listener.getInput());
        this.gain = gain;
        this.gain.connect(listener.getInput());
    }
}
