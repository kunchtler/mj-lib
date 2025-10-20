import * as THREE from "three";

const x = new THREE.Object3D();
x.position.set(0, 1, 0);
console.log(x.getWorldPosition(new THREE.Vector3()));
const y = new THREE.Object3D();
y.position.set(0, 1, 0);
console.log(y.getWorldPosition(new THREE.Vector3()));
y.add(x);
console.log(x.position);
console.log(x.getWorldPosition(new THREE.Vector3()));

console.log(stringifyMatrix(x.matrix));
x.applyMatrix4(new THREE.Matrix4(1, 0, 0, 0, 0, 1, 0, 3, 0, 0, 1, 0, 0, 0, 0, 1));

console.log(stringifyMatrix(x.matrix));
// console.log(new THREE.Vector3().setFromMatrixPosition(x.matrixWorld))
console.log(x.getWorldPosition(new THREE.Vector3()));
console.log(x.position);


function stringifyMatrix(mat: THREE.Matrix2 | THREE.Matrix3 | THREE.Matrix4) {
    let text = "";
    const size = Math.round(Math.sqrt(mat.elements.length));
    for (let rowIdx = 0; rowIdx < size; rowIdx++) {
        for (let colIdx = 0; colIdx < size; colIdx++) {
            text += mat.elements[colIdx * size + rowIdx].toString();
        }
        if (rowIdx !== size - 1) {
            text += "\n";
        }
    }
    return text;
}

// console.log(x.parent);
// console.log(y.parent);
