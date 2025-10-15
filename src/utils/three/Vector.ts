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
