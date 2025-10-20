import { VECTOR3_STRUCTURE } from "../utils/constants";
import { CubicHermiteSpline } from "../utils/spline/Spline";
import { HandEvent, HandTimeline } from "./timelines/HandTimeline";
import { PerformanceChild, PerformanceModelRef, PerformanceRefParams } from "./PerformanceChild";
import { averageEulerAngle, averageVector3 } from "../utils/three/Vector";
import { Euler, Object3D, Vector3 } from "three";
import { SpotModel } from "./SpotModel";
import { ObjectPropertiesOptional, ThreeDummyObject, ThreeSyncedScale } from "./ThreeSyncedProperty";
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

    jugglerName: string;

    performance: PerformanceModelRef;

    scale: ThreeSyncedScale;

    readonly _dummyObject = new ThreeDummyObject(new Object3D());

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
        if (holdSpotsPos === undefined || holdSpotsPos.size === 0) {
            // We create a single spot in hand, right at the hand's position.
            holdSpotsEntries.push([0, new SpotModel({ position: new Vector3(0, 0, 0) })]);
            // We ignore the eventual value given to defaultHoldSpot.
            this.defaultHoldSpotNumber = 0;
        } else {
            for (const [spotNumber, spotPos] of holdSpotsPos) {
                holdSpotsEntries.push([spotNumber, new SpotModel({ position: spotPos })]);
            }
            // If no default spot number is given, take the last one.
            this.defaultHoldSpotNumber = defaultHoldSpotNumber ?? getLastInsertedKey(holdSpotsPos)!;
        }
        const obj = this._dummyObject.get();
        this.holdSpots = new MapCallbacks({
            onSetElement: (key, value) => {
                obj.add(value._object);
            },
            onDeleteElement: (key, value) => {
                if (value !== undefined) {
                    obj.remove(value._object);
                }
            },
            entries: holdSpotsEntries
        });

        this.scale = new ThreeSyncedScale(obj, scale);
        this.performance = new PerformanceModelRef();
    }

    /**
     * Whether this hand is the right or the left one of the juggler.
     * @returns a boolean
     */
    // TODO : Re-add juggler Name ? Juggler ref directly ?
    // isRightHand(): boolean | undefined {
    //     return this.performance.get()?.jugglers.getSurely(this.)
    // }

    getSpotModel(spotNumber: number): SpotModel {
        return this.holdSpots.get(spotNumber) ?? this.holdSpots.get(this.defaultHoldSpotNumber) ?? this.restSpot;
    }
    //TODO : Handle hand rotation
    positionBySpotPos(spotNumber: number, spotPos: Vector3): Vector3 {
        const handToSpotLocalVec = this.getSpotModel(spotNumber).position.getLocal();
        const handToSpotGlobalVec = localToWorldVector(handToSpotLocalVec, this._dummyObject.get());
        return spotPos.sub(handToSpotGlobalVec);
    }

    getSpotPosition(handPosition: Vector3, handRotation: Euler, spotNumber: number) {
        this._dummyObject.setProperties({position: handPosition, rotation: handRotation})
        const spotPos = .copy(handPosition);
        this.
    }

    // TODO : FIRST ROT APPROACH : oriented in direction of elbow (but not down / up)

    //TODO / Document that we don't check if the time is the correct one for the event in the hand's timeline.
    // "Given an event and the time it occurs in the timeline"
    positionAndRotationAtEvent(evTime: number, ev: HandEvent[] | HandEvent | null): {position: Vector3; rotation: Euler} {
        // TODO : ball scale should be a NUMBER, not a VECTOR
        if (ev === null) {
            return {position: this.restSpot.position.getGlobal(), rotation: new Euler(0, 0, 0)};
        }
        if (Array.isArray(ev)) {
            // We compute the average position of all events.
            if (ev.length === 0) {
                return {position: this.restSpot.position.getGlobal(), rotation: new Euler(0, 0, 0)};
            } else {
                const positions: Vector3[] = [];
                const rotations: Euler[] = [];
                for (const singleEv of ev) {
                    const {position, rotation} = this.positionAndRotationAtEvent(evTime, singleEv);
                    positions.push(position);
                    rotations.push(rotation);
                }
                return {position: averageVector3(positions), rotation: averageEulerAngle(rotations)};
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
                // TODO : this.performance.get().balls.getSurely(...) is kinda ugly... Better to have custom getter / setter to achieve : this.performance.balls.getSurely(...) ?
                const tableModel = this.performance.get().tables.getSurely(ev.tableID);
                const ballModel = this.performance.get().balls.getSurely(ev.ballID);
                const tableSpotPos = tableModel.getSpotPosition(ev.tableSpot);
                const upVector = tableModel.upVector();
                const scaledBallRadius = ballModel.scaledRadius();
                const handBallContact = tableSpotPos.add(
                    upVector.multiplyScalar(2 * scaledBallRadius)
                );
                //TODO : the hand should be positioned "up" from the ball center, not using the table's up.
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

    velocityAtEvent(evTime: number, ev: HandEvent[] | HandEvent | null): Vector3 {
        if (ev === null) {
            return new Vector3(0, 0, 0);
        } else if (Array.isArray(ev)) {
            // We compute the average position of all events.
            if (ev.length === 0) {
                return new Vector3(0, 0, 0);
            } else {
                const positions: Vector3[] = [];
                for (const singleEv of ev) {
                    positions.push(this.velocityAtEvent(evTime, singleEv));
                }
                return averageVector3(positions);
            }
        } else if (ev.type === "catch" || ev.type === "toss") {
            const ballModel = this.performance.get().balls.getSurely(ev.ballID);
            const ballEv = ballModel.timeline.getElementByKey(evTime);
            // No this won't work ? Think about it.
            return ballEv === undefined
                ? new Vector3(0, 0, 0)
                : ballModel.velocityAtEvent(evTime, ballEv);
        } else {
            return new Vector3(0, 0, 0);
        }
    }

    positionAtTime(time: number): Vector3 {
        throw Error("TODO")
    }

    propertiesAtTime(time: number): ObjectPropertiesOptional {
        throw Error("TODO")

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
