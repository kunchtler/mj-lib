import { Vector3, Object3D, Euler } from "three";
import { ThreeSyncedPosition, ThreeSyncedRotation } from "./ThreeSyncedProperty";
import { localToWorldVector } from "../utils";

export type SpotModelParams = {
    position?: [number, number, number];
    rotation?: [number, number, number];
};

export class SpotModel {
    position: ThreeSyncedPosition;
    /**
     * The rotation of the spot is used to defined the "up vector", ie
     * How to position object when it goes on top of the spot.
     */
    rotation: ThreeSyncedRotation;
    readonly _object = new Object3D();

    constructor({ position, rotation }: SpotModelParams) {
        position ??= [0, 0, 0];
        rotation ??= [0, 0, 0];
        this.position = new ThreeSyncedPosition(this._object, new Vector3(...position));
        this.rotation = new ThreeSyncedRotation(this._object, new Euler(...rotation));
    }

    // TODO : Document distance is global.
    positionOver(distance: number): Vector3 {
        const globalUpVec = localToWorldVector(new Vector3(0, 1, 0), this._object).normalize();
        return this.position.getGlobal().add(globalUpVec.multiplyScalar(distance));
    }
}
