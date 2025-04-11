import * as THREE from "three";
import { VECTOR3_STRUCTURE } from "../utils/constants";
import { CubicHermiteSpline } from "../utils/spline/Spline";
import {
    CatchEvent,
    TablePutEvent,
    TableTakeEvent,
    ThrowEvent,
    HandTimelineEvent,
    HandTimelineSingleEvent,
    HandTimeline
} from "./Timeline";
import { Object3DHelper } from "../utils/three/Object3DHelper";

//TODO : Change the fact that all methods have get in front of them
//TODO : Change instanceof to string type as it is faster ?
//TODO : Remove the throws and instead have union type of supported types, so that
//it is the compiler that complains when someone tries to add events.
//TODO : Make it so moving juggler moves its points with him (so no precalculated things ?)
//TODO : Forbid Hand Event[] from having catch/thrown and put/take
//TODO : Replace null by undefined ?
//TODO : Replace HandEventInterface by HandEventTimeline in function signatures ?
//TODO : Better handle type checking of multievent ?

const { multiplyByScalar: V3SCA } = VECTOR3_STRUCTURE;

// This variable serves to make hand movements more circular.
// const power = 1;

function averageVector(vectors: THREE.Vector3[]): THREE.Vector3 {
    const sum = new THREE.Vector3(0, 0, 0);
    if (vectors.length === 0) {
        return sum;
    }
    for (const vec of vectors) {
        sum.add(vec);
    }
    sum.divideScalar(vectors.length);
    return sum;
}

//TODO : Before launching simulation, console.log all events not sane to help debug.
//TODO : Reversed catches in parser (to better allow rhtyhmic creation ?)
function isMultiEventSane(events: HandTimelineEvent): boolean {
    let nbCatch = 0;
    let nbThrow = 0;
    let nbTableTake = 0;
    let nbTablePut = 0;
    for (const ev of events.events) {
        if (ev instanceof CatchEvent) {
            nbCatch++;
        } else if (ev instanceof ThrowEvent) {
            nbThrow++;
        } else if (ev instanceof TableTakeEvent) {
            nbTableTake++;
        } else {
            nbTablePut++;
        }
    }
    const sum = nbCatch + nbThrow + nbTablePut + nbTableTake;
    return sum === nbCatch + nbThrow || sum === 1;
}

export type HandSiteCreationParams = {
    restSiteDist: number;
    centerRestDist: number;
    rightVector: THREE.Vector3;
    jugglerJugglingPlaneOrigin: THREE.Object3D;
    isRightHand: boolean;
};

// TODO : ThrowSite -> TossSite
//TODO : Add to all classes having to add child/parent meshes that if mesh has no parent, ot
//instanciates it.

export function createHandSites({
    centerRestDist,
    jugglerJugglingPlaneOrigin,
    restSiteDist,
    isRightHand,
    rightVector
}: HandSiteCreationParams): {
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;
} {
    const handSign = isRightHand ? 1 : -1;
    const centerHandUnitVector = V3SCA(handSign / rightVector.length(), rightVector);

    const restSite = new THREE.Object3D();
    jugglerJugglingPlaneOrigin.add(restSite);
    restSite.position.copy(V3SCA(centerRestDist, centerHandUnitVector));
    const throwSite = new THREE.Object3D();
    jugglerJugglingPlaneOrigin.add(throwSite);
    throwSite.position.copy(V3SCA(centerRestDist - restSiteDist, centerHandUnitVector));
    const catchSite = new THREE.Object3D();
    jugglerJugglingPlaneOrigin.add(catchSite);
    catchSite.position.copy(V3SCA(centerRestDist + restSiteDist, centerHandUnitVector));

    return { catchSite: catchSite, throwSite: throwSite, restSite: restSite };
}

export interface HandConstructorParams {
    mesh?: THREE.Mesh;
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;
    timeline?: HandTimeline;
    debug?: boolean;
}

export class Hand {
    mesh: THREE.Mesh;
    timeline: HandTimeline;
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;

