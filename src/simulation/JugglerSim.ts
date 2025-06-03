import * as THREE from "three";
import { HandInfo, HandSim } from "./HandSim";
import { JugglerModel } from "../model/JugglerModel";
import { JugglerAudio } from "./audio/JugglerAudio";

export interface JugglerSimParams {
    // object3D: THREE.Mesh;
    hands?: [HandSim, HandSim];
    model: JugglerModel;
    // allowAudio?: boolean;
}

export type JugglerInfo = {
    rightHand: HandInfo;
    leftHand: HandInfo;
};

//TODO : Allow to toggle the audio on/off.
export class JugglerSim {
    model: JugglerModel;
    readonly hands: [HandSim, HandSim];
    // object3D: THREE.Object3D;
    // audio: JugglerAudio;
    // gainNode?: GainNode;

    constructor({ hands, model }: JugglerSimParams) {
        this.model = model;
        this.hands = hands ?? [
            new HandSim({ model: model.hands[0] }),
            new HandSim({ model: model.hands[1] })
        ];
        // this.object3D = object3D;
    }

    get leftHand(): HandSim {
        return this.hands[0];
    }

    set leftHand(hand: HandSim) {
        this.hands[0] = hand;
    }

    get rightHand(): HandSim {
        return this.hands[1];
    }

    set rightHand(hand: HandSim) {
        this.hands[1] = hand;
    }

    fillPositionInfo({ rightHand, leftHand }: JugglerInfo) {
        this.rightHand.fillPositionInfo(rightHand);
        this.leftHand.fillPositionInfo(leftHand);
    }
}
