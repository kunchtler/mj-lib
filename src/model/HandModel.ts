import * as THREE from "three";
import { VECTOR3_STRUCTURE } from "../utils/constants";
import { CubicHermiteSpline } from "../utils/spline/Spline";
import {
    CatchEvent,
    TablePutEvent,
    TableTakeEvent,
    TossEvent,
    HandTimelineEvent,
    HandTimelineSingleEvent,
    isMultiEvent
} from "./timelines/TimelineEvents";
import { HandTimeline, isMultiEventSane } from "./timelines/HandTimeline";
import { PerformanceChild, PerformanceChildParams } from "./PerformanceChild";

//TODO : Change the fact that all methods have get in front of them
//TODO : Change instanceof to string type as it is faster ?
//TODO : Remove the throws and instead have union type of supported types, so that
//it is the compiler that complains when someone tries to add events.
//TODO : Make it so moving juggler moves its points with him (so no precalculated things ?)
//TODO : Forbid Hand Event[] from having catch/thrown and put/take
//TODO : Replace null by undefined ?
//TODO : Replace HandEventInterface by HandEventTimeline in function signatures ?
//TODO : Better handle type checking of multievent ?

export const HAND_MAX_TIME_GAP_BEFORE_REST = 0.5;

/**
 * Interface for the constructor of HandModel.
 */
