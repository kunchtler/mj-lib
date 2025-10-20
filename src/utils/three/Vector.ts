import * as THREE from "three";
//TODO : Remove the import * as THREE and do import {...} from three.

/**
 * Computes the component-wise average of 3D Vectors.
 * @param vectors an array of ThreeJS 3D vectors.
 * @returns the average vector.
 */
export function averageVector3(vectors: THREE.Vector3[]): THREE.Vector3 {
    const sum = new THREE.Vector3(0, 0, 0);
    if (vectors.length === 0) {
        return sum;
    }
    for (const vec of vectors) {
        sum.add(vec);
    }
    sum.divideScalar(vectors.length);
    return sum;
}

export function averageEulerAngle(rotations: THREE.Euler[]): THREE.Euler {
    if (rotations.length === 0) {
        return new THREE.Euler(0, 0, 0);
    }
    // We apply each rotation to a basis, and then take the average of
    // each vector of that basis to get an "average rotation".
    const sumX = new THREE.Vector3(0, 0, 0);
    const sumY = new THREE.Vector3(0, 0, 0);
    const sumZ = new THREE.Vector3(0, 0, 0);
    // Reused to avoid creating to much vecs.
    const vec = new THREE.Vector3(0, 0, 0);
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
    const mat = new THREE.Matrix4().makeBasis(sumX, sumY, sumZ);
    return new THREE.Euler().setFromRotationMatrix(mat);
}