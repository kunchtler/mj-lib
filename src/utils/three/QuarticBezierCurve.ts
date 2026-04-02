import { CubicBezierCurve, CubicBezierCurve3, Vector2, Vector3 } from "three";
import { V2ADD, V2SCA, V2SUB, V3ADD, V3SCA, V3SUB } from "./StaticOp";

export class QuarticBezierCurve extends CubicBezierCurve {
    constructor(u0: Vector2, u1: Vector2, u2: Vector2) {
        // We convert the quartic control points to cubic control points.
        const v0 = u0;
        const v1 = V2ADD(u0, V2SCA(2 / 3, V2SUB(u1, u0)));
        const v2 = V2ADD(u2, V2SCA(2 / 3, V2SUB(u1, u2)));
        const v3 = u2;
        super(v0, v1, v2, v3);
    }
}

export class QuarticBezierCurve3 extends CubicBezierCurve3 {
    constructor(u0: Vector3, u1: Vector3, u2: Vector3) {
        // We convert the quartic control points to cubic control points.
        const v0 = u0;
        const v1 = V3ADD(u0, V3SCA(2 / 3, V3SUB(u1, u0)));
        const v2 = V3ADD(u2, V3SCA(2 / 3, V3SUB(u1, u2)));
        const v3 = u2;
        super(v0, v1, v2, v3);
    }
}
