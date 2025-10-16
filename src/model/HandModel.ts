import { VECTOR3_STRUCTURE } from "../utils/constants";
import { CubicHermiteSpline } from "../utils/spline/Spline";
import { HandEvent, HandTimeline } from "./timelines/HandTimeline";
import { PerformanceChild, PerformanceModelRef, PerformanceRefParams } from "./PerformanceChild";
import { averageVector3 } from "../utils/three/Vector";
import { Object3D, Vector3 } from "three";
import { SpotModel } from "./SpotModel";
import { ThreeSyncedScale } from "./ThreeSyncedProperty";
import { VERY_VERY_FAR_VEC } from "./PerformanceModel";
import { MapCallbacks } from "./MapCallbacks";
import { Vector } from "js-sdsl";
import { getLastInsertedKey } from "../utils/Operations";
import { localToWorldVector } from "../utils";

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
export type HandModelParams = {
    /**
     * The place where the hand catches balls.
     */
    catchPos: Vector3;
    /**
     * The place where the hand tosses balls.
     */
    tossPos: Vector3;
    /**
     * The place where the hand rests when it has nothing to do
     * for its foreseable future.
     */
    restPos?: Vector3;
    /**
     * The place where the hand is when the other hand takes a ball from it.
     */
    swapPos?: Vector3;
    holdSpotsPos?: Map<number, Vector3>;
    defaultHoldSpotNumber?: number;
    /**
     * The timeline of events (throws, catches, ...) of the hand.
     */
    timeline?: HandTimeline;
    scale?: Vector3;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a hand.
 */
export class HandModel {
    /**
     * The place where the hand catches balls.
     */
    catchSpot: SpotModel;
    /**
     * The place where the hand tosses balls.
     */
    tossSpot: SpotModel;
    /**
     * The place where the hand rests when it has nothing to do
     * for its foreseable future.
     */
    restSpot: SpotModel;
    /**
     * The place where the hand is when the other hand takes a ball from it.
     */
    swapSpot: SpotModel;
    /**
     * An array of all spots the ball can be held in hand.
     */
    holdSpots: MapCallbacks<number, SpotModel>;
    /**
     * When a hold spot is required with a number out of range, default hold spot
     * we default to instead.
     */
    defaultHoldSpotNumber: number;
    /**
     * The timeline of events (throws, catches, ...) of the hand.
     */
    timeline: HandTimeline;

    performance: PerformanceModelRef;

    scale: ThreeSyncedScale;

    readonly _object = new Object3D();

    constructor({
        catchPos,
        restPos,
        tossPos,
        swapPos,
        holdSpotsPos,
        defaultHoldSpotNumber,
        timeline,
        scale
    }: HandModelParams) {
        this.timeline = timeline ?? new HandTimeline();
        this.catchSpot = new SpotModel({ position: catchPos });
        this.tossSpot = new SpotModel({ position: tossPos });
        restPos ??= averageVector3([
            this.catchSpot.position.getLocal(),
            this.tossSpot.position.getLocal()
        ]);
        this.restSpot = new SpotModel({
            position: restPos
        });
        this.swapSpot = new SpotModel({
            position:
                swapPos ??
                this.tossSpot.position
                    .getLocal()
                    .add(this.tossSpot.position.getLocal().sub(this.catchSpot.position.getLocal()))
        });

        const holdSpotsEntries: [number, SpotModel][] = [];
        if (holdSpotsPos === undefined || holdSpotsPos.length === 0) {
            // We create a single spot in hand, right at the hand's position.
            holdSpotsEntries.push([0, new SpotModel({ position: new Vector3(0, 0, 0) })]);
            // We ignore the eventual value given to defaultHoldSpot.
            this.defaultHoldSpotNumber = 0;
        } else {
            for (const [spotNumber, spotPos] of holdSpotsPos) {
                holdSpotsEntries.push([spotNumber, new SpotModel({ position: spotPos })]);
            }
            // If no default spot number is given, take the last one.
            this.defaultHoldSpotNumber = getLastInsertedKey(holdSpotsPos)!;
        }
        this.holdSpots = new MapCallbacks({
            onSetElement: (key, value) => {
                this._object.add(value._object);
            },
            onDeleteElement: (key, value) => {
                if (value !== undefined) {
                    this._object.remove(value._object);
                }
            },
            entries: holdSpotsEntries
        });

        this.scale = new ThreeSyncedScale(this._object, scale);
        this.performance = new PerformanceModelRef();
    }

    /**
     * Whether this hand is the right or the left one of the juggler.
     * @returns a boolean
     */
    // TODO : Re-add juggler Name ? Juggler ref directly ?
    // isRightHand(): boolean | undefined {
    //     return this.performance.get()?.getJuggler(this.)
    // }

    getSpotLocalPosition(spotNumber: number) {
        const spot =
            this.holdSpots.get(spotNumber) ??
            this.holdSpots.get(this.defaultHoldSpotNumber) ??
            this.restSpot;
        return spot.position.getLocal();
    }

    //TODO : Handle hand rotation
    positionBySpotPos(spotNumber: number, spotPos: Vector3): Vector3 {
        const handToSpotLocal = this.getSpotLocalPosition(spotNumber);
        const handToSpotGlobal = localToWorldVector(handToSpotLocal, this._object);
        return spotPos.sub(handToSpotGlobal);
    }

    // TODO : FIRST ROT APPROACH : oriented in direction of elbow (but not down / up)

    //TODO / Document that we don't check if the time is the correct one for the event in the hand's timeline.
    // "Given an event and the time it occurs in the timeline"
    positionAtEvent(ev: HandEvent[] | HandEvent | null): Vector3 {
        // TODO : ball scale should be a NUMBER, not a VECTOR
        if (ev === null) {
            return this.restSpot.position.getGlobal();
        }
        if (Array.isArray(ev)) {
            // We compute the average position of all events.
            if (ev.length === 0) {
                return this.restSpot.position.getGlobal();
            } else {
                const positions: Vector3[] = [];
                for (const singleEv of ev) {
                    positions.push(this.positionAtEvent(singleEv));
                }
                return averageVector3(positions);
            }
        } else {
            if (ev.type === "catch") {
                return this.catchSpot.position.getGlobal();
            } else if (ev.type === "toss") {
                return this.tossSpot.position.getGlobal();
            } else if (ev.type === "table") {
                // More complex : the hand is turned upside down, palm facing the table,
                // so that the position of the ball it deposits matches the position the
                // ball will have on the table.
                // TODO : The hand rotation. Not 180 degrees so that it turns in the right direction ?
                // TODO : this.performance.get().getBall(...) is kinda ugly... Better to have custom getter / setter to achieve : this.performance.getBall(...) ?
                const tableModel = this.performance.get().getTable(ev.tableID);
                const ballModel = this.performance.get().getBall(ev.ballID);
                const tableSpotPos = tableModel.spotPosition(ev.tableSpot);
                const upVector = tableModel.upVector();
                const scaledBallRadius = ballModel.scaledRadius();
                const handBallContact = tableSpotPos.add(
                    upVector.multiplyScalar(2 * scaledBallRadius)
                );
                return this.positionBySpotPos(ev.handSpotIdx, handBallContact);
            } else {
                // Complex movement when a ball swaps hands :
                // - the hand that has the ball (that gives it) goes on its swapSpot.
                // - the hand that receives the ball (that takes it) faces downwards and retreives the ball.
                if (ev.isGivingHand) {
                    return this.swapSpot.position.getGlobal();
                } else {
                    // TODO : What is described above.
                    return this.swapSpot.position.getGlobal();
                }
            }
        }
    }

    // TODO (in ballmodel) private ballPositionAtEvent() {}

    // handPosition(time: number): Vector3 {
    //     const [prevEventTime, prevEvent] = this.timeline.prevEvent(time);

    //     if (prevEvent === null) {
    //         // We need to look at the next event to figure out where the ball
    //         // should be.
    //         const [, nextEvent] = this.timeline.nextEvent(time);
    //         if (nextEvent === null) {
    //             return VERY_VERY_FAR_VEC.clone();
    //         } else if (nextEvent.type === "airborne") {
    //             this._throwTimelineError(prevEvent, nextEvent);
    //             return VERY_VERY_FAR_VEC.clone();
    //         } else if (nextEvent.type === "held") {
    //             return this.performance
    //                 .getHand(nextEvent.jugglerName, nextEvent.rightHand)
    //                 .position(time);
    //         } else {
    //             return this.positionOnTable(nextEvent.tableID, nextEvent.spot);
    //         }
    //     } else if (prevEvent.type === "airborne") {
    //         // Check if the ball flies toward something we can interpret as a target.
    //         const [nextEventTime, nextEvent] = this.timeline.nextEvent(time);
    //         if (nextEvent === null || nextEvent.type === "airborne") {
    //             this._throwTimelineError(prevEvent, nextEvent);
    //             return VERY_VERY_FAR_VEC.clone();
    //         }

    //         // Check if the ball files from something that we can understand as an origin.
    //         const [, prevPrevEvent] = this.timeline.prevEvent(prevEventTime, true);
    //         if (prevPrevEvent === null || prevPrevEvent.type === "airborne") {
    //             this._throwTimelineError(prevEvent, nextEvent);
    //             return VERY_VERY_FAR_VEC.clone();
    //         }

    //         // Compute the targets.
    //         let toPos: Vector3;
    //         if (nextEvent.type === "held") {
    //             // TODO : Compute catch position.
    //             toPos = this.performance
    //                 .getHand(nextEvent.jugglerName, nextEvent.rightHand)
    //                 .ballPositionAtEvent(time);
    //         } else {
    //             toPos = this.positionOnTable(nextEvent.tableID, nextEvent.spot);
    //         }

    //         let fromPos: Vector3;
    //         if (prevPrevEvent.type === "held") {
    //             // TODO : Compute toss position.
    //             // Notice we get the hand from the prevPrevEvent,
    //             // But we get the toss time from the prevEvent.
    //             fromPos = this.performance
    //                 .getHand(prevPrevEvent.jugglerName, prevPrevEvent.rightHand)
    //                 .ballPositionAtEvent(time);
    //         } else {
    //             fromPos = this.positionOnTable(prevPrevEvent.tableID, prevPrevEvent.spot);
    //         }

    //         // Compute where we are in the air.
    //         return ballPosition(fromPos, prevEventTime, toPos, nextEventTime, time);
    //     } else if (prevEvent.type === "held") {
    //         return this.performance
    //             .getHand(prevEvent.jugglerName, prevEvent.rightHand)
    //             .position(time);
    //     } else {
    //         return this.positionOnTable(prevEvent.tableID, prevEvent.spot);
    //     }
    // }

    // heldBallPosition(time: number): Vector3 | undefined {}
}
