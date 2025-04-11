import { Structure } from "./spline/Matrix";
import { V3ADD, V3MUL, V3SCA } from "./three/StaticOp";
import * as THREE from "three";

export const GRAVITY = 9.81;
export const NUMBERS_STRUCTURE: Structure<number, number> = {
    add: (a: number, b: number) => a + b,
    multiply: (a: number, b: number) => a * b,
    multiplyByScalar: (scalar: number, a: number) => scalar * a,
    zero: 0
};
export const VECTOR3_STRUCTURE: Structure<THREE.Vector3, number> = {
    add: V3ADD,
    multiply: V3MUL,
    multiplyByScalar: V3SCA,
    zero: new THREE.Vector3(0, 0, 0)
};
