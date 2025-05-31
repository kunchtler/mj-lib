import * as THREE from "three";
import { HandSim } from "./HandSim";
import { JugglerModel } from "../model/JugglerModel";

export interface JugglerSimParams {
    object3D: THREE.Mesh;
    hands?: [HandSim, HandSim];
    model: JugglerModel;
    debug?: boolean;
    // allowAudio?: boolean;
}

//TODO : Allow to toggle the audio on/off.
export class JugglerSim {
    object3D: THREE.Object3D;
    readonly hands: [HandSim, HandSim];
    model: JugglerModel;
    // gainNode?: GainNode;

    constructor({ object3D, hands, model, debug }: JugglerSimParams) {
        this.object3D = object3D;
        this.model = model;
        this.hands = hands ?? [
            new HandSim({ model: model.hands[0], object3D: new THREE.Object3D(), debug: debug }),
            new HandSim({ model: model.hands[1], object3D: new THREE.Object3D(), debug: debug })
        ];
    }

    get leftHand(): HandSim {
        return this.hands[0];
    }

    // set leftHand(hand: HandSim) {
    //     this.hands[0] = hand;
    // }

    get rightHand(): HandSim {
        return this.hands[1];
    }

    // set rightHand(hand: HandSim) {
    //     this.hands[1] = hand;
    // }

    dispose() {}
}
