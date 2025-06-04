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
    HandTimeline
} from "./Timeline";
import { JugglerModel } from "./JugglerModel";

//TODO : Change the fact that all methods have get in front of them
//TODO : Change instanceof to string type as it is faster ?
//TODO : Remove the throws and instead have union type of supported types, so that
//it is the compiler that complains when someone tries to add events.
//TODO : Make it so moving juggler moves its points with him (so no precalculated things ?)
//TODO : Forbid Hand Event[] from having catch/thrown and put/take
//TODO : Replace null by undefined ?
//TODO : Replace HandEventInterface by HandEventTimeline in function signatures ?
//TODO : Better handle type checking of multievent ?

export interface HandConstructorParams {
    catchSite?: THREE.Vector3;
    tossSite?: THREE.Vector3;
    restSite?: THREE.Vector3;
    juggler: JugglerModel;
    isRightHand: boolean;
    timeline?: HandTimeline;
}

export class HandModel {
    timeline: HandTimeline;
    catchPos: THREE.Vector3;
    tossPos: THREE.Vector3;
    restPos: THREE.Vector3;
    isRightHand: boolean;
    private _jugglerRef: WeakRef<JugglerModel>;

    constructor({
        catchSite,
        restSite,
        tossSite,
        juggler,
        isRightHand,
        timeline
    }: HandConstructorParams) {
        this.timeline = timeline ?? new HandTimeline();
        this.restPos = restSite ?? new THREE.Vector3(0, 0, 0);
        this.catchPos = catchSite ?? new THREE.Vector3(0, 0, 0);
        this.tossPos = tossSite ?? new THREE.Vector3(0, 0, 0);
        this._jugglerRef = new WeakRef(juggler);
        this.isRightHand = isRightHand;
    }

    get juggler(): JugglerModel {
        const obj = this._jugglerRef.deref();
        if (obj === undefined) {
            throw new Error("Juggler is undefined");
        }
        return obj;
    }

    set juggler(newJuggler: JugglerModel) {
        this._jugglerRef = new WeakRef(newJuggler);
    }

    /**
     * Returns the position where balls are caught or thrown (such a spot is called a site).
     * @param isTossed whether we want the position where balls are thrown (true) or caught (false).
     * @returns the site position.
     */
    // private sitePosition(isTossed: boolean): THREE.Vector3 {
    //     return isTossed ? this.tossSite : this.catchSite;
    // }

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
            return event instanceof TossEvent ? this.tossPos : this.restPos;
        }
    }

    /**
     * Returns the hand's position at a specific multi-event from the timeline.
     * @param multiEv the multi-event.
     * @returns the position where that event occurs.
     */
    positionAtEvent(multiEv: HandTimelineEvent | null): THREE.Vector3 {
        if (multiEv === null || multiEv.events.length === 0) {
            return this.restPos;
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
}

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
    let nbToss = 0;
    let nbTableTake = 0;
    let nbTablePut = 0;
    for (const ev of events.events) {
        if (ev instanceof CatchEvent) {
            nbCatch++;
        } else if (ev instanceof TossEvent) {
            nbToss++;
        } else if (ev instanceof TableTakeEvent) {
            nbTableTake++;
        } else {
            nbTablePut++;
        }
    }
    const sum = nbCatch + nbToss + nbTablePut + nbTableTake;
    return sum === nbCatch + nbToss || sum === 1;
}