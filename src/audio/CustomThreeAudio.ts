import * as THREE from "three";

// ThreeJS requires an audioListener to create audio objects.
// We create a decoy one that we immediately unbind
const _decoyListener = (() => {
    const listener = new THREE.AudioListener();
    listener.gain.disconnect();
    return listener;
})();

/**
 * Custom class to better handle audio nodes connexion.
 * By default, ThreeJS audio node connection is the following :
 * - a THREE.Audio or THREE.PositionalAudio composed of :
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
export class CustomThreePositionalAudio extends THREE.PositionalAudio {
    constructor(targetAudioNode?: AudioNode | THREE.AudioListener) {
        super(_decoyListener);
        this.gain.disconnect(_decoyListener.getInput());
        if (targetAudioNode !== undefined) {
            this.connectTo(targetAudioNode);
        }
    }

    /**
     * Connects the gain to another node.
     * @param node an AudioNode, or a ThreeJs Audiolistener.
     */
    connectTo(node: AudioNode | THREE.AudioListener): void {
        this.gain.connect(node instanceof AudioNode ? node : node.getInput());
    }

    /**
     * Disconnects the gain from another node.
     * @param node an AudioNode, or a ThreeJs Audiolistener, or undefined.
     * If no node is specified, disconnects from all nodes.
     */
    disconnectFrom(node?: AudioNode | THREE.AudioListener): void {
        if (node === undefined) {
            this.gain.disconnect();
        } else if (node instanceof AudioNode) {
            this.gain.disconnect(node);
        } else {
            this.gain.disconnect(node.getInput());
        }
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
// export class ThreeAudio extends THREE.Audio {
//     constructor(targetAudioNode?: AudioNode | THREE.AudioListener) {
//         super(_decoyListener);
//         this.gain.disconnect(_decoyListener.getInput());
//         if (targetAudioNode !== undefined) {
//             this.connectTo(targetAudioNode);
//         }
//     }

//     /**
//      * Connects the gain to another node.
//      * @param node an AudioNode, or a ThreeJs Audiolistener.
//      */
//     connectTo(node: AudioNode | THREE.AudioListener): void {
//         this.gain.connect(node instanceof AudioNode ? node : node.getInput());
//     }

//     /**
//      * Disconnects the gain from another node.
//      * @param node an AudioNode, or a ThreeJs Audiolistener.
//      * If no node is specified, disconnects from all nodes.
//      */
//     disconnectFrom(node?: AudioNode | THREE.AudioListener): void {
//         if (node === undefined) {
//             this.gain.disconnect();
//         } else if (node instanceof AudioNode) {
//             this.gain.disconnect(node);
//         } else {
//             this.gain.disconnect(node.getInput());
//         }
//     }
// }