    constructor({ mesh, catchSite, restSite, throwSite, timeline, debug }: HandConstructorParams) {
        this.mesh = mesh ?? new THREE.Mesh(createHandGeometry(0.05), createHandMaterial());
        this.timeline = timeline ?? new HandTimeline();
        this.restSite = restSite;
        this.catchSite = catchSite;
        this.throwSite = throwSite;
        if (debug ?? false) {
            this.restSite.add(new Object3DHelper());
            this.catchSite.add(new Object3DHelper());
            this.throwSite.add(new Object3DHelper());
        }
        // this.jugglingPlaneOrigin = jugglingPlaneOrigin;
        //TODO : jugglingPlaneOrigin parent in 3D scene of catch throw and rest site ?
        //Should we do that here or in juggler ?

        // const {
        //     centerRestDist,
        //     jugglerJugglingPlaneOrigin: originObject,
        //     restSiteDist,
        //     rightVector
        // } = handPhysicsHandling;
        // const handSign = isRightHand ? 1 : -1;
        // const centerHandUnitVector = V3SCA(handSign, rightVector);

        // this.restSite = new THREE.Object3D();
        // this.restSite.position.copy(V3SCA(centerRestDist, centerHandUnitVector));
        // this.throwSite = new THREE.Object3D();
        // this.throwSite.position.copy(V3SCA(centerRestDist - restSiteDist, centerHandUnitVector));
        // this.catchSite = new THREE.Object3D();
        // this.catchSite.position.copy(V3SCA(centerRestDist + restSiteDist, centerHandUnitVector));
    }

    sitePosition(is_thrown: boolean): THREE.Vector3 {
        return is_thrown
            ? this.throwSite.getWorldPosition(new THREE.Vector3())
            : this.catchSite.getWorldPosition(new THREE.Vector3());
    }

    velocityAtSingleEvent(singleEv: HandTimelineSingleEvent, isPrev?: boolean): THREE.Vector3 {
        if (singleEv instanceof TablePutEvent || singleEv instanceof TableTakeEvent) {
            return new THREE.Vector3(0, 0, 0);
        } else {
            const velocity = singleEv.ball.velocityAtCatchThrowEvent(singleEv);
            let sca = 1;
            if (isPrev) {
                sca = 1 / 3;
            } else if (singleEv instanceof CatchEvent) {
                sca = 1 / 3;
            }
            velocity.multiplyScalar(sca);
            return velocity;
        }
    }

    velocityAtEvent(multiEv: HandTimelineEvent | null): THREE.Vector3 {
        if (multiEv === null || multiEv.events.length === 0) {
            return new THREE.Vector3(0, 0, 0);
        }
        if (!isMultiEventSane(multiEv)) {
            return this.velocityAtSingleEvent(multiEv.events[multiEv.events.length - 1]);
        }
        const velocities: THREE.Vector3[] = [];
        for (const singleEv of multiEv.events) {
            velocities.push(this.velocityAtSingleEvent(singleEv));
        }
        return averageVector(velocities);
    }

    positionAtSingleEvent(event: HandTimelineSingleEvent | null): THREE.Vector3 {
        if (event instanceof TablePutEvent || event instanceof TableTakeEvent) {
            return event.table.handPositionOverBall(event.ball);
        } else {
            return this.sitePosition(event instanceof ThrowEvent);
        }
    }

    positionAtEvent(multiEv: HandTimelineEvent | null): THREE.Vector3 {
        if (multiEv === null || multiEv.events.length === 0) {
            return this.restSite.getWorldPosition(new THREE.Vector3());
        }
        if (!isMultiEventSane(multiEv)) {
            return this.positionAtSingleEvent(multiEv.events[multiEv.events.length - 1]);
        }
        const positions: THREE.Vector3[] = [];
        for (const singleEv of multiEv.events) {
            positions.push(this.positionAtSingleEvent(singleEv));
        }
        return averageVector(positions);
    }

