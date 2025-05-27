import * as THREE from "three";

const obj1 = new THREE.Object3D();
const obj2 = new THREE.Object3D();
obj1.add(obj2);
obj2.position.set(1, 0, 0);
obj1.position.set(0, 0, 1);

const mesh = new THREE.Mesh();
obj1.add(mesh);

const res = new THREE.Vector3();

console.log(obj2.getWorldPosition(res));
