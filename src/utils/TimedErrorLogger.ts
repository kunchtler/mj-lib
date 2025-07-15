import Fraction from "fraction.js";

/**
 * The 4 different supported severity types.
 */
export type Severity = "Log" | "Warn" | "Error" | "CriticalError";

/**
 * Information needed to log an error.
 */
export type ErrorLog<TimeType = number> = {
    /**
     * The severity of the error.
     */
    severity: Severity;
    /**
     * A message describing the error.
     */
    message: string;
    /**
     * The time the error happened at.
     */
    time?: TimeType;
};

/**
 * Class to log errors, with additional custom time information.
 * Mainly used to handle errors related to working with juggling patterns.
 *
 * When logging an error, it can have 4 severity types :
 * - Log : non critical or debug information.
 * - Warn : a warning that is non critical.
 * - Error : an error.
 * - CriticalError : for when things go ham.
 */
export class TimedErrorLogger<TimeType = number> {
    /**
     * Array storing the errors logged until now.
     */
    logs: ErrorLog<TimeType>[];
    /**
     * A function to compare two times. If the first element is greater than the second, the function returns a number >0. If it is smaller, it returns a number <0. If they are equal, it returns 0.
     */
    compareFn: (t1: TimeType, t2: TimeType) => number;

    /**
     * Create a TimedErrorLogger.
     * @param compareFn A function to compare two times. If the first element is greater than the second, the function returns a number >0. If it is smaller, it returns a number <0. If they are equal, it returns 0.
     */
    constructor(compareFn: (t1: TimeType, t2: TimeType) => number) {
        this.logs = [];
        this.compareFn = compareFn;
    }

    /**
     * Log an error.
     * @param error the error to log.
     */
    logError(error: ErrorLog<TimeType>): void {
        this.logs.push(error);
    }

    /**
     * Indicated if a critical error has happened (which usually means
     * you've logged an error that requires stopping whatever was happening).
     * @returns whether a critical error has occured or not.
     */
    hasCriticalError(): boolean {
        for (const { severity } of this.logs) {
            if (severity === "CriticalError") {
                return true;
            }
        }
        return false;
    }

    /**
     * Split and sort errors.
     * @returns An object containing two attributes :
     * - timelessErrors is an array of all errors having no time information.
     * - sortedErrors is a sorted array in the form : [time, errors[]], which gathers all errors happening at the same time.
     */
    sortErrors(): {
        timelessErrors: ErrorLog<TimeType>[];
        sortedErrors: [TimeType, ErrorLog<TimeType>[]][];
    } {
        // Split errors that have an associated time, and those that do not.
        const timedErrors: ErrorLog<TimeType>[] = [];
        const timelessErrors: ErrorLog<TimeType>[] = [];
        for (const error of this.logs) {
            if (error.time === undefined) {
                timelessErrors.push(error);
            } else {
                timedErrors.push(error);
            }
        }

        // For errors with associated time, sort and group them.
        timedErrors.sort((a, b) => this.compareFn(a.time!, b.time!));
        const sortedErrors: [TimeType, ErrorLog<TimeType>[]][] = [];
        for (const error of timedErrors) {
            if (
                sortedErrors.length === 0 ||
                this.compareFn(sortedErrors[sortedErrors.length - 1][0], error.time!) < 0
            ) {
                sortedErrors.push([error.time!, [error]]);
            } else {
                sortedErrors[sortedErrors.length - 1][1].push(error);
            }
        }
        return { timelessErrors, sortedErrors };
    }

    /**
     *
     * @param stringifyTime
     */
    printErrorsInConsole(stringifyTime?: (t: TimeType) => string): void {
        const { timelessErrors, sortedErrors } = this.sortErrors();

        // First print the error with no time information.
        for (const { severity, message } of timelessErrors) {
            const text = message;
            if (severity === "Log") {
                console.log(text);
            } else if (severity === "Warn") {
                console.warn(text);
            } else {
                console.error(text);
            }
        }

        // Then print the errors with time information, sorted.
        for (const [time, errors] of sortedErrors) {
            for (const { severity, message } of errors) {
                const timeText = stringifyTime === undefined ? `${time}` : stringifyTime(time);
                const text = `Time ${timeText}:\n\t${message}`;
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

    /**
     * Reset the error logger.
     */
    reset(): void {
        this.logs = [];
    }
}

export class FracTimedErrorLogger extends TimedErrorLogger<Fraction> {
    constructor() {
        super((t1, t2) => t1.compare(t2));
    }
}
