export function setIntersection<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const interSet = new Set<T>();
    const smallSet = set1.size < set2.size ? set1 : set2;
    const bigSet = set1.size < set2.size ? set2 : set1;
    for (const elem of smallSet) {
        if (bigSet.has(elem)) {
            interSet.add(elem);
        }
    }
    return interSet;
}

export function setDifference<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const diffSet = new Set<T>();
    for (const elem of set1) {
        if (!set2.has(elem)) {
            diffSet.add(elem);
        }
    }
    return diffSet;
}

export function setUnion<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    return new Set<T>([...set1, ...set2]);
}

export function setSymmetricDifference<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    return setUnion(setDifference(set1, set2), setDifference(set2, set1));
}
