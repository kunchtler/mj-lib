// TODO : Deep Copy the operations ?
// Handle what is private / public ?
// How to properly handle smae type but different structure ?
// custom copy element function instead of structured clone ?
// Multiply scalar is not really a scalar multiplication ?
// No check when passing data to see if matrix is rectangular.
// Make multiplication more general base on custom multiplication : (a: T, b: U): V => a*b
// Scalar is "just a one by one matrix"

export type Structure<Elem, Scalar> = {
    add: (a: Elem, b: Elem) => Elem;
    multiply: (a: Elem, b: Elem) => Elem;
    multiplyByScalar: (scalar: Scalar, a: Elem) => Elem;
    zero: Elem;
};

export class Matrix<T, S> {
    data: T[][];
    nbRow: number;
    nbCol: number;
    add_T: (a: T, b: T) => T;
    multiply_T: (a: T, b: T) => T;
    multiplyByScalar_T: (scalar: S, a: T) => T;
    structure: Structure<T, S>;

    constructor(data: T[][], structure: Structure<T, S>) {
        this.data = data;
        this.nbRow = this.data.length;
        if (this.nbRow === 0) {
            this.nbCol = 0;
        } else {
            this.nbCol = this.data[0].length;
        }
        this.add_T = structure.add;
        this.multiply_T = structure.multiply;
        this.multiplyByScalar_T = structure.multiplyByScalar;
        this.structure = structure;
    }

    static byShape<T, S>(
        nb_row: number,
        nb_col: number,
        init_value: T,
        structure: Structure<T, S>
    ): Matrix<T, S> {
        const data: T[][] = Array<T[]>(nb_row);
        for (let i = 0; i < nb_row; i++) {
            data[i] = Array<T>(nb_col);
            for (let j = 0; j < nb_col; j++) {
                data[i][j] = structuredClone(init_value);
            }
        }
        return new Matrix<T, S>(data, structure);
    }

    static zeros<T, S>(nb_row: number, nb_col: number, structure: Structure<T, S>): Matrix<T, S> {
        return Matrix.byShape(nb_row, nb_col, structure.zero, structure);
    }

    static zerosLike<T, S>(mat: Matrix<T, S>): Matrix<T, S> {
        return Matrix.byShape(mat.nbRow, mat.nbCol, mat.structure.zero, mat.structure);
    }

    copy(): Matrix<T, S> {
        return new Matrix(structuredClone(this.data), this.structure);
    }

    get(row: number, col: number): T {
        return this.data[row][col];
    }

    set(row: number, col: number, value: T): void {
        this.data[row][col] = value;
    }

    stringifyCoords(): string {
        return `${this.nbRow} * ${this.nbCol}`;
    }

    add(other: Matrix<T, S>): Matrix<T, S> {
        if (this.nbRow !== other.nbRow || this.nbCol !== other.nbCol) {
            throw new Error(
                `Can't add matrix of size ${this.stringifyCoords()} and ${other.stringifyCoords()}`
            );
        }
        const res = Matrix.zerosLike(this);
        for (let i = 0; i < res.nbRow; i++) {
            for (let j = 0; j < res.nbCol; j++) {
                res.data[i][j] = res.add_T(this.data[i][j], other.data[i][j]);
            }
        }
        return res;
    }

    multiply(other: Matrix<T, S>): Matrix<T, S> {
        if (this.nbCol !== other.nbRow) {
            throw new Error(
                `Can't multiply matrix of size ${this.stringifyCoords()} and ${other.stringifyCoords()}`
            );
        }
        const res = Matrix.zeros(this.nbRow, other.nbCol, other.structure);
        for (let i = 0; i < res.nbRow; i++) {
            for (let j = 0; j < res.nbCol; j++) {
                for (let k = 0; k < this.nbCol; k++) {
                    res.data[i][j] = res.add_T(
                        res.data[i][j],
                        res.multiply_T(this.data[i][k], other.data[k][j])
                    );
                }
            }
        }
        return res;
    }

    multiplyByScalar(scalar: S): Matrix<T, S> {
        const res = Matrix.zerosLike(this);
        for (let i = 0; i < res.nbRow; i++) {
            for (let j = 0; j < res.nbCol; j++) {
                res.data[i][j] = res.multiplyByScalar_T(scalar, this.data[i][j]);
            }
        }
        return res;
    }

    static add<T, S>(mat1: Matrix<T, S>, mat2: Matrix<T, S>): Matrix<T, S> {
        return mat1.add(mat2);
    }

    static multiply<T, S>(mat1: Matrix<T, S>, mat2: Matrix<T, S>): Matrix<T, S> {
        return mat1.multiply(mat2);
    }

    static multiplyByScalar<T, S>(scalar: S, mat: Matrix<T, S>): Matrix<T, S>;
    static multiplyByScalar<T, S>(mat: Matrix<T, S>, scalar: S): Matrix<T, S> {
        return mat.multiplyByScalar(scalar);
    }

    static multiplyMatrixOfScalarsByMatrix<T, S>(scalar_mat: Matrix<S, S>, mat: Matrix<T, S>) {
        if (scalar_mat.nbCol !== mat.nbRow) {
            throw new Error(
                `Can't multiply matrix of size ${scalar_mat.stringifyCoords()} and ${mat.stringifyCoords()}`
            );
        }
        const res = Matrix.zeros(scalar_mat.nbRow, mat.nbCol, mat.structure);
        for (let i = 0; i < res.nbRow; i++) {
            for (let j = 0; j < res.nbCol; j++) {
                for (let k = 0; k < scalar_mat.nbCol; k++) {
                    res.data[i][j] = res.add_T(
                        res.data[i][j],
                        res.multiplyByScalar_T(scalar_mat.data[i][k], mat.data[k][j])
                    );
                }
            }
        }
        return res;
    }
}
