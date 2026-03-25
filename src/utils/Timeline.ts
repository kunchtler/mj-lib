import { OrderedMap, OrderedMapIterator } from "js-sdsl";
import { initContainer } from "js-sdsl/dist/esm/container/ContainerBase";

//TODO : Methods to create / modify / delete events without interacting with OrderedMap directly ?

/**
 * Generic timeline class. Allows a single event to exist at different times.
 * Internally, uses js-sdsl OrderedMap class to keep elements ordered as they are added.
 */
export class Timeline<TimeType, EventType> extends OrderedMap<TimeType, EventType> {
    constructor({
        container,
        cmpTime,
        enableIndex
    }: {
        container?: initContainer<[TimeType, EventType]>;
        cmpTime?: (x: TimeType, y: TimeType) => number;
        enableIndex?: boolean;
    } = {}) {
        super(container, cmpTime, enableIndex);
    }

    /**
     * Get the closest event before a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is < or <= than the time we're looking for.
     * Defaults to <.
     * @returns
     * - [null, null] if no event is after the target time.
     * - [time, event] otherwise.
     */
    prevEvent(time: TimeType, strict = false): [TimeType, EventType] | [null, null] {
        const it = strict ? this.reverseUpperBound(time) : this.reverseLowerBound(time);
        //We make a copy of the contents of the list because the list itself
        //is a proxy otherwise (which has unfridenly console.logs).
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    prevEventIt(time: TimeType, strict = false): OrderedMapIterator<TimeType, EventType> {
        return strict ? this.reverseUpperBound(time) : this.reverseLowerBound(time);
    }

    /**
     * Get the closest event after a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is > or >= than the time we're looking for.
     * Defaults to >=.
     * @returns
     * - [null, null] if no event is before the target time.
     * - [time, event] otherwise.
     */
    nextEvent(time: TimeType, strict = true): [TimeType, EventType] | [null, null] {
        const it = strict ? this.upperBound(time) : this.lowerBound(time);
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    nextEventIt(time: TimeType, strict = true): OrderedMapIterator<TimeType, EventType> {
        return strict ? this.upperBound(time) : this.lowerBound(time);
    }

    /**
     * Add an event in the timeline
     * @param time the time of the event.
     * @param ev the event to add.
     */
    addEvent(time: TimeType, ev: EventType): void {
        this.setElement(time, ev);
    }

    /**
     * Remove an event from the timeline.
     * @param time the time of the event.
     * @return whether there was something to delete at that time.
     */
    deleteEvent(time: TimeType): boolean {
        return this.eraseElementByKey(time);
    }

    /**
     * Get the bounds (first and last event) of the timeline.
     * @returns
     * - [null, null] if no event is in the timeline.
     * - [startTime, endTime] otherwise.
     */
    timeBounds(): [TimeType, TimeType] | [null, null] {
        const itBegin = this.begin();
        const itEnd = this.rBegin();
        if (!itBegin.isAccessible()) {
            // We can access the beginning if and only if we can access the end.
            return [null, null];
        }
        return [itBegin.pointer[0], itEnd.pointer[0]];
    }

    /**
     * Transforms an orderedMap into a sorted array.
     * @returns a sorted array where each element is a 2-tuple [time, event].
     */
    toArray(): [TimeType, EventType][] {
        const arr: [TimeType, EventType][] = [];
        for (const [time, ev] of this) {
            arr.push([time, ev]);
        }
        return arr;
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @param stringifyTime an optional function to stringify the time.
     * @param stringifyEvent an optional function to stringify the events.
     * @returns a string.
     */
    stringify(
        stringifyTime?: (key: TimeType) => string,
        stringifyEvent?: (elem: EventType) => string
    ) {
        let text = "";
        this.forEach(([time, event]) => {
            text += `${stringifyTime === undefined ? time : stringifyTime(time)} : ${stringifyEvent === undefined ? event : stringifyEvent(event)}\n`;
        });
        // Remove last \n character.
        text = text.slice(0, -1);
        return text;
    }
}

/**
 * Generic timeline class. Allows multiple events to exist at different times.
 * Internally, uses js-sdsl OrderedMap class to keep elements ordered as they are added.
 */
export class MultiTimeline<TimeType, EventType> extends OrderedMap<TimeType, EventType[]> {
    /**
     * Flags whether times with 0 events should be deleted or not.
     */
    autoRemoveEmptyEvents: boolean;
    /**
     * Function to compare to events (used to find a single event at a given time).
     */
    cmpEvent: (x: EventType, y: EventType) => boolean;

    constructor({
        container,
        cmpTime,
        cmpEvent,
        enableIndex,
        autoRemoveEmptyEvents
    }: {
        container?: initContainer<[TimeType, EventType[]]>;
        cmpTime?: (x: TimeType, y: TimeType) => number;
        cmpEvent?: (x: EventType, y: EventType) => boolean;
        enableIndex?: boolean;
        autoRemoveEmptyEvents?: boolean;
    } = {}) {
        super(container, cmpTime, enableIndex);
        this.autoRemoveEmptyEvents = autoRemoveEmptyEvents ?? true;
        this.cmpEvent = cmpEvent ?? ((x: EventType, y: EventType) => x === y);
    }

    /**
     * Get the closest event before a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is < or <= than the time we're looking for.
     * Defaults to <.
     * @returns
     * - [null, null] if no event is after the target time.
     * - [time, event] otherwise.
     */
    prevEvent(time: TimeType, strict = false): [TimeType, EventType[]] | [null, null] {
        const it = strict ? this.reverseUpperBound(time) : this.reverseLowerBound(time);
        //We make a copy of the contents of the list because the list itself
        //is a proxy otherwise (which has unfridenly console.logs).
        const timesToRemove: TimeType[] = [];
        while (it.isAccessible() && it.pointer[1].length === 0) {
            // Tag the element as being empty.
            timesToRemove.push(time);
            // Look at the previous element.
            it.pre();
        }
        // We store the returned value as we will now delete elements.
        const returnValue: [TimeType, EventType[]] | [null, null] = it.isAccessible()
            ? [...it.pointer]
            : [null, null];
        if (this.autoRemoveEmptyEvents) {
            for (const time of timesToRemove) {
                this.eraseElementByKey(time);
            }
        }
        return returnValue;
    }

    /**
     * Get the closest event after a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is > or >= than the time we're looking for.
     * Defaults to >=.
     * @returns
     * - [null, null] if no event is before the target time.
     * - [time, event] otherwise.
     */
    nextEvent(time: TimeType, strict = true): [TimeType, EventType[]] | [null, null] {
        const it = strict ? this.upperBound(time) : this.lowerBound(time);
        //We make a copy of the contents of the list because the list itself
        //is a proxy otherwise (which has unfridenly console.logs).
        const timesToRemove: TimeType[] = [];
        while (it.isAccessible() && it.pointer[1].length === 0) {
            // Tag the element as being empty.
            timesToRemove.push(time);
            // Look at the next element.
            it.next();
        }
        // We store the returned value as we will now delete elements.
        const returnValue: [TimeType, EventType[]] | [null, null] = it.isAccessible()
            ? [...it.pointer]
            : [null, null];
        if (this.autoRemoveEmptyEvents) {
            for (const time of timesToRemove) {
                this.eraseElementByKey(time);
            }
        }
        return returnValue;
    }

    /**
     * Add an event to the timeline.
     * @param time the time of the event.
     * @param singleEv the event to add.
     */
    addEvent(time: TimeType, singleEv: EventType): void {
        const it = this.find(time);
        if (!it.isAccessible()) {
            // The multi-event doesn't exist.
            this.setElement(time, [singleEv]);
        } else {
            // The multi-event exists.
            it.pointer[1].push(singleEv);
        }
    }

    /**
     * Remove an event from the timeline.
     * @param time the time of the event.
     * @param singleEv If specified, the event to remove. Else, all events at that time.
     * @return whether the element to delete was found or not in the first place.
     */
    deleteEvent(time: TimeType, singleEv?: EventType): boolean {
        const it = this.find(time);
        if (!it.isAccessible()) {
            return false;
        }
        if (singleEv === undefined) {
            if (this.autoRemoveEmptyEvents) {
                this.eraseElementByKey(time);
            } else {
                this.setElement(time, []);
            }
        } else {
            const idx = it.pointer[1].findIndex((ev) => this.cmpEvent(ev, singleEv));
            if (idx === -1) {
                return false;
            }
            if (this.autoRemoveEmptyEvents && it.pointer[1].length === 1) {
                this.eraseElementByKey(time);
            } else {
                it.pointer[1].splice(idx, 1);
            }
        }
        return true;
    }

    /**
     * Get the bounds (first and last event) of the timeline.
     * @returns
     * - [null, null] if no event is in the timeline.
     * - [startTime, endTime] otherwise.
     */
    timeBounds(): [TimeType, TimeType] | [null, null] {
        const itBegin = this.begin();
        const itEnd = this.rBegin();
        if (!itBegin.isAccessible()) {
            // We can access the beginning if and only if we can access the end.
            return [null, null];
        }
        return [itBegin.pointer[0], itEnd.pointer[0]];
    }

    /**
     * Transforms an orderedMap into a sorted array.
     * @returns a sorted array where each element is a 2-tuple [time, event[]]].
     */
    toArray(): [TimeType, EventType[]][] {
        const arr: [TimeType, EventType[]][] = [];
        for (const [time, ev] of this) {
            arr.push([time, ev]);
        }
        return arr;
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @param stringifyTime an optional function to stringify the time.
     * @param stringifyEvent an optional function to stringify the events.
     * @returns a string.
     */
    stringify(
        stringifyTime?: (key: TimeType) => string,
        stringifyEvent?: (elem: EventType) => string
    ) {
        let text = "";
        for (const [time, events] of this) {
            text += `${stringifyTime === undefined ? time : stringifyTime(time)} : [`;
            for (const ev of events) {
                text += `${stringifyEvent === undefined ? ev : stringifyEvent(ev)}, `;
            }
            // Remove the last ", " characters.
            text = text.slice(0, -2);
            text += "]\n";
        }
        // Remove last \n character.
        text = text.slice(0, -1);
        return text;
    }
}
