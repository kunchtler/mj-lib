export type DeepRequired<T> = T extends readonly unknown[]
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T extends object
      ? { [K in keyof T]-?: DeepRequired<T[K]> }
      : T;

export type ElementOf<T> = T extends (infer U)[] ? U : never;

export type DeepPartial<T> = Partial<{
    [K in keyof T]: T[K] extends Partial<T[K]> ? T[K] : DeepPartial<T[K]>;
}>;

/**
 * Auxilary type for deepMergeStrict.
 * It allows to combine the types of two tuples, element per element,
 * without losing the typescript fact that the resulted tuple is still tuple.
 */
type MergeTuples<A, B> = A extends readonly []
    ? B
    : B extends readonly []
      ? A
      : A extends readonly [infer A0, ...infer ARest]
        ? B extends readonly [infer B0, ...infer BRest]
            ? [DeepFuse<A0, B0>, ...MergeTuples<ARest, BRest>]
            : never
        : never;

// TODO : Do shallow version, and have the deep version call the shallow one ?
// TODO : This version works with readonlys, but it erases them from the output.
/**
 * This type is scary, but don't be afraid. It functions as a type intersection, but it
 * tries to "fuse" object types.
 * For instance, combining types {x: number}[] and {y: string}[] yields
 * ({x: number} & {y: string})[] = {x: number; y: string}[]
 * (where it would normally yield ({x: number} | {y: string})[])
 * It does the same for tuples, sets, maps and of course arrays, and DOES
 * THAT RECUSRSIVELY, so more accurately :
 * DeepFuse<{x: number}[], {y: string}[]> = DeepFuse<{x: number}, {y: string}>[]
 */
export type DeepFuse<A, B> =
    // Combine Maps
    A extends Map<infer K1, infer V1>
        ? B extends Map<infer K2, infer V2>
            ? // Both A and B are maps, we comine their value types.
              Map<K1 & K2, DeepFuse<V1, V2>>
            : // A is a map but B is not.
              never
        : // Combine Sets
          A extends Set<infer V1>
          ? B extends Set<infer V2>
              ? // Both A and B are sets, we comine their key types.
                Set<DeepFuse<V1, V2>>
              : // A is a set but B is not.
                never
          : // Combine arrays or tuples.
            A extends readonly (infer Aitem)[]
            ? B extends readonly (infer Bitem)[]
                ? // Check if A and B are tuples or arrays.
                  number extends A["length"] // Is A an array ?
                    ? number extends B["length"] // A is an array. Is B an array ?
                        ? // Both A and B are arrays, combine the types of their elements.
                          DeepFuse<Aitem, Bitem>[]
                        : // A is an array but B is a tuple.
                          never
                    : number extends B["length"] // A is a tuple. Is B an array ?
                      ? // A is a tuple but B is an array.
                        never
                      : // Both A and B are tuples, we combine, per-element, their types.
                        MergeTuples<A, B>
                : // A is an array or tuple, but B is not.
                  never
            : // Combine objects.
              A extends object
              ? B extends object
                  ? {
                        //Look into keys that exist either in A or B
                        // If K is both a key of object A and B, we merge the objects.
                        // Else, we can normally return the object.
                        [K in keyof A | keyof B]: K extends keyof A
                            ? K extends keyof B
                                ? DeepFuse<A[K], B[K]>
                                : A[K]
                            : K extends keyof B
                              ? B[K]
                              : // This should never happen, has K is by definition
                                // either a key of A or B.
                                never;
                    }
                  : // A is an object but B is not.
                    never
              : // Combine types of A and B, which should be primitives.
                A & B;

// type Xobj = {x: number}
// type Yobj = {y: string}
// type Test0 = DeepFuse<Xobj, Yobj>;
// type Test1 = DeepFuse<Map<string, Xobj>, Map<string, Yobj>>;
// type Test2 = DeepFuse<Set<Xobj>, Set<Yobj>>
// type Test3 = DeepFuse<Xobj[], Yobj[]>
// type Test4 = DeepFuse<[Xobj, Yobj], [Yobj]>
// type Test5 = DeepFuse<[Xobj], []>
// type A = {
//     ballTemplates: {
//         name: string;
//     }[];
// };
// type Test3 = DeepFuse<A["ballTemplates"], A["ballTemplates"]>;

// const x: (readonly number[])[] = [
//     [1, 2, 3],
//     [4, 5]
// ];
// x.push([2, 3]);
// x[0].push(0);