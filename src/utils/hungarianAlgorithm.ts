// From : https://github.com/addaleax/munkres-js/
// TODO : proper licensing.
// Code updates from the original version :
// - Inclusion of typescript
// - Modernization of the code (written with classes ...)

/**
 * Introduction
 * ============
 *
 * The Munkres module provides an implementation of the Munkres algorithm
 * (also called the Hungarian algorithm or the Kuhn-Munkres algorithm),
 * useful for solving the Assignment Problem.
 *
 * Assignment Problem
 * ==================
 *
 * Let C be an n×n-matrix representing the costs of each of n workers
 * to perform any of n jobs. The assignment problem is to assign jobs to
 * workers in a way that minimizes the total cost. Since each worker can perform
 * only one job and each job can be assigned to only one worker the assignments
 * represent an independent set of the matrix C.
 *
 * One way to generate the optimal set is to create all permutations of
 * the indices necessary to traverse the matrix so that no row and column
 * are used more than once. For instance, given this matrix (expressed in
 * Python)
 *
 *  matrix = [[5, 9, 1],
 *        [10, 3, 2],
 *        [8, 7, 4]]
 *
 * You could use this code to generate the traversal indices::
 *
 *  def permute(a, results):
 *    if len(a) == 1:
 *      results.insert(len(results), a)
 *
 *    else:
 *      for i in range(0, len(a)):
 *        element = a[i]
 *        a_copy = [a[j] for j in range(0, len(a)) if j != i]
 *        subresults = []
 *        permute(a_copy, subresults)
 *        for subresult in subresults:
 *          result = [element] + subresult
 *          results.insert(len(results), result)
 *
 *  results = []
 *  permute(range(len(matrix)), results) # [0, 1, 2] for a 3x3 matrix
 *
 * After the call to permute(), the results matrix would look like this::
 *
 *  [[0, 1, 2],
 *   [0, 2, 1],
 *   [1, 0, 2],
 *   [1, 2, 0],
 *   [2, 0, 1],
 *   [2, 1, 0]]
 *
 * You could then use that index matrix to loop over the original cost matrix
 * and calculate the smallest cost of the combinations
 *
 *  n = len(matrix)
 *  minval = sys.maxsize
 *  for row in range(n):
 *    cost = 0
 *    for col in range(n):
 *      cost += matrix[row][col]
 *    minval = min(cost, minval)
 *
 *  print minval
 *
 * While this approach works fine for small matrices, it does not scale. It
 * executes in O(n!) time: Calculating the permutations for an n×x-matrix
 * requires n! operations. For a 12×12 matrix, that's 479,001,600
 * traversals. Even if you could manage to perform each traversal in just one
 * millisecond, it would still take more than 133 hours to perform the entire
 * traversal. A 20×20 matrix would take 2,432,902,008,176,640,000 operations. At
 * an optimistic millisecond per operation, that's more than 77 million years.
 *
 * The Munkres algorithm runs in O(n³) time, rather than O(n!). This
 * package provides an implementation of that algorithm.
 *
 * This version is based on
 * http://csclab.murraystate.edu/~bob.pilgrim/445/munkres.html
 *
 * This version was originally written for Python by Brian Clapper from the
 * algorithm at the above web site (The ``Algorithm::Munkres`` Perl version,
 * in CPAN, was clearly adapted from the same web site.) and ported to
 * JavaScript by Anna Henningsen (addaleax).
 *
 * Usage
 * =====
 *
 * Construct a Munkres object
 *
 *  var m = new Munkres();
 *
 * Then use it to compute the lowest cost assignment from a cost matrix. Here's
 * a sample program
 *
 *  var matrix = [[5, 9, 1],
 *           [10, 3, 2],
 *           [8, 7, 4]];
 *  var m = new Munkres();
 *  var indices = m.compute(matrix);
 *  console.log(format_matrix(matrix), 'Lowest cost through this matrix:');
 *  var total = 0;
 *  for (var i = 0; i < indices.length; ++i) {
 *    var row = indices[l][0], col = indices[l][1];
 *    var value = matrix[row][col];
 *    total += value;
 *
 *    console.log('(' + rol + ', ' + col + ') -> ' + value);
 *  }
 *
 *  console.log('total cost:', total);
 *
 * Running that program produces::
 *
 *  Lowest cost through this matrix:
 *  [5, 9, 1]
 *  [10, 3, 2]
 *  [8, 7, 4]
 *  (0, 0) -> 5
 *  (1, 1) -> 3
 *  (2, 2) -> 4
 *  total cost: 12
 *
 * The instantiated Munkres object can be used multiple times on different
 * matrices.
 *
 * Non-square Cost Matrices
 * ========================
 *
 * The Munkres algorithm assumes that the cost matrix is square. However, it's
 * possible to use a rectangular matrix if you first pad it with 0 values to make
 * it square. This module automatically pads rectangular cost matrices to make
 * them square.
 *
 * Notes:
 *
 * - The module operates on a *copy* of the caller's matrix, so any padding will
 *   not be seen by the caller.
 * - The cost matrix must be rectangular or square. An irregular matrix will
 *   *not* work.
 *
 * Calculating Profit, Rather than Cost
 * ====================================
 *
 * The cost matrix is just that: A cost matrix. The Munkres algorithm finds
 * the combination of elements (one from each row and column) that results in
 * the smallest cost. It's also possible to use the algorithm to maximize
 * profit. To do that, however, you have to convert your profit matrix to a
 * cost matrix. The simplest way to do that is to subtract all elements from a
 * large value.
 *
 * The ``munkres`` module provides a convenience method for creating a cost
 * matrix from a profit matrix, i.e. make_cost_matrix.
 *
 * References
 * ==========
 *
 * 1. http://www.public.iastate.edu/~ddoty/HungarianAlgorithm.html
 *
 * 2. Harold W. Kuhn. The Hungarian Method for the assignment problem.
 *    *Naval Research Logistics Quarterly*, 2:83-97, 1955.
 *
 * 3. Harold W. Kuhn. Variants of the Hungarian method for assignment
 *    problems. *Naval Research Logistics Quarterly*, 3: 253-258, 1956.
 *
 * 4. Munkres, J. Algorithms for the Assignment and Transportation Problems.
 *    *Journal of the Society of Industrial and Applied Mathematics*,
 *    5(1):32-38, March, 1957.
 *
 * 5. https://en.wikipedia.org/wiki/Hungarian_algorithm
 *
 * Copyright and License
 * =====================
 *
 * Copyright 2008-2016 Brian M. Clapper
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A very large numerical value which can be used like an integer
 * (i.e., adding integers of similar size does not result in overflow).
 */
