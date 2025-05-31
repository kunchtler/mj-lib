import * as THREE from "three";
import { TableModel } from "../model/TableModel";

// TODO : To debug, show the model helpers !

//TODO : Rename Ball_placement en balls_spot
//TODO : Change THREE.Vector2 to [number, number]
export interface TableSimParams {
    object3D: THREE.Object3D;
    model: TableModel;
    debug?: boolean;
}

export class TableSim {
    object3D: THREE.Object3D;
    model: TableModel;
    private _debug: boolean;

    constructor({ object3D, debug, model }: TableSimParams) {
        this.object3D = object3D;
        this.model = model;
        this._debug = debug ?? false;
        if (debug === true) {
            this.enableDebug();
        }
    }

    addSpot(ballName: string, spot: THREE.Object3D) {
        this.model.ballsPlacement.set(ballName, spot);
    }

    removeSpot(ballName: string) {
        this.model.ballsPlacement.delete(ballName);
    }

    setUnknownSpot(spot: THREE.Object3D) {
        this.model.unkownBallPosition = spot;
    }

    debugEnabled(): boolean {
        return this._debug;
    }

    enableDebug(): void {
        if (this.debugEnabled()) {
            return;
        }
        // this._surfaceInternal.add(new Object3DHelper(true, undefined, true));
        // this._surfaceInternal.add(new THREE.GridHelper(10, 10, "orange", "orange"));
        // this.mesh.add(this._surfaceInternal);
        // this.mesh.add(this.bottomLeftCorner);
        // this.mesh.add(this.upRightCorner);
        this._debug = true;
    }

    disableDebug(): void {
        if (!this.debugEnabled()) {
            return;
        }
        //TODO
        this._debug = false;
    }

    dispose(): void {
        //TODO
        this.disableDebug();
    }
}
