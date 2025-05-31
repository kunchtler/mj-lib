import * as THREE from "three";
import { HandModel } from "../model/HandModel";

export interface HandSimParams {
    object3D: THREE.Object3D;
    model: HandModel;
    debug?: boolean;
}

export class HandSim {
    object3D: THREE.Object3D;
    model: HandModel;

    constructor({ object3D, model, debug }: HandSimParams) {
        this.object3D = object3D;
        this.model = model;
        // this.object3D.visible = false;
    }

    enabledDebug() {}

    disableDebug() {}

    dispose(): void {}
}
