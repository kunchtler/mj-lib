/**
 * Converts a vector (in the mathematical sense) from world to local coordinates.
 * @param vec a Vector3 in world coordinates.
 * @param obj the target Object3D for local coordinates.
 * @returns a vector in local coordinates.
 */

import { Euler, Object3D, Quaternion, Vector3 } from "three";

export function worldToLocalVector(vec: Vector3, obj: Object3D): Vector3 {
    return obj.worldToLocal(vec.clone()).sub(obj.worldToLocal(new Vector3(0, 0, 0)));
}

export function localToWorldVector(vec: Vector3, obj: Object3D): Vector3 {
    return obj.localToWorld(vec.clone()).sub(obj.localToWorld(new Vector3(0, 0, 0)));
}

export function changeVectorCoordinateSystem(
    vec: Vector3,
    originObj: Object3D,
    targetObj: Object3D
): Vector3 {
    return worldToLocalVector(localToWorldVector(vec, originObj), targetObj);
}

export function worldToLocalPosition(pos: Vector3, obj: Object3D): Vector3 {
    return obj.worldToLocal(pos.clone());
}

export function localToWorldPosition(pos: Vector3, obj: Object3D): Vector3 {
    return obj.localToWorld(pos.clone());
}

export function changePositionCoordinateSystem(
    pos: Vector3,
    originObj: Object3D,
    targetObj: Object3D
): Vector3 {
    return worldToLocalPosition(localToWorldPosition(pos, originObj), targetObj);
}

// export function worldToLocalRotation(rot: Euler, obj: Object3D): Euler {
//     // To test, given by chatGPT
//     if (obj.parent === null) {
//         return rot;
//     } else {
//         const rotWorldQuat = new Quaternion().setFromEuler(rot);
//         const parentWorldQuat = obj.parent.getWorldQuaternion(new Quaternion());
//         const localQuat = parentWorldQuat.invert().multiply(rotWorldQuat);
//         return new Euler().setFromQuaternion(localQuat);
//     }
// }

// export function localToWorldRotation(rot: Euler, obj: Object3D): Euler {
//     return new Euler().setFromQuaternion(obj.getWorldQuaternion(new Quaternion()));
// }

export function upVectorFromRotation(rot: Euler) {
    return new Vector3(0, 1, 0).applyEuler(rot);
}

export function upVector(obj: Object3D) {
    return localToWorldVector();
}
