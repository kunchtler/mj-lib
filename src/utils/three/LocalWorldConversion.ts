import * as THREE from "three";

/**
 * Converts a vector (in the mathematical sense) from world to local coordinates.
 * @param vec a Vector3 in world coordinates.
 * @param obj the target Object3D for local coordinates.
 * @returns a vector in local coordinates.
 */

export function worlToLocalVector(vec: THREE.Vector3, obj: THREE.Object3D) {
    return obj.worldToLocal(vec.clone()).sub(obj.worldToLocal(new THREE.Vector3(0, 0, 0)));
}

export function localToWorldVector(vec: THREE.Vector3, obj: THREE.Object3D) {
    return obj.localToWorld(vec.clone()).sub(obj.localToWorld(new THREE.Vector3(0, 0, 0)));
}

export function worldToLocalPosition(pos: THREE.Vector3, obj: THREE.Object3D) {
    return obj.worldToLocal(pos.clone());
}

export function localToWorldPosition(pos: THREE.Vector3, obj: THREE.Object3D) {
    return obj.localToWorld(pos.clone());
} //TODO : Fust with ThreeUtils.ts
