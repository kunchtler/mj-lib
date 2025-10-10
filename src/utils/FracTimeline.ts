import Fraction from "fraction.js";
import { Timeline } from "./Timeline";
import { initContainer } from "js-sdsl/dist/esm/container/ContainerBase";

export class FracTimeline<EventType> extends Timeline<Fraction, EventType> {
    private static _cmp = (a: Fraction, b: Fraction) => a.compare(b);
    private static _stringify = (a: Fraction) => a.toString();

    constructor(container?: initContainer<[Fraction, EventType]>, enableIndex?: boolean) {
        super(container, FracTimeline._cmp, enableIndex);
    }

    stringify(
        stringifyTime = FracTimeline._stringify,
        stringifyEvent?: (elem: EventType) => string
    ): string {
        return super.stringify(stringifyTime, stringifyEvent);
    }
}
