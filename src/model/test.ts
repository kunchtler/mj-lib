import * as THREE from "three";

// const x = new THREE.Object3D();
// x.position.set(0, 1, 0);
// console.log(x.getWorldPosition(new THREE.Vector3()));
// const y = new THREE.Object3D();
// y.position.set(0, 1, 0);
// console.log(y.getWorldPosition(new THREE.Vector3()));
// y.add(x);
// console.log(x.position);
// console.log(x.getWorldPosition(new THREE.Vector3()));

// console.log(stringifyMatrix(x.matrix));
// x.applyMatrix4(new THREE.Matrix4(1, 0, 0, 0, 0, 1, 0, 3, 0, 0, 1, 0, 0, 0, 0, 1));

// console.log(stringifyMatrix(x.matrix));
// // console.log(new THREE.Vector3().setFromMatrixPosition(x.matrixWorld))
// console.log(x.getWorldPosition(new THREE.Vector3()));
// console.log(x.position);

// function stringifyMatrix(mat: THREE.Matrix2 | THREE.Matrix3 | THREE.Matrix4) {
//     let text = "";
//     const size = Math.round(Math.sqrt(mat.elements.length));
//     for (let rowIdx = 0; rowIdx < size; rowIdx++) {
//         for (let colIdx = 0; colIdx < size; colIdx++) {
//             text += mat.elements[colIdx * size + rowIdx].toString();
//         }
//         if (rowIdx !== size - 1) {
//             text += "\n";
//         }
//     }
//     return text;
// }

// console.log(x.parent);
// console.log(y.parent);
const grandparent = new THREE.Object3D();
const parent = new THREE.Object3D();
const child = new THREE.Object3D();

grandparent.add(parent);
parent.add(child);

// Move/rotate/scale arbitrarily
grandparent.position.set(5, 0, 0);
parent.position.set(2, 0, 0);
parent.scale.set(1, 0, 0);
// parent.rotateY(-Math.PI / 2);
child.position.set(1, 0, 0);
// child.rotateY(-Math.PI / 2);

parent.updateWorldMatrix(true, true)

// const rel = new THREE.Matrix4().copy(grandparent.matrixWorld).invert().multiply(child.matrixWorld);

// const pos = new THREE.Vector3();
// const quat = new THREE.Quaternion();
// const scl = new THREE.Vector3();
// rel.decompose(pos, quat, scl);

console.log("Relative position:", child.position); // (should be roughly (3, 0, 0))
console.log("Child local rot:", child.rotation);
console.log("Child world rot:", parent.getWorldQuaternion(new THREE.Quaternion()))