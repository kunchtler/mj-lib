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
    // Check for type unions. If both unions are different, don't go further.
    // Combine Maps
    A extends Map<infer K1, infer V1>
        ? B extends Map<K1, infer V2>
            ? // Both A and B are maps with the same key type, we combine their value types.
              Map<K1, DeepFuse<V1, V2>>
            : never
        : // Combine Sets
          A extends Set<infer V1>
          ? B extends Set<infer V2>
              ? // Both A and B are sets, we comine their key types.
                Set<DeepFuse<V1, V2>>
              : never
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
                  ? // Create object from the keys of both A and B.
                    SimplifyView<
                        {
                            // If a key if both optional in A and optional in B, make it optional.
                            [K in KeysOptionalInBoth<A, B>]?: DeepFuse<A[K], B[K]>;
                        } & {
                            // If a key is both in A and B, but not optional in both, it is required.
                            [K in Exclude<KeysInBoth<A, B>, KeysOptionalInBoth<A, B>>]: DeepFuse<
                                A[K],
                                B[K]
                            >;
                        } & {
                            // If a key is optional and only in A.
                            [K in Exclude<OptionalKeysOf<A>, keyof B>]?: A[K];
                        } & {
                            // If a key is optional and only in B.
                            [K in Exclude<OptionalKeysOf<B>, keyof A>]?: B[K];
                        } & {
                            // If a key is required and only in A.
                            [K in Exclude<RequiredKeysOf<A>, keyof B>]: A[K];
                        } & {
                            // If a key is required and only in B.
                            [K in Exclude<RequiredKeysOf<B>, keyof A>]: B[K];
                        }
                    >
                  : // A is an object but B is not.
                    never
              : // A and B should be primitives. Combine them only if they match exactly.
                A & B;

type OptionalKeysOf<Obj> = keyof {
    [Key in keyof Obj as Omit<Obj, Key> extends Obj ? Key : never]: Obj[Key];
};

type RequiredKeysOf<Obj> = Exclude<keyof Obj, OptionalKeysOf<Obj>>;

type KeysOptionalInBoth<A, B> = Extract<OptionalKeysOf<A>, OptionalKeysOf<B>>;

type KeysInBoth<A, B> = Extract<keyof A, keyof B>;

// Used so VSCode's tooltip on hover will not display "A & B", but its actual result.
type SimplifyView<T> = {
    [K in keyof T]: T[K];
} & {};

// type Test = SimplifyView<
//     DeepFuse<
//         { x1?: string; x2?: number; x3?: string; x5: string },
//         { x1?: string; x2: number; x4?: number; x6: number }
//     >
// >;
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
