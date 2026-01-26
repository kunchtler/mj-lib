import { Vector3, Object3D, Euler } from "three";
import { ThreeSyncedPosition, ThreeSyncedRotation } from "./ThreeSyncedProperty";
import { localToWorldVector } from "../utils";
import { toEuler, toVector } from "../utils/three/Vector";

export type SpotModelParams = {
    position?: Vector3;
    rotation?: Euler;
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
        this.position = new ThreeSyncedPosition(this._object, position);
        this.rotation = new ThreeSyncedRotation(this._object, rotation);
    }

    // TODO : Document distance is global.
    positionOver(distance: number): Vector3 {
        const globalUpVec = localToWorldVector(new Vector3(0, 1, 0), this._object).normalize();
        return this.position.getGlobal().add(globalUpVec.multiplyScalar(distance));
    }
}

export function toSpotParam(
    pos: [number, number, number] | number[],
    rot?: [number, number, number] | number[]
): SpotModelParams {
    return { position: toVector(pos), rotation: rot === undefined ? undefined : toEuler(rot) };
}
