import { VECTOR3_STRUCTURE } from "../utils/constants";
import { CubicHermiteSpline } from "../utils/spline/Spline";
import { HandEvent, HandTimeline } from "./timelines/HandTimeline";
import { PerformanceModelRef } from "./PerformanceChild";
import { averageEulerAngle, averageVector3 } from "../utils/three/Vector";
import { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three";
import { SpotModel, SpotModelParams } from "./SpotModel";
import {
    ObjectPropertiesOptional as ObjectLocalTransform,
    ThreeDummyObject,
    ThreeSyncedScale
} from "./ThreeSyncedProperty";
import { MapCallbacks } from "./MapCallbacks";
import { getLastInsertedKey } from "../utils/Operations";
import { changePositionCoordinateSystem } from "../utils";
import { JugglerModel } from "./JugglerModel";
import { ballVelocityAtCatch, ballVelocityAtToss } from "./BallPhysics";
import { BallEvent } from "./timelines/BallTimeline";

//TODO : Change the fact that all methods have get in front of them
//TODO : Change instanceof to string type as it is faster ?
//TODO : Remove the throws and instead have union type of supported types, so that
//it is the compiler that complains when someone tries to add events.
//TODO : Make it so moving juggler moves its points with him (so no precalculated things ?)
//TODO : Forbid Hand Event[] from having catch/thrown and put/take
//TODO : Replace null by undefined ?
//TODO : Replace HandEventInterface by HandEventTimeline in function signatures ?
//TODO : Better handle type checking of multievent ?

export const HAND_MAX_TIME_FOR_ACTION = 0.5;

/**
 * Interface for the constructor of HandModel.
 */
export type HandModelParams = {
    /**
     * The place where the hand catches balls.
     */
    catchSpot: SpotModelParams;
    /**
     * The place where the hand tosses balls.
     */
    tossSpot: SpotModelParams;
    /**
     * The place where the hand rests when it has nothing to do
     * for its foreseable future.
     */
    restSpot?: SpotModelParams;
    swapSpot?: SpotModelParams;
    holdSpots?: Map<number, SpotModelParams>;
    defaultHoldSpotNumber?: number;
    /**
     * The timeline of events (throws, catches, ...) of the hand.
     */
    timeline?: HandTimeline;
    scale?: Vector3;
    jugglerName: string;
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
     * The place where the hand is when swapping balls with the table / other hand.
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
        catchSpot,
        restSpot ,
        tossSpot ,
        swapSpot ,
        holdSpots ,
        defaultHoldSpotNumber,
        timeline,
        scale,
        jugglerName
    }: HandModelParams) {
        this.timeline = timeline ?? new HandTimeline();
        this.catchSpot = new SpotModel(catchSpot);
        this.tossSpot = new SpotModel(tossSpot);
        restSpot ??= {
            position: averageVector3([
                this.catchSpot.position.getLocal(),
                this.tossSpot.position.getLocal()
            ]),
            rotation: averageEulerAngle([
                this.catchSpot.rotation.getLocal(),
                this.catchSpot.rotation.getLocal()
            ])
        };
        this.restSpot = new SpotModel(restSpot);
        swapSpot ??= { position: restSpot.position?.clone(), rotation: restSpot.rotation?.clone() };
        this.swapSpot = new SpotModel(swapSpot);
        this.jugglerName = jugglerName;
        // this.swapSpot = new SpotModel({
        //     position:
        //         swapPos ??
        //         this.tossSpot.position
        //             .getLocal()
        //             .add(this.tossSpot.position.getLocal().sub(this.catchSpot.position.getLocal()))
        // });

        const holdSpotsEntries: [number, SpotModel][] = [];
        if (holdSpots === undefined || holdSpots.size === 0) {
            // We create a single spot in hand, right at the hand's position.
            holdSpotsEntries.push([0, new SpotModel({ position: new Vector3(0, 0, 0) })]);
            // We ignore the eventual value given to defaultHoldSpot.
            this.defaultHoldSpotNumber = 0;
        } else {
            for (const [spotNumber, spotParams] of holdSpots) {
                holdSpotsEntries.push([spotNumber, new SpotModel(spotParams)]);
            }
            // If no default spot number is given, take the last one.
            this.defaultHoldSpotNumber = defaultHoldSpotNumber ?? getLastInsertedKey(holdSpots)!;
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

        this.performance = new PerformanceModelRef();
        this.scale = new ThreeSyncedScale(obj, scale);
    }

    /**
     * Whether this hand is the right or the left one of the juggler.
     * @returns a boolean
     */
    isRightHand(): boolean {
        return this.performance.get()?.jugglers.getSurely(this.jugglerName).rightHand === this;
    }

    getSpotModel(spotNumber: number): SpotModel {
        return (
            this.holdSpots.get(spotNumber) ??
            this.holdSpots.get(this.defaultHoldSpotNumber) ??
            this.restSpot // TODO : Should rather be undefined ?
        );
    }

    localPositionByHoldSpotPosition(
        spotNumber: number,
        spotPosJuggler: Vector3,
        handRotation: Euler
    ): Vector3 {
        // This comes from the fact that if B is a child of A :
        // p_B(world) = S_a * R_a * p_B(local) + p_A(world).
        // And we're looking for p_A(world) (coordinate of spot in juggler basis).
        const spotPosHand = this.getSpotModel(spotNumber).position.getLocal();
        const handScale = this._dummyObject.get().scale;
        const inverseLocalSpotMatrix = new Matrix4()
            .scale(handScale)
            .makeRotationFromEuler(handRotation);
        const handPositionJuggler = spotPosJuggler
            .clone()
            .sub(spotPosHand.clone().applyMatrix4(inverseLocalSpotMatrix));
        return handPositionJuggler;
    }

    getJugglerModel(): JugglerModel {
        return this.performance.getSurely().jugglers.getSurely(this.jugglerName);
    }

    getHoldSpotPositionRelativeToJuggler(
        handLocalTransform: ObjectLocalTransform,
        spotNumber: number
    ): Vector3 {
        // We take spotNumber and not spotModel as an argument to this function to avoid
        // giving it a spotModel that is already child of juggler
        this._dummyObject.setProperties(handLocalTransform);
        const spotModel = this.getSpotModel(spotNumber);
        const spotPosLocal = spotModel.position.getLocal();
        const jugglerModel = this.getJugglerModel();
        const spotPosJuggler = changePositionCoordinateSystem(
            spotPosLocal,
            this._dummyObject.get(),
            jugglerModel._object
        );
        this._dummyObject.unsetProperties();
        return spotPosJuggler;
    }

    // TODO : FIRST ROT APPROACH : oriented in direction of elbow (but not down / up)

    //TODO / Document that we don't check if the time is the correct one for the event in the hand's timeline.
    // "Given an event and the time it occurs in the timeline"
    // evTime is asked only to have consistent method call with BallModel.
    localPositionAndRotationAtEvent(
        evTime: number | null,
        ev: HandEvent[] | HandEvent | null
    ): { position: Vector3; rotation: Euler } {
        // TODO : ball scale should be a NUMBER, not a VECTOR
        if (ev === null || evTime === null) {
            return {
                position: this.restSpot.position.getLocal(),
                rotation: this.restSpot.rotation.getLocal()
            };
        }
        if (Array.isArray(ev)) {
            // The position of the event is the position of the last element in the list.
            if (ev.length === 0) {
                return {
                    position: this.restSpot.position.getLocal(),
                    rotation: this.restSpot.rotation.getLocal()
                };
            } else {
                return this.localPositionAndRotationAtEvent(evTime, ev[ev.length - 1]);
            }
        } else if (ev.type == "catch") {
            return {
                position: this.catchSpot.position.getLocal(),
                rotation: this.catchSpot.rotation.getLocal()
            };
        } else if (ev.type === "toss") {
            return {
                position: this.tossSpot.position.getLocal(),
                rotation: this.tossSpot.rotation.getLocal()
            };
        } else if (ev.type === "rest") {
            return {
                position: this.restSpot.position.getLocal(),
                rotation: this.restSpot.rotation.getLocal()
            };
        } else {
            return {
                position: this.swapSpot.position.getLocal(),
                rotation: this.swapSpot.rotation.getLocal()
            };
        }
        // } else if (ev.type === "table") {
        //     // More complex : the hand is turned upside down, palm facing the table,
        //     // so that the position of the ball it deposits matches the position the
        //     // ball will have on the table.
        //     // TODO : The hand rotation. Not 180 degrees so that it turns in the right direction ?
        //     // TODO : this.performance.get().balls.getSurely(...) is kinda ugly... Better to have custom getter / setter to achieve : this.performance.balls.getSurely(...) ?
        //     // TODO : Handle ball scale... SHOUDL BE NUMBER THAT WON T STRETCH BASED ON ANNOUNCED BALL RADIUS.
        //     // MAKE IT SO THE BALL RADIUS GETS APPLIED IN GLOBAL COORD IF POSSIBLE ?
        //     // TODO : Cleanup unused functions, or creat useful ones.
        //     const tableModel = this.performance.getSurely().tables.getSurely(ev.tableID);
        //     const ballModel = this.performance.getSurely().balls.getSurely(ev.ballID);
        //     const spotModel = tableModel.getSpotModel(ev.tableSpot);
        //     const jugglerModel = this.getJugglerModel();
        //     // Then we add the ball's radius along the spot's "up" to get the ball's global position.
        //     const ballWorldPos = ballModel.positionOverSpot(spotModel);
        //     // Then we add the ball's radius along the juggler's "up" to get the hand and ball point of contact.
        //     const jugglerUpWorldVec = localToWorldVector(
        //         new Vector3(0, 1, 0),
        //         jugglerModel._object
        //     );
        //     const ballHandContactWorldPos = ballWorldPos
        //         .clone()
        //         .add(jugglerUpWorldVec.clone().multiplyScalar(ballModel.radius));
        //     const ballHandContactJugglerPos = worldToLocalPosition(
        //         ballHandContactWorldPos,
        //         jugglerModel._object
        //     );
        //     // Finally, knowing the hand spot, we compute the hand's position and rotation.
        //     const handRot = new Euler(Math.PI, 0, 0);
        //     const handJugglerPos = this.localPositionByHoldSpotPosition(
        //         ev.handSpotIdx,
        //         ballHandContactJugglerPos,
        //         handRot
        //     );
        //     return { position: handJugglerPos, rotation: handRot };
        // } else {
        //     // Complex movement when a ball swaps hands :
        //     // - the ball's center is on swapSpot.
        //     // - the hand that has the ball (that gives it) goes below the ball.
        //     // - the hand that receives the ball (that takes it) faces downwards and retreives the ball from above.
        //     const jugglerModel = this.performance.getSurely().jugglers.getSurely(this.jugglerName);
        //     const ballModel = this.performance.getSurely().balls.getSurely(ev.ballID);
        //     // Compute the point of contact position with the ball.
        //     const ballScaledRadius = ballModel.scaledRadiusInObjectBasis(jugglerModel._object).y;
        //     // If we retrieve, the point of contact is below the ball, else above.
        //     // We are in the juggler's coordinates.
        //     const ballHandContactPosition = jugglerModel.swapSpot.position.getLocal();
        //     ballHandContactPosition.y += (ev.isGivingHand ? -1 : 1) * ballScaledRadius;
        //     // const spotModel = this.getSpotModel(ev.handSpotIdx)
        //     const handRotation = new Euler(ev.isGivingHand ? 0 : Math.PI, 0, 0);
        //     const handPosition = this.localPositionByHoldSpotPosition(
        //         ev.handSpotIdx,
        //         ballHandContactPosition,
        //         handRotation
        //     );
        //     return { position: handPosition, rotation: handRotation };
        // }
    }

    velocityAtEvent(evTime: number | null, ev: HandEvent[] | HandEvent | null): Vector3 {
        if (ev === null || evTime === null) {
            return new Vector3(0, 0, 0);
        } else if (Array.isArray(ev)) {
            // We take the velcity of the last element.
            if (ev.length === 0) {
                return new Vector3(0, 0, 0);
            }
            return this.velocityAtEvent(evTime, ev[ev.length - 1]);
        } else if (ev.type === "toss" || ev.type === "catch") {
            const ballModel = this.performance.getSurely().balls.getSurely(ev.ballID);
            let tossEv: BallEvent | null;
            let catchEv: BallEvent | null;
            let tossTime: number | null;
            let catchTime: number | null;
            if (ev.type === "toss") {
                tossTime = evTime;
                tossEv = ballModel.timeline.getElementByKey(evTime) ?? null;
                [catchTime, catchEv] = ballModel.timeline.nextEvent(evTime, true);
            } else {
                catchTime = evTime;
                catchEv = ballModel.timeline.getElementByKey(evTime) ?? null;
                [tossTime, tossEv] = ballModel.timeline.prevEvent(evTime, true);
            }
            const tossPos = ballModel.positionAtEvent(tossTime, tossEv ?? null);
            const catchPos = ballModel.positionAtEvent(catchTime, catchEv);
            if (tossPos === null || catchPos === null || catchTime === null || tossTime === null) {
                return new Vector3(0, 0, 0);
            }
            if (ev.type === "toss") {
                return ballVelocityAtToss(tossPos, tossTime, catchPos, catchTime);
            } else {
                return ballVelocityAtCatch(tossPos, tossTime, catchPos, catchTime);
            }
        } else {
            // The hands come at a stop when exchanging a ball with the other hand ot the table.
            return new Vector3(0, 0, 0);
        }
    }

    // TODO : Add a little bit of impact based on speed after throw / catch. Ou quand la ball sonne et qu'on la claque dans la main. Rather clamp position ?
    // TODO : Precompute all event positions / velocities... It will make this code muuuuch simpler and efficient.
    /**
     * Returns the hand's trajectory (spline) in between two consecutive events).
     * @param prevEvent the previous event.
     * @param nextEvent the following event.
     * @returns the spline trajectory.
     */
    getSpline(
        prevTime: number | null,
        prevPos: Vector3,
        prevVel: Vector3,
        nextTime: number | null,
        nextPos: Vector3,
        nextVel: Vector3
    ): CubicHermiteSpline<Vector3> {
        const points: Vector3[] = [prevPos, nextPos];
        const dpoints: Vector3[] = [prevVel, nextVel];
        let knots: number[];

        // Give a default value to knots if time is null.
        if (prevTime === null && nextTime === null) {
            knots = [0, HAND_MAX_TIME_FOR_ACTION];
        } else if (prevTime === null) {
            knots = [nextTime! - HAND_MAX_TIME_FOR_ACTION, nextTime!];
        } else if (nextTime === null) {
            knots = [prevTime, prevTime + HAND_MAX_TIME_FOR_ACTION];
        } else {
            knots = [prevTime, nextTime];
        }

        // If too much time seperates the previous from the next event,
        // we add some time at the rest spot.
        if (knots[1] - knots[0] > HAND_MAX_TIME_FOR_ACTION * 2) {
            points.splice(
                1,
                0,
                this.restSpot.position.getLocal(),
                this.restSpot.position.getLocal()
            );
            dpoints.splice(1, 0, new Vector3(0, 0, 0), new Vector3(0, 0, 0));
            knots.splice(
                1,
                0,
                knots[0] + HAND_MAX_TIME_FOR_ACTION,
                knots[1] - HAND_MAX_TIME_FOR_ACTION
            );
        }
        return new CubicHermiteSpline(VECTOR3_STRUCTURE, points, dpoints, knots);
    }

    interpolateRotation(
        prevTime: number | null,
        prevRot: Euler,
        nextTime: number | null,
        nextRot: Euler,
        time: number
    ): Euler {
        if (prevTime === null && nextTime === null) {
            return prevRot;
        } else if (prevTime === null) {
            return nextRot;
        } else if (nextTime === null) {
            return prevRot;
        }
        const prevQuat = new Quaternion().setFromEuler(prevRot);
        const nextQuat = new Quaternion().setFromEuler(nextRot);
        const alpha = (time - prevTime) / (nextTime - prevTime);
        return new Euler().setFromQuaternion(prevQuat.slerp(nextQuat, alpha));
    }

    localPositionAndRotationAtTime(time: number): { position: Vector3; rotation: Euler } {
        const [prevTime, prevEv] = this.timeline.prevEvent(time);
        const [nextTime, nextEv] = this.timeline.nextEvent(time);
        const { position: prevPos, rotation: prevRot } = this.localPositionAndRotationAtEvent(
            prevTime,
            prevEv
        );
        const { position: nextPos, rotation: nextRot } = this.localPositionAndRotationAtEvent(
            nextTime,
            nextEv
        );
        const prevVel = this.velocityAtEvent(prevTime, prevEv);
        const nextVel = this.velocityAtEvent(nextTime, nextEv);
        const position = this.getSpline(
            prevTime,
            prevPos,
            prevVel,
            nextTime,
            nextPos,
            nextVel
        ).interpolate(time);
        const rotation = this.interpolateRotation(prevTime, prevRot, nextTime, nextRot, time);
        return { position, rotation };
    }
}