const MAX_SIZE: number = Number.MAX_SAFE_INTEGER / 2;

/**
 * A default value to pad the cost matrix with if it is not a square matrix.
 */
const DEFAULT_PAD_VALUE: number = 0;

export class Munkres {
    private C: number[][] = [];
    private row_covered: boolean[] = [];
    private col_covered: boolean[] = [];
    private n: number = 0;
    private Z0_r: number = 0;
    private Z0_c: number = 0;
    private marked: number[][] = [];
    private path: number[][] = [];

    private pad_matrix(matrix: number[][], pad_value: number = DEFAULT_PAD_VALUE): number[][] {
        let max_columns = 0;
        let total_rows = matrix.length;

        for (let i = 0; i < total_rows; ++i) {
            if (matrix[i].length > max_columns) {
                max_columns = matrix[i].length;
            }
        }

        total_rows = Math.max(max_columns, total_rows);

        const new_matrix: number[][] = [];

        for (let i = 0; i < total_rows; ++i) {
            const row = matrix[i] || [];
            const new_row = [...row];

            // If this row is too short, pad it
            while (new_row.length < total_rows) {
                new_row.push(pad_value);
            }

            new_matrix.push(new_row);
        }

        return new_matrix;
    }

    compute(cost_matrix: number[][], options: { padValue?: number } = {}): [number, number][] {
        const padValue = options.padValue ?? DEFAULT_PAD_VALUE;

        this.C = this.pad_matrix(cost_matrix, padValue);
        this.n = this.C.length;
        const original_length = cost_matrix.length;
        const original_width = cost_matrix[0].length;

        this.row_covered = Array<boolean>(this.n).fill(false);
        this.col_covered = Array<boolean>(this.n).fill(false);

        this.path = this.make_matrix(this.n * 2, 0);
        this.marked = this.make_matrix(this.n, 0);

        let step = 1;

        const steps: Record<number, () => number> = {
            1: this.step1.bind(this),
            2: this.step2.bind(this),
            3: this.step3.bind(this),
            4: this.step4.bind(this),
            5: this.step5.bind(this),
            6: this.step6.bind(this)
        };

        while (true) {
            if (step > 6) {
                break;
            }
            const func = steps[step];
            step = func();
        }

        const results: [number, number][] = [];
        for (let i = 0; i < original_length; ++i) {
            for (let j = 0; j < original_width; ++j) {
                if (this.marked[i][j] === 1) {
                    results.push([i, j]);
                }
            }
        }

        return results;
    }

