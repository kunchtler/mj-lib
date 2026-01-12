// // TODO : no more classes, just types, and one function to stringify them ???

// /**
//  * Basic interface for a juggling event. All juggling events interfaces extend it.
//  */
// export interface BaseEvent {
//     /**
//      * The time the event happens at in seconds.
//      */
//     time: number;
//     /**
//      * Represent the event in a human readible format (useful for debugging).
//      * @returns a pretty string.
//      */
//     stringify: () => string;
// }

// /**
//  * Interface for a sound event. TODO : Not really because it is a member of the events having sound. to change ?
//  */
// export interface EventSound {
//     /**
//      * The name of the sound to play.
//      */
//     name: string | string[];
//     /**
//      * Whether the sound should loop until the next event.
//      */
//     loop?: boolean;
// }

// /**
//  * Base interface for all events involving a ball.
//  */
// export interface BallEventInterface extends BaseEvent {
//     /**
//      * The ball the event references. TODO
//      */
//     ballID: string;
//     /**
//      * Verb charcterising the event (eg. tossed, caught, ...) to help with printing debug information.
//      */
//     actionDescription: string;
//     /**
//      * Whether the ball should emit some sound when that event happens.
//      */
//     sound?: EventSound;
// }

// /**
//  * Base interface for all events (both single and multi events) involving a hand.
//  */
// export interface HandEventInterface extends BaseEvent {
//     /**
//      * The unique name of the juggler's hand.
//      */
//     jugglerName: string;
//     /**
//      * Whether the hand is the right or the left hand.
//      */
//     isRightHand: boolean;
// }

// /**
//  * Base interface for all events involving a hand.
//  */
// export interface TableEventInterface extends BaseEvent {
//     /**
//      * The unique name of the table.
//      */
//     tableID: string;
//     /**
//      * The spot we're (possibly) interacting with.
//      */
//     spot: string | undefined;
// }

// export type AbstractEventParams = {
//     time: number;
// };

// export type AbstractBallEventParams = AbstractEventParams & {
//     ballID: string;
//     sound?: EventSound;
// };

// export type AbstractHandEventParams = AbstractEventParams & {
//     jugglerName: string;
//     isRightHand: boolean;
// };

// export type AbstractTableEventParams = AbstractEventParams & {
//     tableID: string;
//     spot: string | undefined;
// };

// export type AbstractBallHandEventParams = AbstractBallEventParams & AbstractHandEventParams;

// export type AbstractBallHandTableEventParams = AbstractBallEventParams &
//     AbstractHandEventParams &
//     AbstractTableEventParams;

// /**
//  * Class used to represent an event involving both a ball and a hand.
//  */
// export class AbstractBallHandEvent implements BallEventInterface, HandEventInterface {
//     ballID: string;
//     jugglerName: string;
//     isRightHand: boolean;
//     time: number;
//     sound?: EventSound;
//     readonly actionDescription: string = "unnamed attribute";

//     constructor({ time, sound, ballID, jugglerName, isRightHand }: AbstractBallHandEventParams) {
//         this.ballID = ballID;
//         this.jugglerName = jugglerName;
//         this.isRightHand = isRightHand;
//         this.time = time;
//         this.sound = typeof sound === "string" ? { name: sound } : sound;
//     }

//     stringify(): string {
//         const soundText =
//             this.sound === undefined
//                 ? ""
//                 : `emits ${this.sound.loop ? "looping " : ""}sound ${this.sound.name} `;
//         return `Ball ${this.ballID} ${this.actionDescription} by ${this.jugglerName}'s ${this.isRightHand ? "right" : "left"} hand ${soundText}(time: ${this.time}s).`;
//     }
// }

// /**
//  * Class used to represent an event involving a Hand.
//  */
// export class AbstractHandEvent implements HandEventInterface {
//     jugglerName: string;
//     isRightHand: boolean;
//     time: number;

