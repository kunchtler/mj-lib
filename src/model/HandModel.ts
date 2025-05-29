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
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;
    timeline?: HandTimeline;
}

export class HandModel {
    timeline: HandTimeline;
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;

    constructor({ catchSite, restSite, throwSite, timeline }: HandConstructorParams) {
        this.timeline = timeline ?? new HandTimeline();
        this.restSite = restSite;
        this.catchSite = catchSite;
        this.throwSite = throwSite;
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

    /**
     * Returns the position where balls are caught or thrown (such a spot is called a site).
     * @param isThrown whether we want the position where balls are thrown (true) or caught (false).
     * @returns the site position.
     */
    private sitePosition(isThrown: boolean): THREE.Vector3 {
        return isThrown
            ? this.throwSite.getWorldPosition(new THREE.Vector3())
            : this.catchSite.getWorldPosition(new THREE.Vector3());
    }

    /**
     * Computes the velocity of a single-event. Used internally to later compute the velocity of a multi-event (an event where multiple tosses, catches, and other) happen at the same time.
     * @param singleEv the multi-event
     * @param isPrev whether the event happens at a toss (true) or at a catch (false). Used to apply some scaling factor on the returned velocity.
     * @returns its velocity.
     */
    private velocityAtSingleEvent(
        singleEv: HandTimelineSingleEvent,
        isPrev?: boolean
    ): THREE.Vector3 {
        if (singleEv instanceof TablePutEvent || singleEv instanceof TableTakeEvent) {
            return new THREE.Vector3(0, 0, 0);
        } else {
            const velocity = singleEv.ball.velocityAtCatchTossEvent(singleEv);
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

    /**
     * Computes the velocity at a given multi-event.
     * @param multiEv the multi-event
     * @returns its velocity.
     */
    private velocityAtEvent(multiEv: HandTimelineEvent | null): THREE.Vector3 {
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

    /**
     * Computes the position of a single event. Used internally to later compute the position of a multi-event (an event where multiple tosses, catches, and other) happen at the same time.
     * @param event the single-event.
     * @returns the position where it occurs.
     */
    private positionAtSingleEvent(event: HandTimelineSingleEvent | null): THREE.Vector3 {
        if (event instanceof TablePutEvent || event instanceof TableTakeEvent) {
            return event.table.handPositionOverBall(event.ball);
        } else {
            return this.sitePosition(event instanceof ThrowEvent);
        }
    }

    /**
     * Returns the hand's position at a specific multi-event from the timeline.
     * @param multiEv the multi-event.
     * @returns the position where that event occurs.
     */
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
    /**
     * Returns the hand's trajectory (spline) in between two consecutive events).
     * @param prevEvent the previous event.
     * @param nextEvent the following event.
     * @returns the spline trajectory.
     */
    getSpline(
        prevEvent: HandTimelineEvent | null,
        nextEvent: HandTimelineEvent | null
    ): CubicHermiteSpline<THREE.Vector3> {
        let points: THREE.Vector3[], dpoints: THREE.Vector3[], knots: number[];

        if (prevEvent === null && nextEvent === null) {
            points = [this.positionAtEvent(null)];
            dpoints = [this.velocityAtEvent(null)];
            knots = [0];
            return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
        }
        points = [this.positionAtEvent(prevEvent), this.positionAtEvent(nextEvent)];
        dpoints = [this.velocityAtEvent(prevEvent), this.velocityAtEvent(nextEvent)];
        if (prevEvent === null) {
            knots = [nextEvent!.time - nextEvent!.unitTime, nextEvent!.time];
        } else if (nextEvent === null) {
            knots = [prevEvent.time, prevEvent.time + prevEvent.unitTime];
        } else {
            knots = [prevEvent.time, nextEvent.time];
            //If two much time sperate the previous from the next event, we add some rest.
            if (
                prevEvent.time + 1.2 * prevEvent.unitTime <
                nextEvent.time - 1.2 * nextEvent.unitTime
            ) {
                points.splice(1, 0, this.positionAtEvent(null), this.positionAtEvent(null));
                dpoints.splice(1, 0, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
                knots.splice(
                    1,
                    0,
                    prevEvent.time + 1.2 * prevEvent.unitTime,
                    nextEvent.time - 1.2 * nextEvent.unitTime
                );
            }
        }
        return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
    }

    /**
     * Returns the hand's position at a given time.
     * @param time the time in seconds.
     * @returns the position at that time.
     */
    position(time: number): THREE.Vector3 {
        const [, prevEvent] = this.timeline.prevEvent(time);
        const [, nextEvent] = this.timeline.nextEvent(time);
        const spline = this.getSpline(prevEvent, nextEvent);
        return spline.interpolate(time);
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
}
