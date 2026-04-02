import { HandEvent, HandTimeline } from "./timelines/HandTimeline";
import { PerformanceModelRef } from "./PerformanceChild";
import { averageEulerAngle, averageVector3 } from "../utils/three/Vector";
import { CubicBezierCurve3, Euler, Matrix4, Object3D, Plane, Quaternion, Vector3 } from "three";
import { SpotModel, SpotModelParams } from "./SpotModel";
import {
    ObjectPropertiesOptional as ObjectLocalTransform,
    ThreeDummyObject,
    ThreeSyncedScale
} from "./ThreeSyncedProperty";
import { MapCallbacks } from "./MapCallbacks";
import { getLastInsertedKey } from "../utils/Operations";
import { changePositionCoordinateSystem, V3SUB } from "../utils";
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
        restSpot,
        tossSpot,
        swapSpot,
        holdSpots,
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

    localPositionAndRotationAtEvent(ev: HandEvent[] | HandEvent | null): {
        position: Vector3;
        rotation: Euler;
    } {
        // TODO : ball scale should be a NUMBER, not a VECTOR
        if (ev === null) {
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
                return this.localPositionAndRotationAtEvent(ev[ev.length - 1]);
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
        prevTime: number,
        prevPos: Vector3,
        prevVel: Vector3,
        nextTime: number,
        nextPos: Vector3,
        nextVel: Vector3
    ): CubicBezierCurve3 {
        // We want to construct the control points of the Cubic Bezier Curve.
        
        // To do so, we first use the next action to compute the amplitude of the trajectory.
        // (in the plane defined by the nextVel vector at position nextPos, and the line joining prev to next pos).
        // if they are coplanar, TODO (use the juggler's plane ???)
        
        const line1 = V3SUB(nextPos, prevPos);
        const line2 = nextVel;
        if ()
        const normalPlaneVec = line1.clone().cross(line2)
        if ()
        const plane = new Plane()
        


        const v0 = prevPos;
        // const v1 = ;
        // const v2 = ;
        const v3 = nextPos;
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

        // return new CubicBezierCurve3(points, dpoints, knots);
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

        // Handle edge cases : when an event is asked outside the timeline bounds.
        if (prevEv === null && nextEv === null) {
            return this.localPositionAndRotationAtEvent(null);
        } else if (prevEv === null) {
            return this.localPositionAndRotationAtEvent(nextEv);
        } else if (nextEv === null) {
            return this.localPositionAndRotationAtEvent(prevEv);
        }

        // Gather the transform at the next and previous events.
        const { position: prevPos, rotation: prevRot } =
            this.localPositionAndRotationAtEvent(prevEv);
        const { position: nextPos, rotation: nextRot } =
            this.localPositionAndRotationAtEvent(nextEv);

        // Compute the velocity at those events
        // Note : if a ball is caught / tossed, it may depend on the balls velocity.
        const prevVel = this.velocityAtEvent(prevTime, prevEv);
        const nextVel = this.velocityAtEvent(nextTime, nextEv);

        // Compute the spline (that takes a time between 0 and 1), the time remapping, and appropriate velocities.
        const spline = this.getSpline(prevTime, prevPos, prevVel, nextTime, nextPos, nextVel);

        // The spline only gives the trajectory of the hand, but not how fast it should move.
        // We'd like to be able to specify the velocity at the start / end of the trajectory.
        // To achieve that, we create a remapTime function (from [0, 1] to [0, 1] such that
        // velocity of spline at time t0 = spline(f(0)) = v0
        // velocity of spline at time t1 = spline(f(1)) = v1
        // This allows us to determine the derivative f should have at 0 and 1.
        const wantedVel0 = prevVel; //TODO : Change ?
        const wantedVel1 = nextVel; //TODO : Change ?
        const d0 =
            (wantedVel0.length() * (nextTime - prevTime)) /
            (3 * new Vector3(...spline.v3).sub(spline.v2).length());
        const d1 =
            (wantedVel1.length() * (nextTime - prevTime)) /
            (3 * new Vector3(...spline.v1).sub(spline.v0).length());
        const mappedTime = remapTime(d0, d1, time - prevTime / prevTime - nextTime);
        const position = spline.getPoint(mappedTime);
        const rotation = this.interpolateRotation(prevTime, prevRot, nextTime, nextRot, time); // TODO : CHANGE OR MODIFY (currently unused).
        return { position, rotation };
    }
}

