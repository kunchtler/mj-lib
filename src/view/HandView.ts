import * as THREE from "three";
import { HandModel } from "../model/HandModel";

/**
 * Parameters taken by HandView.
 */
export interface HandViewParams {
    model: HandModel;
    // object3D: THREE.Object3D;
}

export type HandInfo = {
    tossPos: THREE.Vector3;
    catchPos: THREE.Vector3;
    restPos: THREE.Vector3;
};

export class HandView {
    model: HandModel;
    // object3D: THREE.Object3D;

    constructor({ model }: HandViewParams) {
        this.model = model;
        // this.object3D = object3D;
        // this.object3D.visible = false;
    }

    /**
     * Updates the model with the position of :
     *
     * @param param0 Information about t
     */
    fillPositionInfo({ tossPos, catchPos, restPos }: HandInfo) {
        this.model.restPos = restPos;
        this.model.catchPos = catchPos;
        this.model.tossPos = tossPos;
    }
}
