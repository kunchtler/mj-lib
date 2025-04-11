// Inspired from https://stackoverflow.com/questions/60343999/binary-search-in-typescript-vs-indexof-how-to-get-performance-properly

function trueBinarySearch<T>(
    sortedArray: T[],
    seekCondition: (elem: T) => number
): number | undefined {
    let startIndex = 0;
    let endIndex: number = sortedArray.length - 1;
    while (startIndex <= endIndex) {
        const mid = startIndex + ((endIndex - startIndex) >> 1);
        const guess = sortedArray[mid];
        const isFound = seekCondition(guess);
        if (isFound === 0) {
            return mid;
        } else if (isFound < 0) {
            endIndex = mid - 1;
        } else {
            startIndex = mid + 1;
        }
    }
    return undefined;
}

export function binarySearch<T>(
    sortedArray: T[],
    seekCondition: (elem: T) => number
): number | undefined {
    if (sortedArray.length < 2500) {
        const idx = sortedArray.find((elem) => seekCondition(elem) === 0);
        return idx === undefined ? null : idx;
    }
}

// function trueBinarySearch(sortedArray: number[], seekElement: number): number {
//     let startIndex = 0;
//     let endIndex: number = sortedArray.length - 1;
//     while (startIndex <= endIndex) {
//         const mid = startIndex + ((endIndex - startIndex) >> 1);
//         // const mid = startIndex + Math.floor((endIndex - startIndex) / 2);
//         const guess = sortedArray[mid];
//         if (guess === seekElement) {
//             return mid;
//         } else if (guess > seekElement) {
//             endIndex = mid - 1;
//         } else {
//             startIndex = mid + 1;
//         }
//     }

//     return -1;
// }
