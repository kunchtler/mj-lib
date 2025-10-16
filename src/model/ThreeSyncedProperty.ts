import { Euler, Object3D, Quaternion, Vector3 } from "three";

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
        this.setLocal(this._object.worldToLocal(pos.clone()));
    }

    getLocal(): Vector3 {
        return this._object.position.clone();
    }

    getGlobal(): Vector3 {
        return this._object.localToWorld(this.getLocal());
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

    setLocal(rot: Euler) {
        this._object.rotation.copy(rot);
    }

    setGlobal(rot: Euler) {
        // To test, given by chatGPT
        if (this._object.parent === null) {
            this.setLocal(rot);
        } else {
            const rotWorldQuat = new Quaternion().setFromEuler(rot);
            const parentWorldQuat = this._object.parent.getWorldQuaternion(new Quaternion());
            const localQuat = parentWorldQuat.invert().multiply(rotWorldQuat);
            this._object.setRotationFromQuaternion(localQuat);
        }
    }

    getLocal(): Euler {
        return this._object.rotation.clone();
    }

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

    setLocal(scale: Vector3) {
        this._object.scale.copy(scale);
    }

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

    getLocal(): Vector3 {
        return this._object.scale.clone();
    }

    getGlobal(): Vector3 {
        return this._object.getWorldScale(new Vector3());
    }
}
