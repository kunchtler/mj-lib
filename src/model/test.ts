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

console.log(x.parent);
console.log(y.parent);
