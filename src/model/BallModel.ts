import { BallEvent } from "./timelines/BallTimeline";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition as tossedBallPosition, ufoBallPosition } from "./BallPhysics";
import { PerformanceModelRef } from "./PerformanceChild";
import { Euler, Object3D, Vector3 } from "three";
import { VERY_VERY_FAR_VEC } from "./PerformanceModel";
import { localToWorldVector } from "../utils";
import { SpotModel } from "./SpotModel";
import { MAX_UFO_TIME } from "../inference";

//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : What is readonly ?
//TODO : velocity
//TODO : acceleration

/**
 * Interface for the constructor of BallModel.
 */
type BallModelParams = {
    /**
     * The unique ID of the ball that identifies it from other balls.
     */
    id: string;
    /**
     * The radius of the ball.
     */
    radius?: number;
    /**
     * The timeline of events (tosses, catches, ...) of the ball.
     */
    timeline?: BallTimeline;
    // scale?: Vector3;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a ball.
 */
export class BallModel {
    /**
     * The radius of the ball.
     */
    radius: number;
    /**
     * The unique ID amongst of ball of the ball. TODO : Will change.
     */
    id: string;

    // scale: ThreeSyncedScale;

    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline: BallTimeline;

    performance: PerformanceModelRef;

    readonly _object = new Object3D();

    constructor({ radius, id, timeline }: BallModelParams) {
        this.id = id;
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
        this.performance = new PerformanceModelRef();
        // this.scale = new ThreeSyncedScale(this._object, scale);
    }

    // scaledRadius(): number {

    // }

    scaledRadiusInObjectBasis(obj: Object3D): Vector3 {
        // TODO : Handle the fact that the ball's scale may not be the same number on all axis... I'm sad...
        // const radius =  this.radius * Math.max(...this.scale.getGlobal());
        const objWorldScale = obj.getWorldScale(new Vector3());
        return new Vector3(
            this.radius / objWorldScale.x,
            this.radius / objWorldScale.y,
            this.radius / objWorldScale.z
        );
        // return new Vector3(this.radius);
    }

    positionOverSpot(spotModel: SpotModel): Vector3 {
        // We proceed in world space as local space may have a scale (thus negating the axes).
        const spotWorldPos = spotModel.position.getGlobal();
        const spotUpWorldVec = localToWorldVector(new Vector3(0, 1, 0), spotModel._object);
        return spotWorldPos.add(spotUpWorldVec.multiplyScalar(this.radius));
    }

    /**
     * Returns the ball's position at a specific event from the timeline.
     * @param ev the event.
     * @returns the position where that event occurs.
     */
    positionAtEvent(evTime: number | null, ev: BallEvent | null): Vector3 | null {
        if (evTime === null || ev === null) {
            return null;
        } else if (ev.location.type === "onTable") {
            const spotModel = this.performance
                .getSurely()
                .tables.getSurely(ev.location.tableID)
                .getSpotModel(ev.location.spot);
            return this.positionOverSpot(spotModel);
        } else {
            // The ball is held, so we need to know where the hand is.
            const handModel = this.performance
                .getSurely()
                .getHand(ev.location.jugglerName, ev.location.rightHand);
            // If the event corresponds to a toss or a catch, we have to be careful
            // to avoid an infinite loop :
            // (... -> Ball.positionAtEvent -> Hand.positionAtTime
            // -> Hand.velocityAtEvent -> Ball.positionAtEvent -> ...)
            // Indeed, we need to know the ball's velocity vector to arc the hand's
            // trajectory correctly. To know that, we need to know the balls toss / catch
            // position.
            // (This loop is avoided for other events as the hand's velocity is null.)
            const [, prevEv] = this.timeline.prevEvent(evTime, true);
            let handPosRot: {
                position: Vector3;
                rotation: Euler;
            };
            if (ev.transition.type === "airborne" || prevEv?.transition.type === "airborne") {
                // It's a toss (1st case) or a catch (second case).
                // So there must be a corresponding catch / toss event for the hand.
                const handEv = handModel.timeline.getElementByKey(evTime);
                if (handEv === undefined) {
                    return null;
                }
                handPosRot = handModel.localPositionAndRotationAtEvent(evTime, handEv);
            } else {
                // We need to ask for the hand position at that event.
                handPosRot = handModel.localPositionAndRotationAtTime(evTime);
            }
            // We can now given the hand's transform compute where the ball would be held.
            const spotModel = handModel.getSpotModel(ev.location.spotIdx);
            handModel._dummyObject.setProperties(handPosRot);
            const ballPos = this.positionOverSpot(spotModel);
            handModel._dummyObject.unsetProperties();
            return ballPos;
        }
    }

    /** Returns the ball's position at a given time.
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    positionAtTime(time: number): Vector3 {
        const [prevEvTime, prevEv] = this.timeline.prevEvent(time);
        const [nextEvTime, nextEv] = this.timeline.nextEvent(time);

        if (prevEv === null) {
            // We need to look at the next event to figure out where the ball should be.
            if (nextEv === null) {
                // The ball has no event in its timeline. It goes nowhere.
                return this.positionAtEvent(nextEvTime, nextEv) ?? VERY_VERY_FAR_VEC.clone();
            } else if (nextEv.location.type === "onTable") {
                // The ball is on the table, which does not move.
                return this.positionAtEvent(nextEvTime, nextEv) ?? VERY_VERY_FAR_VEC.clone();
            } else {
                // The ball is held, so we look where the hand is to get where the ball's spot is.
                const handModel = this.performance
                    .getSurely()
                    .getHand(nextEv.location.jugglerName, nextEv.location.rightHand);
                const spotModel = handModel.getSpotModel(nextEv.location.spotIdx);
                const handPosRotSca = handModel.localPositionAndRotationAtTime(nextEvTime);
                handModel._dummyObject.setProperties(handPosRotSca);
                const ballPos = this.positionOverSpot(spotModel);
                handModel._dummyObject.unsetProperties();
                return ballPos;
            }
        } else if (
            prevEv.transition.type === "keep" ||
            (prevEv.transition.type === "slideInHand" && nextEv === null)
        ) {
            // The ball remains where it stands.
            if (prevEv.location.type === "onTable") {
                return this.positionAtEvent(prevEvTime, prevEv) ?? VERY_VERY_FAR_VEC.clone();
            } else {
                // The ball is held.
                const handModel = this.performance
                    .getSurely()
                    .getHand(prevEv.location.jugglerName, prevEv.location.rightHand);
                const spotModel = handModel.getSpotModel(prevEv.location.spotIdx);
                const handPosRotSca = handModel.localPositionAndRotationAtTime(time);
                handModel._dummyObject.setProperties(handPosRotSca);
                const ballPos = this.positionOverSpot(spotModel);
                handModel._dummyObject.unsetProperties();
                return ballPos;
            }
        } else if (prevEv.transition.type === "airborne" || prevEv.transition.type === "ufo") {
            // If we can compute the starting and ending positions, we know
            // what trajectory to give the ball.
            const prevEvPos = this.positionAtEvent(prevEvTime, prevEv);
            const nextEvPos = this.positionAtEvent(nextEvTime, nextEv);
            // Give the correct trajectory.
            if (prevEv.transition.type === "airborne") {
                if (prevEvPos === null || nextEvPos === null || nextEvTime === null) {
                    return VERY_VERY_FAR_VEC.clone();
                }
                return tossedBallPosition(prevEvPos, prevEvTime, nextEvPos, nextEvTime, time);
            } else {
                if (prevEvPos === null) {
                    return VERY_VERY_FAR_VEC.clone();
                }
                return ufoBallPosition(
                    prevEvPos,
                    prevEvTime,
                    VERY_VERY_FAR_VEC,
                    prevEvTime + MAX_UFO_TIME,
                    time
                );
            }
        } else {
            // The ball slides locally. (so it needs to be on the same object)
            if (nextEvTime === null) {
                // The event was treated in a previous condition.
                console.error("Shouldn't happen.");
                return VERY_VERY_FAR_VEC.clone();
            } else if (
                prevEv.location.type === "onTable" &&
                nextEv.location.type === "onTable" &&
                prevEv.location.tableID === nextEv.location.tableID
            ) {
                // We gather the spot positions.
                const tableModel = this.performance
                    .getSurely()
                    .tables.getSurely(prevEv.location.tableID);
                const prevEvPos = tableModel.getSpotPosition(prevEv.location.spot);
                const nextEvPos = tableModel.getSpotPosition(nextEv.location.spot);
                // We interpolate between the position.
                return prevEvPos.lerp(nextEvPos, (nextEvTime - time) / (nextEvTime - prevEvTime));
            } else if (
                prevEv.location.type === "held" &&
                nextEv.location.type === "held" &&
                prevEv.location.jugglerName === nextEv.location.jugglerName &&
                prevEv.location.spotIdx === nextEv.location.spotIdx
            ) {
                // We gather the tableModel and spotModels.
                const handModel = this.performance
                    .getSurely()
                    .getHand(prevEv.location.jugglerName, prevEv.location.rightHand);
                const prevSpotModel = handModel.getSpotModel(prevEv.location.spotIdx);
                const nextSpotModel = handModel.getSpotModel(nextEv.location.spotIdx);

                // We move the hand to where it is at the resquested time.
                const handPosRot = handModel.localPositionAndRotationAtTime(time);
                handModel._dummyObject.setProperties(handPosRot);

                // We grab the balls positions at that time and interpolate between them.
                const prevSpotBallPos = this.positionOverSpot(prevSpotModel);
                const nextSpotBallPos = this.positionOverSpot(nextSpotModel);
                const ballHandPos = prevSpotBallPos
                    .clone()
                    .lerp(nextSpotBallPos, (time - prevEvTime) / (nextEvTime - prevEvTime));

                // Finally, we undo the dummy object position's.
                handModel._dummyObject.unsetProperties();
                return ballHandPos;
            } else {
                return VERY_VERY_FAR_VEC.clone();
            }
        }
    }

    // rotation(time: number) {
    // We need to match the hand's rotation when held
    //TODO : What about when the hand is at an angle :/
    // }
}
