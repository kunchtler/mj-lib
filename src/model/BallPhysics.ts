import * as THREE from "three";
import { GRAVITY } from "../utils/constants";

/**
 * Given a ball tossed at time t0 from p0 and caught at time t1 from p1,
 * computes the position of the ball at time t.
 * @param pos0 the position the ball is tossed from.
 * @param t0 the time the ball is tossed.
 * @param pos1 the position where the ball is caught.
 * @param t1 the time the ball is caught.
 * @param t a time.
 * @param gravity the gravitation acceleration. Defaults to Earth's constant g = 9.81 m.s^-2.
 * @returns the position of the ball at time t. If t is smaller than t0 or greater than t1, the position returned is in the continuation of the parabola of the trajectory.
 */
export function ballPosition(
    pos0: THREE.Vector3,
    t0: number,
    pos1: THREE.Vector3,
    t1: number,
    t: number,
    gravity = GRAVITY
): THREE.Vector3 {
    const v0 = ballVelocityAtStartEnd(pos0, t0, pos1, t1, true);
    return new THREE.Vector3(
        v0.x * (t - t0) + pos0.x,
        (-gravity / 2) * (t - t0) ** 2 + v0.y * (t - t0) + pos0.y,
        v0.z * (t - t0) + pos0.z
    );
}

/**
 * Given a ball tossed at time t0 from p0 and caught at time t1 from p1,
 * computes the velocity of the ball at t0 or at t1.
 * @param pos0 the position the ball is tossed from.
 * @param t0 the time the ball is tossed.
 * @param pos1 the position where the ball is caught.
 * @param t1 the time the ball is caught.
 * @param atStart whether we want the velocity at t0 or at t1.
 * @param gravity the gravitation acceleration. Defaults to Earth's constant g = 9.81 m.s^-2.
 * @returns the velocity of the ball.
 */
export function ballVelocityAtStartEnd(
    pos0: THREE.Vector3,
    t0: number,
    pos1: THREE.Vector3,
    t1: number,
    atStart: boolean,
    gravity = GRAVITY
): THREE.Vector3 {
    const dt = t1 - t0;
    const v0x = (pos1.x - pos0.x) / dt;
    const v0z = (pos1.z - pos0.z) / dt;
    const v0y = (dt * gravity) / 2 + (pos1.y - pos0.y) / dt;
    const tossSign = atStart ? 1 : -1;
    return new THREE.Vector3(v0x, tossSign * v0y, v0z);
}

/**
 * Given a ball tossed at time t0 from p0 and caught at time t1 from p1,
 * computes the velocity of the ball at time t.
 * @param pos0 the position the ball is tossed from.
 * @param t0 the time the ball is tossed.
 * @param pos1 the position where the ball is caught.
 * @param t1 the time the ball is caught.
 * @param t a time.
 * @param gravity the gravitation acceleration. Defaults to Earth's constant g = 9.81 m.s^-2.
 * @returns the velocity of the ball at time t. If t is smaller than t0 or greater than t1, the velocity returned is in the continuation of the parabola of the trajectory.
 */
export function ballVelocity(
    pos0: THREE.Vector3,
    t0: number,
    pos1: THREE.Vector3,
    t1: number,
    t: number,
    gravity = GRAVITY
): THREE.Vector3 {
    const v0 = ballVelocityAtStartEnd(pos0, t0, pos1, t1, true, gravity);
    return new THREE.Vector3(v0.x, -gravity * t + v0.y, v0.z);
}