//     constructor({ time, jugglerName, isRightHand }: AbstractHandEventParams) {
//         this.time = time;
//         this.jugglerName = jugglerName;
//         this.isRightHand = isRightHand;
//     }

//     stringify(): string {
//         return `Event with ${this.jugglerName}'s ${this.isRightHand ? "right" : "left"} hand (time: ${this.time}s).`;
//     }
// }

// /**
//  * Class used to represent an event involving a ball, a table and a hand.
//  */
// export class AbstractBallTableHandEvent
//     extends AbstractBallHandEvent
//     implements TableEventInterface
// {
//     /**
//      * The table the event involves.
//      */
//     tableID: string;
//     /**
//      * The optional spot the event involves.
//      */
//     spot: string | undefined;

//     constructor({
//         time,
//         ballID,
//         jugglerName,
//         isRightHand,
//         tableID,
//         spot,
//         sound
//     }: AbstractBallHandTableEventParams) {
//         super({ time, ballID, jugglerName, isRightHand, sound });
//         this.tableID = tableID;
//         this.spot = spot;
//     }
// }

// export type TossCatchEventParams = AbstractBallHandEventParams & {
//     siteswapHeight?: number;
//     handSubIdx: number;
// };

// export class TossCatchEvent extends AbstractBallHandEvent {
//     siteswapHeight?: number;
//     handSubIdx: number;

//     constructor({ siteswapHeight, handSubIdx, ...args }: TossCatchEventParams) {
//         super(args);
//         this.siteswapHeight = siteswapHeight;
//         this.handSubIdx = handSubIdx;
//     }
// }

// /**
//  * Event when a ball is tossed by a hand.
//  */
// export class TossEvent extends TossCatchEvent {
//     readonly actionDescription = "tossed";
// }

// /**
//  * Event when a ball is caught by a hand.
//  */
// export class CatchEvent extends TossCatchEvent {
//     readonly actionDescription = "caught";
// }

// /**
//  * Event when a ball is put on a table with a hand.
//  */
// export class TablePutEvent extends AbstractBallTableHandEvent {
//     readonly actionDescription = "put on table";
// }

// /**
//  * Event when a ball is taken from a table with a hand.
//  */
// // export class TableTakeEvent extends AbstractBallTableHandEvent {
// //     readonly actionDescription = "taken from table";
// // }

// export type HandMultiEventParams<T extends HandEventInterface> = AbstractHandEventParams & {
//     events?: T[];
// };

// /**
//  * Class that represents multiple hand events happening at the exact same time (for instance, catching multiple balls).
//  */
// export class HandMultiEvent<T extends HandEventInterface> extends AbstractHandEvent {
//     events: T[];
//     constructor({ time, events, jugglerName, isRightHand }: HandMultiEventParams<T>) {
//         super({ time, jugglerName, isRightHand });
//         this.events = events ?? [];
//     }
// }

// // export class HandMultiCatchThrowEvent extends HandMultiEvent<CatchEvent | ThrowEvent> {}
// // export class HandMultiTablePutTakeEvent extends HandMultiEvent<TablePutEvent | TableTakeEvent> {}
// // export type HandTimelineEvent = HandMultiCatchThrowEvent | HandMultiTablePutTakeEvent;
// // // Make it so balls are unique in events field in HandMultiCatchThrow, and in HandMultiTakePut.

// /** Union of all single-events that a hand can perform in the timeline. */
// export type HandTimelineSingleEvent = CatchEvent | TossEvent | TableTakeEvent | TablePutEvent;
// /** All multi-events that a hand can perform in the timeline. */
// export type HandTimelineEvent = HandMultiEvent<HandTimelineSingleEvent>;
// /** All events a that a ball can perform in the timeline. */
// export type BallTimelineEvent = CatchEvent | TossEvent | TablePutEvent | TableTakeEvent;

// export function isMultiEvent(
//     ev: HandTimelineEvent | HandTimelineSingleEvent
// ): ev is HandTimelineEvent {
//     return ev instanceof HandMultiEvent;
// }
