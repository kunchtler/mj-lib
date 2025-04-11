import * as THREE from "three";
import { V3SUB, V3ADD, V3SCA } from "./three/StaticOp";

/**
 * Given points for a shoulder and a hand, and the length of the arm and forearm, returns the position of the elbow that satisfies those constraints. The solutions make a circle, so we return the solution closest to the position closest_to.
 * @param S Location of the shoulder S.
 * @param H Location of the hand H.
 * @param SE_dist Length of the arm.
 * @param EH_dist Length of the forearm.
 * @param T Point to which the solution will be closest (the target T).
 */
function findElbow(
    S: THREE.Vector3,
    H: THREE.Vector3,
    SE_dist: number,
    EH_dist: number,
    T: THREE.Vector3
) {
    // The solutions make a circle centered on C, of radius r.
    const SH_dist = V3SUB(H, S).length();
    const SH_unit = V3SUB(H, S).normalize();
    const SC_dist = (SE_dist ** 2 - EH_dist ** 2 + SH_dist ** 2) / (2 * SH_dist);
    const r = Math.sqrt(SE_dist ** 2 - SC_dist ** 2);
    const C = V3ADD(S, V3SCA(SC_dist, SH_unit));
    const Tproj = V3ADD(C, V3SUB(T, C).projectOnPlane(SH_unit));
    const CTproj_unit = V3SUB(Tproj, C).normalize();
    const E = V3ADD(C, V3SCA(r, CTproj_unit));
    return E;
}

export { findElbow };
