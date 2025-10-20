import { PerformanceModel } from "./PerformanceModel";

// export type PerformanceRefParams = {
//     performance?: PerformanceModel;
// };

/**
 * Class inherited by all model classes contained within a performance.
 *
 * It manages an attribute to the performance (as a weak ref, to be garbage-collectable).
 */
export class PerformanceModelRef {
    private _performanceRef?: WeakRef<PerformanceModel>;

    constructor(performance?: PerformanceModel) {
        this.set(performance);
    }

    /**
     * The model of the performance this element is part of.
     */
    getSurely(): PerformanceModel {
        if (this._performanceRef === undefined) {
            throw ReferenceError("Performance is undefined.");
        }
        const obj = this._performanceRef.deref();
        if (obj === undefined) {
            throw ReferenceError("Performance is undefined.");
        }
        return obj;
    }

    get(): PerformanceModel | undefined {
        return this._performanceRef?.deref();
    }

    set(newPerformance: PerformanceModel | undefined) {
        if (newPerformance === undefined) {
            this._performanceRef = undefined;
        } else {
            this._performanceRef = new WeakRef(newPerformance);
        }
    }
}
