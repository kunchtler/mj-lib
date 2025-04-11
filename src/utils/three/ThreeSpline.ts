import * as THREE from "three";
import { Spline } from "../spline/Spline";

class SplineThree<SplineT extends Spline<THREE.Vector3>> extends THREE.Curve<THREE.Vector3> {
    readonly type = "SplineThree";
    spline: SplineT;

    constructor(spline: SplineT) {
        super();
        this.spline = spline;
    }

    getPoint(t: number, optionalTarget?: THREE.Vector3): THREE.Vector3 {
        if (optionalTarget === undefined) {
            optionalTarget = new THREE.Vector3();
        }
        const t_start = this.spline.knots[0];
        const t_end = this.spline.knots[this.spline.knots.length - 1];
        const t_nor = (t - t_start) / (t_end - t_start);
        optionalTarget.copy(this.spline.interpolate(t_nor));
        return optionalTarget;
    }
    //Comme vu dans CubicBezierCurve.js de threejs, faire méthode copy, toJSON et fromJSON ?
}