    private make_matrix(n: number, val: number): number[][] {
        const matrix: number[][] = [];
        for (let i = 0; i < n; i++) {
            const row: number[] = [];
            for (let j = 0; j < n; j++) {
                row.push(val);
            }
            matrix.push(row);
        }
        return matrix;
    }

    private step1(): number {
        for (let i = 0; i < this.n; ++i) {
            let minval = this.C[i][0];
            for (let j = 1; j < this.n; ++j) {
                if (this.C[i][j] < minval) minval = this.C[i][j];
            }
            for (let j = 0; j < this.n; ++j) {
                this.C[i][j] -= minval;
            }
        }
        return 2;
    }

    private step2(): number {
        for (let i = 0; i < this.n; ++i) {
            for (let j = 0; j < this.n; ++j) {
                if (this.C[i][j] === 0 && !this.col_covered[j] && !this.row_covered[i]) {
                    this.marked[i][j] = 1;
                    this.col_covered[j] = true;
                    this.row_covered[i] = true;
                    break;
                }
            }
        }

        this.clear_covers();
        return 3;
    }

    private step3(): number {
        let count = 0;

        for (let i = 0; i < this.n; ++i) {
            for (let j = 0; j < this.n; ++j) {
                if (this.marked[i][j] === 1 && !this.col_covered[j]) {
                    this.col_covered[j] = true;
                    count++;
                }
            }
        }

        return count >= this.n ? 7 : 4;
    }

    private step4(): number {
        while (true) {
            const [row, col] = this.find_a_zero();
            if (row < 0) return 6;

            this.marked[row][col] = 2;
            const star_col = this.find_star_in_row(row);

            if (star_col >= 0) {
                this.row_covered[row] = true;
                this.col_covered[star_col] = false;
            } else {
                this.Z0_r = row;
                this.Z0_c = col;
                return 5;
            }
        }
    }

    private step5(): number {
        let count = 0;

        this.path[count][0] = this.Z0_r;
        this.path[count][1] = this.Z0_c;

        while (true) {
            const row = this.find_star_in_col(this.path[count][1]);
            if (row < 0) {
                break;
            }

            count++;
            this.path[count][0] = row;
            this.path[count][1] = this.path[count - 1][1];

            const col = this.find_prime_in_row(this.path[count][0]);
            count++;
            this.path[count][0] = this.path[count - 1][0];
            this.path[count][1] = col;
        }

        this.convert_path(count);
        this.clear_covers();
        this.erase_primes();

        return 3;
    }

    private step6(): number {
        const minval = this.find_smallest();

        for (let i = 0; i < this.n; ++i) {
            for (let j = 0; j < this.n; ++j) {
                if (this.row_covered[i]) {
                    this.C[i][j] += minval;
                }
                if (!this.col_covered[j]) {
                    this.C[i][j] -= minval;
                }
            }
        }

        return 4;
    }

    private find_smallest(): number {
        let minval = MAX_SIZE;

        for (let i = 0; i < this.n; ++i) {
            for (let j = 0; j < this.n; ++j) {
                if (!this.row_covered[i] && !this.col_covered[j] && this.C[i][j] < minval) {
                    minval = this.C[i][j];
                }
            }
        }

        return minval;
    }

    private find_a_zero(): [number, number] {
        for (let i = 0; i < this.n; ++i) {
            for (let j = 0; j < this.n; ++j) {
                if (this.C[i][j] === 0 && !this.row_covered[i] && !this.col_covered[j]) {
                    return [i, j];
                }
            }
        }
        return [-1, -1];
    }

    private find_star_in_row(row: number): number {
        for (let j = 0; j < this.n; ++j) {
            if (this.marked[row][j] === 1) {
                return j;
            }
        }
        return -1;
    }

    private find_star_in_col(col: number): number {
        for (let i = 0; i < this.n; ++i) {
            if (this.marked[i][col] === 1) {
                return i;
            }
        }
        return -1;
    }

