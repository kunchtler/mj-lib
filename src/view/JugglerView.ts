import { HandInfo, HandView } from "./HandView";
import { JugglerModel } from "../model/JugglerModel";

export interface JugglerViewParams {
    // object3D: THREE.Mesh;
    hands?: [HandView, HandView];
    model: JugglerModel;
    // allowAudio?: boolean;
}

export type JugglerInfo = {
    rightHand: HandInfo;
    leftHand: HandInfo;
};

//TODO : Allow to toggle the audio on/off.
export class JugglerView {
    model: JugglerModel;
    readonly hands: [HandView, HandView];
    // object3D: THREE.Object3D;
    // audio: JugglerAudio;
    // gainNode?: GainNode;

    constructor({ hands, model }: JugglerViewParams) {
        this.model = model;
        this.hands = hands ?? [
            new HandView({ model: model.hands[0] }),
            new HandView({ model: model.hands[1] })
        ];
        // this.object3D = object3D;
    }

    get leftHand(): HandView {
        return this.hands[0];
    }

    set leftHand(hand: HandView) {
        this.hands[0] = hand;
    }

    get rightHand(): HandView {
        return this.hands[1];
    }

    set rightHand(hand: HandView) {
        this.hands[1] = hand;
    }

    fillPositionInfo({ rightHand, leftHand }: JugglerInfo) {
        this.rightHand.fillPositionInfo(rightHand);
        this.leftHand.fillPositionInfo(leftHand);
    }
}
