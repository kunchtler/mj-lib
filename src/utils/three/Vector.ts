//TODO : Remove the import * as THREE and do import {...} from three.

import { Vector3, Euler, Matrix4, EulerOrder } from "three";

/**
 * Computes the component-wise average of 3D Vectors.
 * @param vectors an array of ThreeJS 3D vectors.
 * @returns the average vector.
 */
export function averageVector3(vectors: Vector3[]): Vector3 {
    const sum = new Vector3(0, 0, 0);
    if (vectors.length === 0) {
        return sum;
    }
    for (const vec of vectors) {
        sum.add(vec);
    }
    sum.divideScalar(vectors.length);
    return sum;
}

export function averageEulerAngle(rotations: Euler[]): Euler {
    if (rotations.length === 0) {
        return new Euler(0, 0, 0);
    }
    // We apply each rotation to a basis, and then take the average of
    // each vector of that basis to get an "average rotation".
    const sumX = new Vector3(0, 0, 0);
    const sumY = new Vector3(0, 0, 0);
    const sumZ = new Vector3(0, 0, 0);
    // Reused to avoid creating to much vecs.
    const vec = new Vector3(0, 0, 0);
    for (const rot of rotations) {
        vec.set(1, 0, 0);
        sumX.add(vec.applyEuler(rot));
        vec.set(0, 1, 0);
        sumY.add(vec.applyEuler(rot));
        vec.set(0, 0, 1);
        sumZ.add(vec.applyEuler(rot));
    }
    sumX.divideScalar(rotations.length).normalize();
    sumY.divideScalar(rotations.length).normalize();
    sumZ.divideScalar(rotations.length).normalize();
    const mat = new Matrix4().makeBasis(sumX, sumY, sumZ);
    return new Euler().setFromRotationMatrix(mat);
}

export function toVector(arr: [number, number, number] | number[]): Vector3 {
    return new Vector3(arr[0], arr[1], arr[2]);
}

export function toEuler(arr: [number, number, number] | number[], order?: EulerOrder): Euler {
    return new Euler(arr[0], arr[1], arr[2], order);
}
