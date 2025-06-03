import { immerable, produce } from "immer";
import * as THREE from "three";

class A {
    [immerable] = true;
    x = 1;
    b = new B();
}

class B {
    [immerable] = true;
    y = 1;
}

const a1 = new A();
const a2 = produce(a1, (draft) => {
    draft.x = 2;
});
const a3 = produce(a1, (draft) => {
    draft.b.y = 2;
});
console.log(`a1 : x ${a1.x} y ${a1.b.y}`);
console.log(`a2 : x ${a2.x} y ${a2.b.y}`);
console.log(`a3 : x ${a3.x} y ${a3.b.y}`);

// class Clock {
//     [immerable] = true;
//     hour: number;
//     minute: number;
//     test = { x: 1 };
//     tr = new THREE.Object3D();

//     constructor(hour: number, minute: number) {
//         this.hour = hour;
//         this.minute = minute;
//     }

//     get time() {
//         return `${this.hour}:${this.minute}`;
//     }

//     tick() {
//         return produce(this, (draft) => {
//             draft.minute++;
//         });
//     }
// }

// const clock1 = new Clock(12, 10);
// const clock3 = produce(clock1, (draft) => {
//     draft.minute++;
// });
// const clock4 = produce(clock3, (draft) => {
//     draft.tr = new THREE.Object3D();
//     draft.tr.position.set(1, 0, 0);
// });
// console.log(clock1.tr.position); // 12:10
// console.log(clock3.tr.position);
// console.log(clock4.tr.position);
// console.log(clock1.tr.position); // 12:10

// clock1.hour = 13;
// console.log(clock3.tr === clock4.tr);
