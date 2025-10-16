import { Vector3, Object3D } from "three";
import { ThreeSyncedPosition } from "./ThreeSyncedProperty";

export type SpotModelParams = {
    position?: Vector3;
};

export class SpotModel {
    position: ThreeSyncedPosition;
    readonly _object = new Object3D();

    constructor({ position }: SpotModelParams) {
        this.position = new ThreeSyncedPosition(this._object, position);
    }
}
