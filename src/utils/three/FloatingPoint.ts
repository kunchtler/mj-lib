import { Vector3 } from "three";

export const zeroVector = new Vector3(0, 0, 0);
export function areColinear(vec1: Vector3, vec2: Vector3, eps = Number.EPSILON) {
    // Check we aren't the null vector, else check the scale along the axis.
    return (
        !vecEquals(vec1, zeroVector) &&
        !vecEquals(vec2, zeroVector) &&
        floatEquals(vec1.x / vec2.x, vec1.y / vec2.y, eps) &&
        floatEquals(vec1.x / vec2.x, vec1.z / vec2.z, eps)
    );
}

export function vecEquals(vec1: Vector3, vec2: Vector3, eps = Number.EPSILON) {
    return (
        floatEquals(vec1.x, vec2.x, eps) &&
        floatEquals(vec1.y, vec2.y, eps) &&
        floatEquals(vec1.z, vec2.z, eps)
    );
}

export function floatEquals(x: number, y: number, eps = Number.EPSILON): boolean {
    const diff = Math.abs(x - y);
    return x === y || diff < eps || diff <= eps * Math.min(Math.abs(x), Math.abs(y));
}
