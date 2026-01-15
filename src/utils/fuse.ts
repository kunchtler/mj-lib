import { DeepFuse } from "./utilityTypes";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    isObject(v) && v.constructor === Object;

function deepFuse<A, B>(elem1: A, elem2: B): DeepFuse<A, B> {
    // ─── MAP ───────────────────────────────
    if (elem1 instanceof Map && elem2 instanceof Map) {
        const result = new Map();
        // First add all key value pairs of elem1.
        // If the key exists in elem2, fuse the values.
        for (const [key1, val1] of elem1) {
            if (key1 in elem2) {
                result.set(key1, deepFuse(val1, elem2.get(key1)));
            } else {
                result.set(key1, val1);
            }
        }
        // Then add all keys of elem2 not in elem1.
        for (const [key2, val2] of elem2) {
            if (!elem1.has(key2)) {
                result.set(key2, val2);
            }
        }
        return result as DeepMergeStrict<A, B>;
    }

    // ─── SET ───────────────────────────────
    if (elem1 instanceof Set && elem2 instanceof Set) {
        const result = new Set(elem1);
        for (const bVal of elem2) {
            result.add(bVal);
        }
        return result as DeepMergeStrict<A, B>;
    }

    // ─── ARRAY (includes tuples) ───────────
    if (Array.isArray(elem1) && Array.isArray(elem2)) {
        const length = Math.min(elem1.length, elem2.length);
        const result = elem1.slice() as unknown[];

        for (let i = 0; i < length; i++) {
            result[i] = deepFuse(elem1[i], elem2[i]);
        }

        return result as DeepMergeStrict<A, B>;
    }

    // ─── OBJECT ────────────────────────────
    if (isPlainObject(elem1) && isPlainObject(elem2)) {
        const result: Record<string, unknown> = { ...elem1 };

        for (const key of Object.keys(elem2)) {
            if (key in result) {
                result[key] = deepFuse(result[key], (elem2 as Record<string, unknown>)[key]);
            } else {
                result[key] = (elem2 as Record<string, unknown>)[key];
            }
        }

        return result as DeepMergeStrict<A, B>;
    }

    // ─── FALLBACK ──────────────────────────
    return elem1 as DeepMergeStrict<A, B>;
}
