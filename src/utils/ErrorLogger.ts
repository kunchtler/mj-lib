import Fraction from "fraction.js";
import { FracTimeline } from "../inference/Scheduler";

export type Severity = "Log" | "Warn" | "Error" | "CriticalError";
export type ErrorLog = [Severity, string];

export class TimedErrorLogger {
    timeline = new FracTimeline<ErrorLog[]>();
    failedCritically = false;

    constructor() {
        this.reset();
    }

    addError(time: Fraction, severity: Severity, message: string): void {
        if (severity === "CriticalError") {
            this.failedCritically = true;
        }
        const error: ErrorLog = [severity, message];
        const it = this.timeline.find(time);
        if (!it.isAccessible()) {
            this.timeline.setElement(time, [error]);
        } else {
            it.pointer[1].push(error);
        }
    }

    sortErrors(): [Fraction, ErrorLog[]][] {
        const sortedErrors: [Fraction, ErrorLog[]][] = [];
        for (const elem of this.timeline) {
            sortedErrors.push(elem);
        }
        return sortedErrors;
    }

    logErrors(): void {
        for (const [time, errors] of this.timeline) {
            for (const [severity, message] of errors) {
                const text = `Time ${time.toString()}:\n\t${message}`;
                if (severity === "Log") {
                    console.log(text);
                } else if (severity === "Warn") {
                    console.warn(text);
                } else {
                    console.error(text);
                }
            }
        }
    }

    reset(): void {
        this.timeline.clear();
        this.failedCritically = false;
    }
}
