import * as THREE from "three";

/**
 * Custom class to better handle audio nodes connexion.
 * By default, ThreeJS audio node connection is the following :
 * - a THREE.Audio or THREE.PositionAudio composed of :
 *   - a source: AudioNode
 *   - optional and configurable filters (AudioNode[])
 *   - some gain: GainNode, unique per Audio instance.
 *   - the listener : THREE.AudioListener
 * - a THREE.AudioListener, often attached to the camera, and
 * composed of :
 *   - some gain: GainNode
 *   - the context's destination. The context is maintained in a
 * singleton THREE.AudioContext.
 *
 * This custom class allows to specify what happens in between the
 * THREE.Audio or THREE.PoisitionalAudio gain and listener.
 */
export class ThreePositionalAudio extends THREE.PositionalAudio {
    constructor(listener: THREE.AudioListener) {
        super(listener);
        this.gain.disconnect(this.listener.getInput());
    }

    /**
     * Connects the gain to another node.
     * @param node an AudioNode, or a ThreeJs Audiolistener.
     */
    connectTo(node: AudioNode | THREE.AudioListener): void {
        this.gain.connect(node instanceof AudioNode ? node : node.getInput());
    }

    /**
     * Connects the gain from another node.
     * @param node an AudioNode, or a ThreeJs Audiolistener.
     */
    disconnectFrom(node: AudioNode | THREE.AudioListener): void {
        this.gain.disconnect(node instanceof AudioNode ? node : node.getInput());
    }
}

/**
 * Custom class to better handle audio nodes connexion.
 * By default, ThreeJS audio node connection is the following :
 * - a THREE.Audio or THREE.PositionAudio composed of :
 *   - a source: AudioNode
 *   - optional and configurable filters (AudioNode[])
 *   - some gain: GainNode, unique per Audio instance.
 *   - the listener : THREE.AudioListener
 * - a THREE.AudioListener, often attached to the camera, and
 * composed of :
 *   - some gain: GainNode
 *   - the context's destination. The context is maintained in a
 * singleton THREE.AudioContext.
 *
 * This custom class allows to specify what happens in between the
 * THREE.Audio or THREE.PoisitionalAudio gain and listener.
 */
export class ThreeAudio extends THREE.Audio {
    constructor(listener: THREE.AudioListener) {
        super(listener);
        this.gain.disconnect(this.listener.getInput());
    }

    /**
     * Connects the gain to another node.
     * @param node an AudioNode, or a ThreeJs Audiolistener.
     */
    connectTo(node: AudioNode | THREE.AudioListener): void {
        this.gain.connect(node instanceof AudioNode ? node : node.getInput());
    }

    /**
     * Connects the gain from another node.
     * @param node an AudioNode, or a ThreeJs Audiolistener.
     */
    disconnectFrom(node: AudioNode | THREE.AudioListener): void {
        this.gain.disconnect(node instanceof AudioNode ? node : node.getInput());
    }
}