export type HandModelParams = PerformanceChildParams & {
    /**
     * The place where the hand catches balls.
     */
    catchPos: THREE.Vector3;
    /**
     * The place where the hand tosses balls.
     */
    tossPos: THREE.Vector3;
    /**
     * The place where the hand rests when it has nothing to do
     * for its foreseable future.
     */
    restPos?: THREE.Vector3;
    /**
     * The juggler the hand belongs to.
     */
    jugglerName: string;
    /**
     * The timeline of events (throws, catches, ...) of the hand.
     */
    timeline?: HandTimeline;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a hand.
 */
export class HandModel extends PerformanceChild {
    /**
     * The place where the hand catches balls.
     */
    catchPos: THREE.Vector3;
    /**
     * The place where the hand tosses balls.
     */
    tossPos: THREE.Vector3;
    /**
     * The place where the hand rests when it has nothing to do
     * for its foreseable future.
     */
    restPos: THREE.Vector3;
    /**
     * The timeline of events (throws, catches, ...) of the hand.
     */
    timeline: HandTimeline;
    jugglerName: string;

    constructor({
        catchPos,
        restPos,
        tossPos,
        jugglerName,
        timeline,
        performance
    }: HandModelParams) {
        super({ performance });
        this.timeline = timeline ?? new HandTimeline();
        this.catchPos = catchPos;
        this.tossPos = tossPos;
        this.restPos = restPos ?? averageVector([this.catchPos, this.tossPos]);
        this.jugglerName = jugglerName;
    }

    /**
     * Whether this hand is the right or the left one of the juggler.
     * @returns a boolean
     */
    isRightHand(): boolean {
        return this.performance.getJuggler(this.jugglerName).rightHand === this;
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
            const velocity = this.performance
                .getBall(singleEv.ballID)
                .velocityAtCatchTossEvent(singleEv);
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
    private _positionAtSingleEvent(event: HandTimelineSingleEvent | null): THREE.Vector3 {
        if (event instanceof TablePutEvent || event instanceof TableTakeEvent) {
            // Compute a position higher than the spot where the hand could be.
            const spotPosition = this.performance.getTable(event.tableID).spotPosition(event.spot);
            const ballRadius = this.performance.getBall(event.ballID).radius;
            spotPosition.y += ballRadius * 3;
            return spotPosition;
        } else {
            return event instanceof TossEvent ? this.tossPos : this.restPos;
        }
    }

    /**
     * Returns the hand's position at a specific multi-event from the timeline.
     * @param multiEv the multi-event.
     * @returns the position where that event occurs.
     */
    positionAtEvent(ev: HandTimelineEvent | HandTimelineSingleEvent | null): THREE.Vector3 {
        if (ev === null) {
            return this.restPos;
        }
        if (!isMultiEvent(ev)) {
            // Find the multi-event ev is part of, and make it the new ev.
            const multiEv = this.timeline.getElementByKey(ev.time);
            if (multiEv === undefined) {
                console.warn("Multi-event of hand timeline not found.");
                return this.restPos;
            }
            ev = multiEv;
        }
        if (ev.events.length === 0) {
            return this.restPos;
        }
        if (!isMultiEventSane(ev)) {
            console.warn("Encountered illegal association in hand timeline of hand single events.");
            return this._positionAtSingleEvent(ev.events[ev.events.length - 1]);
        }
        const positions: THREE.Vector3[] = [];
        for (const singleEv of ev.events) {
            positions.push(this._positionAtSingleEvent(singleEv));
        }
        return averageVector(positions);
    }

    // TODO : Add a little bit of impact based on speed after throw / catch. Ou quand la ball sonne et qu'on la claque dans la main. Rather clamp position ?
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
            knots = [nextEvent!.time - HAND_MAX_TIME_GAP_BEFORE_REST / 2, nextEvent!.time];
        } else if (nextEvent === null) {
            knots = [prevEvent.time, prevEvent.time + HAND_MAX_TIME_GAP_BEFORE_REST / 2];
        } else {
            knots = [prevEvent.time, nextEvent.time];
            //If two much time sperate the previous from the next event, we add some rest so that it doesn't look weird.
            if (nextEvent.time - prevEvent.time > HAND_MAX_TIME_GAP_BEFORE_REST) {
                points.splice(1, 0, this.positionAtEvent(null), this.positionAtEvent(null));
                dpoints.splice(1, 0, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
                knots.splice(
                    1,
                    0,
                    prevEvent.time + HAND_MAX_TIME_GAP_BEFORE_REST / 2,
                    nextEvent.time - HAND_MAX_TIME_GAP_BEFORE_REST / 2
                );
            }
        }
        return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
    }
    // getSpline(
    //     prevEvent: HandTimelineEvent | null,
    //     nextEvent: HandTimelineEvent | null
    // ): CubicHermiteSpline<THREE.Vector3> {
    //     let points: THREE.Vector3[], dpoints: THREE.Vector3[], knots: number[];

    //     if (prevEvent === null && nextEvent === null) {
    //         points = [this.positionAtEvent(null)];
    //         dpoints = [this.velocityAtEvent(null)];
    //         knots = [0];
    //         return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
    //     }
    //     points = [this.positionAtEvent(prevEvent), this.positionAtEvent(nextEvent)];
    //     dpoints = [this.velocityAtEvent(prevEvent), this.velocityAtEvent(nextEvent)];
    //     if (prevEvent === null) {
    //         knots = [nextEvent!.time - nextEvent!.unitTime, nextEvent!.time];
    //     } else if (nextEvent === null) {
    //         knots = [prevEvent.time, prevEvent.time + prevEvent.unitTime];
    //     } else {
    //         knots = [prevEvent.time, nextEvent.time];
    //         //If two much time sperate the previous from the next event, we add some rest.
    //         if (
    //             prevEvent.time + 1.2 * prevEvent.unitTime <
    //             nextEvent.time - 1.2 * nextEvent.unitTime
    //         ) {
    //             points.splice(1, 0, this.positionAtEvent(null), this.positionAtEvent(null));
    //             dpoints.splice(1, 0, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
    //             knots.splice(
    //                 1,
    //                 0,
    //                 prevEvent.time + 1.2 * prevEvent.unitTime,
    //                 nextEvent.time - 1.2 * nextEvent.unitTime
    //             );
    //         }
    //     }
    //     return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
    // }

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
}

/**
 * Computes the component-wise average of 3D Vectors.
 * @param vectors an array of ThreeJS 3D vectors.
 * @returns the average vector.
 */
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
