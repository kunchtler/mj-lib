import * as THREE from "three";
import {
    CatchEvent,
    ThrowEvent,
    TablePutEvent,
    TableTakeEvent,
    BallTimelineEvent,
    BallTimeline
} from "./Timeline";
import { JugglerModel } from "./JugglerModel";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";

// TODO : CamelCase for every variable.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : Better encapsulate what parameters are dependent on which (for ex, ofor combo mesh + radius)
interface BallConstructorInterface {
    radius?: number;
    id?: string;
    timeline?: BallTimeline;
    defaultJuggler?: JugglerModel;
    sound?: {
        node: THREE.Audio | THREE.PositionalAudio;
        buffers: Map<string, AudioBuffer>;
    };
}

//TODO : Fusionner les évènements de main et de balles ?
//TODO : Defaults for constructors here and in simulator
//TODO : Checks that hand/ball examined is indeed for this ball / hand and not another ?
//TODO : Remove Tone to only use WebAudio API / THREEjs audio.
//TODO : Better handling of sound when ball is caught / is launched / is flying (unify this ?)
//TODO : At some point, custom sound nodes ?
//TODO : Pause / Unpause sound.

export class BallModel {
    readonly radius: number;
    readonly id: string;
    timeline: BallTimeline;
    sound?: {
        node: THREE.Audio | THREE.PositionalAudio;
        buffers: Map<string, AudioBuffer>;
    };
    defaultJuggler?: JugglerModel;

    constructor({
        radius,
        id,
        timeline,
        // default_table,
        defaultJuggler,
        sound
    }: BallConstructorInterface = {}) {
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
        this.id = id ?? "None";
        // this.defaultTable = default_table;
        this.defaultJuggler = defaultJuggler;
        this.sound = sound;
    }

    //TODO : Move this as static for events
    throwTimelineError(event1: BallTimelineEvent | null, event2: BallTimelineEvent | null): void {
        const str1 =
            event1 === null
                ? `has previous event null`
                : `is ${event1.errorBallStatus} at time ${event1.time}`;
        const str2 =
            event2 === null
                ? `has next event null`
                : `is ${event2.errorBallStatus} at time ${event2.time}`;
        throw Error(`Ball ${this.id} ${str1} and ${str2}.`);
    }

    positionAtEvent(event: BallTimelineEvent | null): THREE.Vector3 {
        if (event === null) {
            throw Error();
        } else if (
            event instanceof CatchEvent ||
            event instanceof ThrowEvent ||
            event instanceof TableTakeEvent
        ) {
            //TableTakeEvent for now here as the ball teleports from table to hand, so is in hand.
            //With proper animations, could change.
            return event.hand.positionAtEvent(event.handMultiEvent());
        } else if (event instanceof TablePutEvent) {
            return event.table.ballPosition(this);
        }
        throw Error("Unimplemented behaviour");
    }

    //TODO : Logique des enchainements d'evenement pour la balle éparpillé dans le code...
    //TODO : Change hand.position to hand.ball_position
    /**
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    position(time: number): THREE.Vector3 {
        const [, prevEvent] = this.timeline.prevEvent(time);
        const [, nextEvent] = this.timeline.nextEvent(time);

        if (prevEvent === null) {
            if (nextEvent === null) {
                // if (this.defaultTable !== undefined) {
                //     return this.defaultTable.ballPosition(this);
                // } else if (this.defaultJuggler?.default_table !== undefined) {
                //     return this.defaultJuggler.default_table.ballPosition(this);
                if (this.defaultJuggler?.defaultTable !== undefined) {
                    return this.defaultJuggler.defaultTable.ballPosition(this);
                } else {
                    return new THREE.Vector3(-100, -100, -100);
                    // this.throwTimelineError(prevEvent, nextEvent);
                }
            }
            if (nextEvent instanceof CatchEvent) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
            if (nextEvent instanceof ThrowEvent || nextEvent instanceof TablePutEvent) {
                return nextEvent.hand.position(time);
            }
            if (nextEvent instanceof TableTakeEvent) {
                return nextEvent.table.ballPosition(this);
            }
        }
        if (prevEvent instanceof CatchEvent) {
            if (
                nextEvent === null ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                return prevEvent.hand.position(time);
            }
            if (nextEvent instanceof CatchEvent || nextEvent instanceof TableTakeEvent) {
                this.throwTimelineError(prevEvent, nextEvent);
            } //Stop the looping if was set to loop.
        }
        if (prevEvent instanceof ThrowEvent) {
            if (nextEvent instanceof CatchEvent) {
                return ballPosition(
                    prevEvent.hand.positionAtEvent(prevEvent.handMultiEvent()),
                    prevEvent.time,
                    nextEvent.hand.positionAtEvent(nextEvent.handMultiEvent()),
                    nextEvent.time,
                    time
                );
            }
            if (nextEvent instanceof TablePutEvent) {
                return ballPosition(
                    prevEvent.hand.positionAtEvent(prevEvent.handMultiEvent()),
                    prevEvent.time,
                    nextEvent.table.ballPosition(this),
                    nextEvent.time,
                    time
                );
            }
            if (
                nextEvent === null ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TableTakeEvent
            ) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
        }
        if (prevEvent instanceof TablePutEvent) {
            if (nextEvent === null || nextEvent instanceof TableTakeEvent) {
                return prevEvent.table.ballPosition(this);
            }
            if (
                nextEvent instanceof CatchEvent ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
        }
        if (prevEvent instanceof TableTakeEvent) {
            if (
                nextEvent === null ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                return prevEvent.hand.position(time);
            }
            if (nextEvent instanceof CatchEvent || nextEvent instanceof TableTakeEvent) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
        }
        throw Error("Unimplemented behaviour");
    }

    velocityAtCatchTossEvent(event: CatchEvent | ThrowEvent): THREE.Vector3 {
        let prevEvent: BallTimelineEvent | null;
        let nextEvent: BallTimelineEvent | null;
        let isThrown: boolean;
        if (event instanceof CatchEvent) {
            prevEvent = event.prevBallEvent()[1];
            nextEvent = event;
            isThrown = false;
        } else {
            prevEvent = event;
            nextEvent = event.nextBallEvent()[1];
            isThrown = true;
        }
        //Validation of events ?
        if (
            prevEvent instanceof ThrowEvent &&
            (nextEvent instanceof CatchEvent || nextEvent instanceof TablePutEvent)
        ) {
            return ballVelocityAtStartEnd(
                this.positionAtEvent(prevEvent),
                prevEvent.time,
                this.positionAtEvent(nextEvent),
                nextEvent.time,
                isThrown
            );
        }
        throw Error("Unimplemented behaviour");
    }
}
