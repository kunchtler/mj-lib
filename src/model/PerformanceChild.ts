import { Object3D, Vector3, Euler } from "three";
import { PerformanceModel } from "./PerformanceModel";

// export type PerformanceRefParams = {
//     performance?: PerformanceModel;
// };

/**
 * Class inherited by all model classes contained within a performance.
 *
 * It manages an attribute to the performance (as a weak ref, to be garbage-collectable).
 */
export class PerformanceModelRef {
    private _performanceRef?: WeakRef<PerformanceModel>;

    constructor(performance?: PerformanceModel) {
        this.set(performance);
    }

    /**
     * The model of the performance this element is part of.
     */
    get(): PerformanceModel | undefined {
        if (this._performanceRef === undefined) {
            return undefined;
        }
        const obj = this._performanceRef.deref();
        if (obj === undefined) {
            throw new Error("Performance is undefined.");
        }
        return obj;
    }

    set(newPerformance: PerformanceModel | undefined) {
        if (newPerformance === undefined) {
            this._performanceRef = undefined;
        } else {
            this._performanceRef = new WeakRef(newPerformance);
        }
    }
}

export type PerformanceChildInterface = {
    _object: Object3D;
    // getPosition: (time: number) => Vector3;
    // getRotation: (time: number) => Vector3;
    // getScale: (time: number) => Vector3;
};

// export type ReadOnlyObject3DParams = PerformanceChild & {
//     position?: Vector3;
//     rotation?: Euler;
//     scale?: Vector3;
// };

// export class PerformanceChild {
//     private _object: Object3D;

//     constructor() {
//         this._object = new Object3D();
//     }

//     // get object(): Object3D {
//     //     return this._object;
//     // }

//     // get position(): Vector3 {
//     //     return this._object.position.clone();
//     // }

//     // set position(pos: Vector3) {
//     //     this._object.position.copy(pos);
//     // }

//     // get rotation(): Euler {
//     //     return this._object.rotation.clone();
//     // }

//     // set rotation(rot: Euler) {
//     //     this._object.rotation.set(rot.x, rot.y, rot.z, rot.order);
//     // }

//     // get scale(): Vector3 {
//     //     return this._object.scale;
//     // }

//     // set scale(pos: Vector3) {
//     //     this._object.scale.copy(pos);
//     // }
// }
