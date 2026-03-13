import { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three";

// TODO : DOcument that all of this is used for STATIC PROPERTIES OF THE PERFORMANCE.
// TODO : Document that they SHOULDN T BE SET BY THE CLASSES COMPUTING THE POSITIONS AND VELOCITIES.
export class ThreeSyncedPosition {
    private _object: Object3D;

    constructor(obj: Object3D, localPos?: Vector3) {
        this._object = obj;
        if (localPos !== undefined) {
            this.setLocal(localPos);
        }
    }

    setLocal(pos: Vector3) {
        this._object.position.copy(pos);
    }

    setGlobal(pos: Vector3) {
        if (this._object.parent === null) {
            // The object has no parent, so it is already in the global system.
            this.setLocal(pos);
        } else {
            const localPos = this._object.parent.worldToLocal(pos.clone());
            this.setLocal(localPos);
        }
    }

    getLocal(): Vector3 {
        return this._object.position.clone();
    }

    getGlobal(): Vector3 {
        return this._object.getWorldPosition(new Vector3());
    }
}

export class ThreeSyncedRotation {
    private _object: Object3D;

    constructor(obj: Object3D, localRot?: Euler) {
        this._object = obj;
        if (localRot !== undefined) {
            this.setLocal(localRot);
        }
    }

    // TODO : TEST
    setLocal(rot: Euler) {
        this._object.rotation.copy(rot);
    }

    // TODO : TEST
    setGlobal(rot: Euler) {
        // To test, given by chatGPT
        if (this._object.parent === null) {
            this.setLocal(rot);
        } else {
            // const parent = this._object.parent;
            // parent.remove(this._object);
            // this.setLocal(rot);
            // parent.attach(this._object);
            // this._object.parent.updateMatrixWorld(true); // ensure parent world matrix is correct
            const rotWorldQuat = new Quaternion().setFromEuler(rot);
            const parentWorldQuat = this._object.parent.getWorldQuaternion(new Quaternion());
            const localQuat = parentWorldQuat.invert().multiply(rotWorldQuat);
            this._object.quaternion.copy(localQuat);
            // this._object.updateWorldMatrix(true, false);

            //     const parentMatrixWorld = new Matrix4();
            //     parentMatrixWorld.copy(this._object.parent.matrixWorld);

            //     const worldMatrix = new Matrix4();
            //     worldMatrix.compose(
            //         this._object.getWorldPosition(new Vector3()),
            //         rotWorldQuat,
            //         this._object.getWorldScale(new Vector3())
            //     );

            //     const localMatrix = new Matrix4()
            //         .copy(parentMatrixWorld)
            //         .invert()
            //         .multiply(worldMatrix);

            //     localMatrix.decompose(
            //         this._object.position,
            //         this._object.quaternion,
            //         this._object.scale
            //     );
        }
        // this._object.updateMatrixWorld(true); // update object world matrix
    }

    // TODO : TEST
    getLocal(): Euler {
        return this._object.rotation.clone();
    }

    // TODO : TEST
    getGlobal(): Euler {
        return new Euler().setFromQuaternion(this._object.getWorldQuaternion(new Quaternion()));
    }
}

export class ThreeSyncedScale {
    private _object: Object3D;

    constructor(obj: Object3D, localScale?: Vector3) {
        this._object = obj;
        if (localScale !== undefined) {
            this.setLocal(localScale);
        }
    }

    // TODO : TEST
    setLocal(scale: Vector3) {
        this._object.scale.copy(scale);
    }

    // TODO : TEST
    setGlobal(scale: Vector3) {
        // To test, given by gpt.
        if (this._object.parent === null) {
            this.setLocal(scale);
        } else {
            const parentScale = this._object.parent.getWorldScale(new Vector3());
            const targetScaleLocal = scale.divide(parentScale);
            this.setLocal(targetScaleLocal);
        }
    }

    // TODO : TEST
    getLocal(): Vector3 {
        return this._object.scale.clone();
    }

    // TODO : TEST
    getGlobal(): Vector3 {
        return this._object.getWorldScale(new Vector3());
    }
}

export type ObjectPropertiesOptional = { position?: Vector3; rotation?: Euler; scale?: Vector3 };

export class ThreeDummyObject {
    private _object: Object3D;
    private _stack: ObjectPropertiesOptional[];

    constructor(obj: Object3D) {
        this._object = obj;
        this._stack = [];
    }

    setProperties({ position, rotation, scale }: ObjectPropertiesOptional) {
        this._stack.push({});
        if (position !== undefined) {
            this._stack[this._stack.length - 1].position = this._object.position.clone();
            this._object.position.copy(position);
        }
        if (rotation !== undefined) {
            this._stack[this._stack.length - 1].rotation = this._object.rotation.clone();
            this._object.rotation.copy(rotation);
        }
        if (scale !== undefined) {
            this._stack[this._stack.length - 1].scale = this._object.scale.clone();
            this._object.scale.copy(scale);
        }
    }

    unsetProperties(): ObjectPropertiesOptional {
        const props = this._stack.pop();
        if (props === undefined) {
            return {};
        }
        if (props.position !== undefined) {
            this._object.position.copy(props.position);
        }
        if (props.rotation !== undefined) {
            this._object.rotation.copy(props.rotation);
        }
        if (props.scale !== undefined) {
            this._object.scale.copy(props.scale);
        }
        return props;
    }

    get(): Object3D {
        return this._object;
    }

    // set(obj: Object3D) {
    //     while (this._stack.length !== 0) {
    //         this.unsetProperties();
    //     }
    //     this._object = obj;
    // }
}
