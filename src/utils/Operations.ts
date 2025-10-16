/**
 * Performs a XOR on two boolean values.
 * @param a a boolean.
 * @param b a boolean.
 * @returns a XOR b
 */

export function XOR(a: boolean, b: boolean): boolean {
    return a !== b;
}
/**
 * Pops a given index from the list.
 * @param arr the list.
 * @param index the index to remove.
 * @returns the value of the returned element if the index was in the list's bounds, undefined otherwise.
 */

export function popOneIndexFromArray<T>(arr: T[], index: number): T | undefined {
    const spliced = arr.splice(index, 1);
    return spliced.length === 0 ? undefined : spliced[0];
}

export function addAtIndexInArray<T>(arr: T[], index: number, elem: T): void {
    arr.splice(index, 0, elem);
}
//TODO : Check that works if events is empty.
//TODO : Rename "Events" => "Event" NO, CLASH WITH JS, BETTER NAME.
//TODO : Rename 'Tempo' => "unit value"
//TODO : Rename 'beats' => "states" ?
export function getFirstInsertedKey<T>(it: Set<T> | Map<T, unknown>): T | undefined {
    return it.keys().next().value;
}

export function getLastInsertedKey<T>(it: Set<T> | Map<T, unknown>): T | undefined {
    return it.size === 0 ? undefined : [...it.keys()][it.size - 1];
}

// export function isInRhythm(beat: Fraction, startBeat: Fraction, tempo: Fraction): boolean {
//     return beat.sub(startBeat).divisible(tempo);
// }