    private find_prime_in_row(row: number): number {
        for (let j = 0; j < this.n; ++j) {
            if (this.marked[row][j] === 2) {
                return j;
            }
        }
        return -1;
    }

    private convert_path(count: number) {
        for (let i = 0; i <= count; ++i) {
            const [r, c] = this.path[i];
            this.marked[r][c] = this.marked[r][c] === 1 ? 0 : 1;
        }
    }

    private clear_covers() {
        this.row_covered.fill(false);
        this.col_covered.fill(false);
    }

    private erase_primes() {
        for (let i = 0; i < this.n; ++i) {
            for (let j = 0; j < this.n; ++j) {
                if (this.marked[i][j] === 2) {
                    this.marked[i][j] = 0;
                }
            }
        }
    }
}

export function computeMunkres<U, V>(matrix: Map<U, Map<V, number>>, maximize = true): [U, V][] {
    // Handle minimize / maximize by multiplying all values by -1 if we want to maximize.
    matrix = structuredClone(matrix);
    if (maximize) {
        for (const [u, row] of matrix) {
            for (const [v, weight] of row) {
                row.set(v, -weight);
            }
        }
    }
    // The matrix is made of number or null values, null meaning no connexion is allowed.
    const nodesU = new Set<U>();
    const nodesV = new Set<V>();
    let maxWeight: number | null = null;
    let minWeight: number | null = null;
    for (const [u, neighbours] of matrix) {
        nodesU.add(u);
        for (const [v, weight] of neighbours) {
            nodesV.add(v);
            if (maxWeight === null || maxWeight < weight) {
                maxWeight = weight;
            }
            if (minWeight === null || weight < minWeight) {
                minWeight = weight;
            }
        }
    }

    if (maxWeight === null || minWeight === null) {
        // This means the graph has no edge.
        return [];
    }

    // The matrix needs to be square, so we add new vertices if needed.
    // We also transform the map keys into integer keys for the matrix.
    const matrixSize = Math.max(nodesU.size, nodesV.size);
    const nodesUToIdx: (U | null)[] = [...nodesU];
    const nodesVToIdx: (V | null)[] = [...nodesV];
    for (let i = nodesUToIdx.length; i < matrixSize; i++) {
        nodesUToIdx.push(null);
    }
    for (let i = nodesVToIdx.length; i < matrixSize; i++) {
        nodesVToIdx.push(null);
    }

    // We compute what edges that are not specified in the bipartite graph could cost.
    // The cost is chosen such that all perfect matching not using such an edge are prefered.
    const defaultWeight = maxWeight + (maxWeight - minWeight) * (matrixSize - 1) + 1;

    // Create the square matrix by adding whatever is needed.
    // For null values : use the default weight.
    const newMatrix: number[][] = [];
    for (const u of nodesUToIdx) {
        const row: number[] = [];
        for (const v of nodesVToIdx) {
            if (u !== null && v !== null) {
                row.push(matrix.get(u)?.get(v) ?? defaultWeight);
            } else {
                row.push(defaultWeight);
            }
        }
        newMatrix.push(row);
    }

    const matching = new Munkres().compute(newMatrix, { padValue: defaultWeight });

    // Return pairs in matching / not matched nodes, by filtering
    // out whatever doesn't exist in the initial matrix.
    const res: [U, V][] = [];
    for (const [uIdx, vIdx] of matching) {
        const u = nodesUToIdx[uIdx];
        const v = nodesVToIdx[vIdx];
        if (u === null || v === null) {
            continue;
        }
        if (matrix.get(u)?.get(v) === undefined) {
            continue;
        }
        res.push([u, v]);
    }
    return res;
}

function convertArray(arr: (number | null)[][]): Map<string, Map<string, number>> {
    const map = new Map<string, Map<string, number>>();
    for (let i = 0; i < arr.length; i++) {
        const rowMap = new Map<string, number>();
        for (let j = 0; j < arr[i].length; j++) {
            const weight = arr[i][j];
            if (weight !== null) {
                rowMap.set(j.toString(), weight);
            }
        }
        map.set(i.toString(), rowMap);
    }
    return map;
}

// const test = [
//     [1, -1, 1, 1],
//     [1, 1, -1, -1],
//     [null, 0, null, null]
// ];

// const res = computeMunkres(convertArray(test), false);
// console.log(res);
