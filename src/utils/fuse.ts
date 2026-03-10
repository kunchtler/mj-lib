import { setDifference, setIntersection } from "./SetOperations";
import { DeepFuse } from "./utilityTypes";

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && v.constructor === Object;
}

// TODO : Document.
// This function follows the type as described in ./utilityTypes.
export function deepFuse<A, B>(a: A, b: B): DeepFuse<A, B> {
    if (a instanceof Map && b instanceof Map) {
        throw Error("Maps not implemented.");
        // const result = new Map();
        // // First add all key value pairs of elem1.
        // // If the key exists in elem2, fuse the values.
        // for (const [key1, val1] of a) {
        //     if (key1 in b) {
        //         result.set(key1, deepFuse(val1, b.get(key1)));
        //     } else {
        //         result.set(key1, val1);
        //     }
        // }
        // // Then add all keys of elem2 not in elem1.
        // for (const [key2, val2] of b) {
        //     if (!a.has(key2)) {
        //         result.set(key2, val2);
        //     }
        // }
        // return result as DeepMergeStrict<A, B>;
    }

    // ─── SET ───────────────────────────────
    if (a instanceof Set && b instanceof Set) {
        throw Error("Sets not implemented.");
        // const result = new Set(a);
        // for (const bVal of b) {
        //     result.add(bVal);
        // }
        // return result as DeepMergeStrict<A, B>;
    }

    // ─── ARRAY (includes tuples) ───────────
    if (Array.isArray(a) && Array.isArray(b)) {
        const result: unknown[] = [];

        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            if (i < a.length) {
                if (i < b.length) {
                    result[i] = deepFuse(a[i], b[i]);
                } else {
                    result[i] = a[i];
                }
            } else {
                result[i] = b[i];
            }
        }

        return result as DeepFuse<A, B>;
    }

    // ─── OBJECT ────────────────────────────
    if (isPlainObject(a) && isPlainObject(b)) {
        const result: Record<string, unknown> = {};
        const aKeys = new Set<string>(Object.keys(a));
        const bKeys = new Set<string>(Object.keys(b));

        for (const key of setIntersection(aKeys, bKeys)) {
            result[key] = deepFuse(a[key], b[key]);
        }
        for (const key of setDifference(aKeys, bKeys)) {
            result[key] = a[key];
        }
        for (const key of setDifference(bKeys, aKeys)) {
            result[key] = b[key];
        }

        return result as DeepFuse<A, B>;
    }

    if (
        (typeof a === "number" && typeof b === "number" && (a as number) === (b as number)) ||
        (typeof a === "boolean" && typeof b === "boolean" && (a as boolean) === (b as boolean)) ||
        (typeof a === "string" && typeof b === "string" && (a as string) === (b as string)) ||
        (typeof a === "bigint" && typeof b === "bigint" && (a as bigint) === (b as bigint)) ||
        (typeof a === "undefined" && typeof b === "undefined") ||
        (a === null && b === null)
    ) {
        return a as DeepFuse<A, B>;
    }

    throw Error("Not implemented.");
}