    //TODO : Move unit_time info to simulator level.
    //TODO : Better handle local/global corrdinates functions ?
    //eg : make local functions private and global public.
    //or make spline global. Better ?
    //TODO : Make HandEventInterface[] have its own time ?
    // TODO : Add a little bit of impact based on speed after throw / catch. Ou quand la ball sonne et qu'on la claque dans la main.
    //Rather clamp position ?
    getSpline(
        prev_event: HandTimelineEvent | null,
        next_event: HandTimelineEvent | null
    ): CubicHermiteSpline<THREE.Vector3> {
        let points: THREE.Vector3[], dpoints: THREE.Vector3[], knots: number[];

        if (prev_event === null && next_event === null) {
            points = [this.positionAtEvent(null)];
            dpoints = [this.velocityAtEvent(null)];
            knots = [0];
            return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
        }
        points = [this.positionAtEvent(prev_event), this.positionAtEvent(next_event)];
        dpoints = [this.velocityAtEvent(prev_event), this.velocityAtEvent(next_event)];
        if (prev_event === null) {
            knots = [next_event!.time - next_event!.unitTime, next_event!.time];
        } else if (next_event === null) {
            knots = [prev_event.time, prev_event.time + prev_event.unitTime];
        } else {
            knots = [prev_event.time, next_event.time];
            //If two much time sperate the previous from the next event, we add some rest.
            if (
                prev_event.time + 1.2 * prev_event.unitTime <
                next_event.time - 1.2 * next_event.unitTime
            ) {
                points.splice(1, 0, this.positionAtEvent(null), this.positionAtEvent(null));
                dpoints.splice(1, 0, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
                knots.splice(
                    1,
                    0,
                    prev_event.time + 1.2 * prev_event.unitTime,
                    next_event.time - 1.2 * next_event.unitTime
                );
            }
        }
        return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
    }

    // hand_position_correction(pos: THREE.Vector3): THREE.Vector3 {
    //     const dist = pos.distanceTo(this.rest_pos);
    //     if (dist <= 1e-8) {
    //         return pos.clone();
    //     }
    //     return pos
    //         .clone()
    //         .sub(this.rest_pos)
    //         .multiplyScalar((this.rest_site_dist / dist) ** (1 - power))
    //         .add(this.rest_pos);
    // }

    // hand_velocity_jacobian(pos: THREE.Vector3): THREE.Matrix3 {
    //     const dist = pos.distanceTo(this.rest_pos);
    //     // TODO? : if (dist == 0) {
    //     //     return
    //     // }
    //     const correction_jacobian = new THREE.Matrix3(
    //         dist ** 2 / power + pos.x * (pos.x - this.rest_pos.x),
    //         pos.x * (pos.y - this.rest_pos.y),
    //         pos.x * (pos.z - this.rest_pos.z),
    //         pos.y * (pos.x - this.rest_pos.x),
    //         dist ** 2 / power + pos.y * (pos.y - this.rest_pos.y),
    //         pos.y * (pos.z - this.rest_pos.z),
    //         pos.z * (pos.x - this.rest_pos.x),
    //         pos.z * (pos.y - this.rest_pos.y),
    //         dist ** 2 / power + pos.z * (pos.z - this.rest_pos.z)
    //     );
    //     correction_jacobian.multiplyScalar(
    //         dist ** (power - 2) * this.rest_site_dist ** -power * power
    //     );
    //     return correction_jacobian;
    // }

    // local_position(time: number): THREE.Vector3 {
    //     const prev_event = this.timeline.le(time).value;
    //     const next_event = this.timeline.gt(time).value;
    //     const spline = this.get_spline(prev_event, next_event);
    //     const pos = spline.interpolate(time);
    //     return pos;
    // return this.hand_position_correction(pos);

    // const prev_event = this.timeline.le(time).value;
    // const next_event = this.timeline.gt(time).value;
    // const spline = this.get_spline(prev_event, next_event);
    // return spline.interpolate(time);
    // }

    position(time: number): THREE.Vector3 {
        const [, prev_event] = this.timeline.prevEvent(time);
        const [, next_event] = this.timeline.nextEvent(time);
        const spline = this.getSpline(prev_event, next_event);
        return spline.interpolate(time);
    }

    // local_velocity(time: number): THREE.Vector3 {
    //     const [, prev_event] = this.timeline.prev_event(time);
    //     const [, next_event] = this.timeline.next_event(time);
    //     const spline = this.get_spline(prev_event, next_event);
    //     const vel = spline.velocity(time);
    //     return vel;
    // const pos = spline.interpolate(time);
    // return vel.applyMatrix3(this.hand_velocity_jacobian(pos));

    // const prev_event = this.timeline.le(time).value;
    // const next_event = this.timeline.gt(time).value;
    // const spline = this.get_spline(prev_event, next_event);
    // return spline.velocity(time);
    // }

    // global_velocity(time: number): THREE.Vector3 {
    //     const vec = this.local_velocity(time);
    //     return this.mesh.localToWorld(vec).sub(this.mesh.localToWorld(new THREE.Vector3(0, 0, 0)));
    // }

    render(time: number): void {
        const worldPosition = this.position(time);
        const localPosition =
            this.mesh.parent === null
                ? worldPosition
                : this.mesh.parent.worldToLocal(worldPosition);
        this.mesh.position.copy(localPosition);
        // this.mesh.position.copy(worldToLocalPosition(this.position(time)));
    }

    /**
     * Properly deletes the resources. Call when instance is not needed anymore to free ressources.
     */
    //TODO
    dispose(): void {
        if (this.mesh.parent !== null) {
            this.mesh.parent.remove(this.mesh);
        }
        // this.geometry.dispose();
        // this.material.dispose();
        this.timeline.clear();
    }
}

export function createHandGeometry(radius: number) {
    return new THREE.SphereGeometry(radius, 8, 4); //Def radius : 0.05
}

export function createHandMaterial(color: THREE.ColorRepresentation = 0xffdbac) {
    return new THREE.MeshPhongMaterial({ color: color });
}

// import * as THREE from "three";
// import { VECTOR3_STRUCTURE } from "./constants";
// import { createRBTree, RBTree } from "./RBTree";
// import { CubicHermiteSpline } from "./Spline";
// import { JugglingEvent } from "./Timeline";

// //TODO : Change the fact that all methods have get in front of them

// const { add: V3ADD, multiply_by_scalar: V3SCA } = VECTOR3_STRUCTURE;

// export type HandPhysicsHandling = {
//     min_dist: number;
//     max_dist: number;
//     up_vector: THREE.Vector3;
//     right_vector: THREE.Vector3;
//     origin_object: THREE.Object3D;
// };

// class Hand {
//     //juggler: Juggler;
//     geometry: THREE.BufferGeometry;
//     material: THREE.Material;
//     mesh: THREE.Mesh;
//     timeline: RBTree<number, JugglingEvent>;
//     readonly min_dist: number;
//     readonly max_dist: number;
//     readonly is_right_hand: boolean;
//     readonly up_vector: THREE.Vector3;
//     readonly right_vector: THREE.Vector3;
//     readonly origin_object: THREE.Object3D;

//     // Constructs hand ONLY FROM THE JUGGLING PANE ORIGIN
//     constructor(
//         hand_physics_handling: HandPhysicsHandling,
//         is_right_hand: boolean,
//         timeline?: RBTree<number, JugglingEvent>
//     ) {
//         this.geometry = new THREE.SphereGeometry(0.05, 8, 4);
//         this.material = new THREE.MeshPhongMaterial({ color: "black" });
//         this.mesh = new THREE.Mesh(this.geometry, this.material);
//         // this.mesh.visible = false;
//         if (timeline === undefined) {
//             this.timeline = createRBTree();
//         } else {
//             this.timeline = structuredClone(timeline);
//         }
//         this.min_dist = hand_physics_handling.min_dist;
//         this.max_dist = hand_physics_handling.max_dist;
//         this.is_right_hand = is_right_hand;
//         this.up_vector = hand_physics_handling.up_vector;
//         this.right_vector = hand_physics_handling.right_vector;
//         this.origin_object = hand_physics_handling.origin_object;
//     }

//     get_rest_position(unit_time: number): THREE.Vector3 {
//         const t0 = 0.4;
//         const alpha = 9 / 10;
//         const distance =
//             this.min_dist + alpha ** (t0 / unit_time) * (this.max_dist - this.min_dist);
//         const hand_sign = this.is_right_hand ? 1 : -1;
//         return V3SCA(hand_sign * distance, this.right_vector);
//     }

//     get_default_rest_position(): THREE.Vector3 {
//         const hand_sign = this.is_right_hand ? 1 : -1;
//         return V3SCA(hand_sign * this.max_dist, this.right_vector);
//     }

//     //TODO : Mettre des object3D qui s'updatent pour les rest/throw/catch sites ?
//     //Histoire de pouvoir les visualiser.
//     get_rest_site_offset(
//         unit_time: number,
//         is_thrown: boolean,
//         rest_position?: THREE.Vector3
//     ): THREE.Vector3 {
//         if (rest_position === undefined) {
//             rest_position = this.get_rest_position(unit_time);
//         }
//         const throw_sign = is_thrown ? -1 : 1;
//         return V3SCA(throw_sign * (1 / 3), rest_position);
//     }

//     get_site_position(unit_time: number, is_thrown: boolean): THREE.Vector3 {
//         const rest_position = this.get_rest_position(unit_time);
//         const rest_site_offset = this.get_rest_site_offset(unit_time, is_thrown, rest_position);
//         return V3ADD(rest_position, rest_site_offset);
//     }

//     get_midpoint_up(unit_time: number) {
//         const rest_position = this.get_rest_position(unit_time);
//         return V3ADD(rest_position, V3SCA((1 / 3) * rest_position.length(), this.up_vector));
//     }

//     world_to_local_velocity(vec: THREE.Vector3) {
//         return this.mesh.worldToLocal(vec).sub(this.mesh.worldToLocal(new THREE.Vector3(0, 0, 0)));
//     }

//     get_spline(
//         prev_event: JugglingEvent | undefined,
//         next_event: JugglingEvent | undefined
//     ): CubicHermiteSpline<THREE.Vector3> {
//         let points: THREE.Vector3[], dpoints: THREE.Vector3[], knots: number[];
//         if (prev_event === undefined && next_event === undefined) {
//             points = [this.get_default_rest_position()];
//             dpoints = [new THREE.Vector3(0, 0, 0)];
//             knots = [0];
//         } else if (prev_event === undefined) {
//             points = [
//                 this.get_rest_position(next_event!.unit_time),
//                 this.get_site_position(next_event!.unit_time, next_event!.is_thrown)
//             ];
//             dpoints = [
//                 new THREE.Vector3(0, 0, 0),
//                 this.world_to_local_velocity(next_event!.get_ball_velocity())
//             ];
//             knots = [next_event!.time - next_event!.unit_time, next_event!.time];
//         } else if (next_event === undefined) {
//             points = [
//                 this.get_site_position(prev_event.unit_time, prev_event.is_thrown),
//                 this.get_rest_position(prev_event.unit_time)
//             ];
//             dpoints = [
//                 this.world_to_local_velocity(prev_event.get_ball_velocity()),
//                 new THREE.Vector3(0, 0, 0)
//             ];
//             knots = [prev_event.time, prev_event.time + prev_event.unit_time];
//         } else if (prev_event.hand_status === "THROW") {
//             points = [
//                 this.get_site_position(prev_event.unit_time, prev_event.is_thrown),
//                 this.get_site_position(next_event.unit_time, next_event.is_thrown)
//             ];
//             dpoints = [
//                 V3SCA(1, this.world_to_local_velocity(prev_event.get_ball_velocity())),
//                 V3SCA(1 / 3, this.world_to_local_velocity(next_event.get_ball_velocity()))
//             ];
//             knots = [prev_event.time, next_event.time];
//         } else {
//             points = [
//                 this.get_site_position(prev_event.unit_time, prev_event.is_thrown),
//                 this.get_site_position(next_event.unit_time, next_event.is_thrown)
//             ];
//             dpoints = [
//                 V3SCA(1 / 3, this.world_to_local_velocity(prev_event.get_ball_velocity())),
//                 V3SCA(1, this.world_to_local_velocity(next_event.get_ball_velocity()))
//             ];
//             knots = [prev_event.time, next_event.time];
//         }
//         // TODO : Add a little bit of impact based on speed after throw / catch. Ou quand la ball sonne et qu'on la claque dans la main.
//         return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
//     }

//     get_local_position(time: number): THREE.Vector3 {
//         const prev_event = this.timeline.le(time).value;
//         const next_event = this.timeline.gt(time).value;
//         const spline = this.get_spline(prev_event, next_event);
//         return spline.interpolate(time);
//     }

//     //TODO : Pas ouf que _origin_object soit utilisé ici. Changer la classe ?
//     //Faire uniquement avec mesh en faisant offset ?
//     //Note : suppose que le jongleur ne bouge pas.
//     get_global_position(time: number): THREE.Vector3 {
//         return this.origin_object.localToWorld(this.get_local_position(time));
//     }

//     get_local_velocity(time: number): THREE.Vector3 {
//         const prev_event = this.timeline.le(time).value;
//         const next_event = this.timeline.gt(time).value;
//         const spline = this.get_spline(prev_event, next_event);
//         return spline.velocity(time);
//     }

//     get_global_velocity(time: number): THREE.Vector3 {
//         const vec = this.get_local_velocity(time);
//         return this.mesh.localToWorld(vec).sub(this.mesh.localToWorld(new THREE.Vector3(0, 0, 0)));
//     }

//     render = (time: number): void => {
//         this.mesh.position.copy(this.get_local_position(time));
//     };

//     /**
//      * Properly deletes the resources. Call when instance is not needed anymore to free ressources.
//      */
//     dispose() {
//         if (this.mesh.parent !== null) {
//             this.mesh.parent.remove(this.mesh);
//         }
//         this.geometry.dispose();
//         this.material.dispose();
//         this.timeline = createRBTree();
//     }
// }

// export { Hand };
