import * as THREE from "three";

export function V3ADD(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
}
export function V3SUB(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
}
export function V3MUL(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
}
export function V3SCA(scalar: number, a: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(scalar * a.x, scalar * a.y, scalar * a.z);
}

export function V2ADD(a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    return new THREE.Vector2(a.x + b.x, a.y + b.y);
}
export function V2SUB(a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    return new THREE.Vector2(a.x - b.x, a.y - b.y);
}
export function V2MUL(a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    return new THREE.Vector2(a.x * b.x, a.y * b.y);
}
export function V2SCA(scalar: number, a: THREE.Vector2): THREE.Vector2 {
    return new THREE.Vector2(scalar * a.x, scalar * a.y);
}

