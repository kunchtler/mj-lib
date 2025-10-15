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
import { averageVector3 } from "../utils/three/Vector";

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
    // Relative to the hand.
    // handSubPos: THREE.Vector3[];
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
        this.restPos = restPos ?? averageVector3([this.catchPos, this.tossPos]);
        this.jugglerName = jugglerName;
    }

    /**
     * Whether this hand is the right or the left one of the juggler.
     * @returns a boolean
     */
    isRightHand(): boolean {
        return this.performance.getJuggler(this.jugglerName).rightHand === this;
    }
}


