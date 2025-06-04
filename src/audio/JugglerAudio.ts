import * as THREE from "three";

export class JugglerAudio {
    gain: GainNode;
    context: AudioContext;

    constructor(context?: AudioContext) {
        this.context = context ?? THREE.AudioContext.getContext();
        this.gain = new GainNode(this.context);
    }

    setVolume(value: number): void {
        this.gain.gain.setValueAtTime(value, this.context.currentTime);
    }

    getVolume(): number {
        return this.gain.gain.value;
    }

    dispose() {
        this.gain.disconnect();
    }
}