function remapTime(d0: number, d1: number, t: number, recursiveDepth = 0): number {
    // d0 and d1 are the derivates at 0 and 1 respectively.
    // t is the time we wish to compute
    // recursiveDepth is a sanity check.
    if (t <= 0) {
        return 0;
    } else if (1 <= t) {
        return 1;
    } else if (d0 < 0 || d1 < 0) {
        // If the start or end derivatives are negative, we can't map [0, 1] to [0, 1].
        throw Error("TODO");
    } else if ((d0 < 1 && 1 < d1) || (1 < d0 && d1 < 1) || recursiveDepth >= 2) {
        //TODO : < or <= ???
        // We can use a quartic Bezier curve to join (0, 0) to (1, 1), where the middle control point C is given
        // by the intersection of the two tangents at 0 and 1.
        // The conditions on d0 and d1 guarantee we can build a function f whose graph is this curve.
        // All the equations have been derived and checked, but the details won't appear here.

        // If the recursive depth is too high, we failback here to not have the functio run indefinitely.
        if (recursiveDepth >= 2) {
            console.warn("DEBUG : Too much calls to remapTime.");
        }
        const cX = (1 - d1) / (d0 - d1);
        const cY = cX * d0;

        const inverseT = (-cX + Math.sqrt(cX ** 2 + (1 - 2 * cX) * t)) / (1 - 2 * cX);

        return (1 - 2 * cY) * inverseT ** 2 + 2 * cY * inverseT;
    } else {
        // We defined a point P through which the function goes.
        // We also define the derivative dP at that point such that if d0 and d1 are < 1, dP is > 1 and conversely.
        // That way, we can call the function recursively.
        // The pitfall is that we need to change the value of the derivatives on that callback.
        // This namely imposes constraints on P and dP :
        // - 0 < Px < 1 (the transition point is on the domain definition of f)
        // - d0 * Px < Py < d1 * Px + 1 - d1 (the transition point isn't below the tangent at 0 or above the tangent at 1).
        //   - if d0 and d1 < 1, then
        //       - Py / Px < dP < (1 - Py) / (1 - Px) implies the recurive call with the adjusted derivatives will
        // trigger the above if statement.
        //       - it implies that 1 < d.
        //   - if d0 and d1 > 1, then same inequality the other way around has the same implications.

        // It just so happen than taking P = (1/2, 1/2) always provides valid values for d as long as it is correctly
        // over or under 1 (based on d0 and d1).
        // The following value of d has been arbitrarily chosen.
        // But you can try changing those 3 values to see in what graphs it results.
        const pX = 0.5;
        const pY = 0.5;
        const dP = 1.5;

        if (t < pX) {
            const scaleFactor = pX / pY;
            return pY * remapTime(d0 * scaleFactor, dP * scaleFactor, t, recursiveDepth + 1);
        } else {
            const scaleFactor = (1 - pX) / (1 - pY);
            return (
                pY + (1 - pY) * remapTime(dP * scaleFactor, d1 * scaleFactor, t, recursiveDepth + 1)
            );
        }
    }
}

// function tmp(d0: number, d1: number): (t: number) => number {
//     return (t: number) => remapTime(d0, d1, t);
// }

function vecEquals(vec1: Vector3, vec2: Vector3, eps = 1e-6) {
}

function floatEquals(x: number, y: number, eps = Number.EPSILON): boolean {
    const diff = Math.abs(x - y);
    return x === y || diff < eps || diff <= eps * Math.min(Math.abs(x), Math.abs(y));
}