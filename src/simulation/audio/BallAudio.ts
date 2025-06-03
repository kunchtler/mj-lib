import { ThreeAudio, ThreePositionalAudio } from "../CustomThreeAudio";
import { JugglerAudio } from "./JugglerAudio";

export type BallAudioParams = {
    bufferMap: Map<string, AudioBuffer>;
    threeAudio: ThreeAudio | ThreePositionalAudio;
    connectTo?: AudioNode;
    // ball: BallSim;
    // listener: THREE.AudioListener;
    // positional?: boolean;
};
//TODO : Rather do directly with PositionalAudio created by the view (so that fiber handle it on its own ?)

export class BallAudio {
    bufferMap: Map<string, AudioBuffer>;
    readonly node: ThreeAudio | ThreePositionalAudio;
    // private _ball: WeakRef<BallSim>;
    private connectedTo?: AudioNode;
    // private connectedJuggler?: JugglerAudio;

    constructor({ bufferMap, threeAudio, connectTo }: BallAudioParams) {
        // this._ball = new WeakRef(ball);
        this.bufferMap = bufferMap;
        this.node = threeAudio;
        if (connectTo !== undefined) {
            this.connect(connectTo);
        }
        // this.node = positional ? new ThreePositionalAudio(listener) : new ThreeAudio(listener);
        // this.ball.threeObject.add(this.node);
    }

    // get ball(): BallSim {
    //     const ball = this._ball.deref();
    //     if (ball === undefined) {
    //         throw ReferenceError("No ball ref. This shouldn't happen.");
    //     }
    //     return ball;
    // }

    isAudioPositional(): boolean {
        return this.node instanceof ThreePositionalAudio;
    }

    setVolume(value: number) {
        this.node.setVolume(value);
    }

    getVolume(): number {
        return this.node.getVolume();
    }

    connect(node: AudioNode): void {
        this.disconnect();
        this.node.connectTo(node);
        this.connectedTo = node;
    }

    //TODO : In doc, mention that audio is not rerouted.
    disconnect(): void {
        if (this.connectedTo !== undefined) {
            this.node.disconnectFrom(this.connectedTo);
            this.connectedTo = undefined;
        }
    }

    play(soundName: string, loop = false): void {
        const soundBuffer = this.bufferMap.get(soundName);
        if (soundBuffer === undefined) {
            console.log(`Ball has no known sound "${soundName}" in buffer to play.`);
            return;
        }
        this.node.stop();
        this.node.setBuffer(soundBuffer);
        this.node.setLoop(loop);
        this.node.play();
    }

    pause(): void {
        this.node.pause();
    }

    unpause(): void {
        this.node.play();
    }

    stop(): void {
        this.node.stop();
    }

    //TODO : Is range of value limited ?
    setPlaybackRate(value: number): void {
        this.node.setPlaybackRate(value);
    }

    getPlaybackRate(): number {
        return this.node.playbackRate;
    }

    dispose() {
        // Stop the sound.
        this.stop();
        // Disconnect from juggler.
        this.disconnect();
        // Clear buffer
        this.node.buffer = null;
    }
}
