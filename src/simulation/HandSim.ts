import * as THREE from "three";
import { HandModel } from "../model/HandModel";

export interface HandSimParams {
    model: HandModel;
    // object3D: THREE.Object3D;
}

export type HandInfo = {
    tossPos: THREE.Vector3;
    catchPos: THREE.Vector3;
    restPos: THREE.Vector3;
};

export class HandSim {
    model: HandModel;
    // object3D: THREE.Object3D;

    constructor({ model }: HandSimParams) {
        this.model = model;
        // this.object3D = object3D;
        // this.object3D.visible = false;
    }

    fillPositionInfo({ tossPos, catchPos, restPos }: HandInfo) {
        this.model.restPos = restPos;
        this.model.catchPos = catchPos;
        this.model.tossPos = tossPos;
    }
}
