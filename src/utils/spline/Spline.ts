import { Matrix, Structure } from "./Matrix";
import { OrderedMap } from "js-sdsl";
import { NUMBERS_STRUCTURE } from "../constants";

//TODO : To geneeralize to splines, rename points by parameter ?
//TODO : Rewrite for threejs ?

abstract class Spline<T> {
    abstract knots: number[];
    abstract tree: OrderedMap<number, number>;
    abstract structure: Structure<T, number>;

    // constructor(structure: Structure<T, number>) {
    //     // if (parameters.length === 0) {
    //     //     throw new Error("A spline should have at least one set of parameters.");
    //     // }

    //     // this.parameters = parameters;
    //     this.structure = structure;

    //     // if (knots === undefined) {
    //     //     this.knots = new Array<number>(this.parameters.length);
    //     //     for (let i = 0; i < this.knots.length; i++) {
    //     //         this.knots[i] = i;
    //     //     }
    //     // } else if (this.parameters.length !== knots.length) {
    //     //     throw new Error("Points and knots must have the same size");
    //     // } else {
    //     //     this.knots = knots;
    //     // }

    //     // let tree: RBTree<number, number> = createRBTree();
    //     // for (let i = 0; i < this.parameters.length; i++) {
    //     //     tree = tree.insert(this.knots[i], i);
    //     // }
    //     // this.tree = tree;
    // }

    prevNextTimeIdx(time: number): {
        prevTime: number;
        nextTime: number;
        prevIdx: number;
        nextIdx: number;
    } {
        if (time < this.knots[0]) {
            time = this.knots[0];
        } else if (time > this.knots[this.knots.length - 1]) {
            time = this.knots[this.knots.length - 1];
        }

        const prevIt = this.tree.reverseLowerBound(time);
        const nextIt = this.tree.lowerBound(time);
        // Sanity Check
        if (!prevIt.isAccessible() || !nextIt.isAccessible()) {
            throw new Error("Something went wrong...");
        }
        // const [prev_time, prev_idx] = prev_it.pointer;
        // const [next_time, next_idx] = next_it.pointer;
        return {
            prevTime: prevIt.pointer[0],
            nextTime: nextIt.pointer[0],
            prevIdx: prevIt.pointer[1],
            nextIdx: nextIt.pointer[1]
        };
    }

    abstract getTransformationMatrix(dt?: number): Matrix<number, number>;

    abstract getParamMatrix(prev_idx: number, next_idx: number, dt?: number): Matrix<T, number>;

    interpolate(time: number): T {
        const { prevTime, nextTime, prevIdx, nextIdx } = this.prevNextTimeIdx(time);

        // Creating transformation matrix
        const dt = nextTime - prevTime;
        const transformationMatrix = this.getTransformationMatrix(dt);

        // Creating parameters vector
        const parametersMatrix = this.getParamMatrix(prevIdx, nextIdx, dt);

        // Creating vector of times
        const timeNor = nextIdx === prevIdx ? 0 : (time - prevTime) / dt;
        const degree = transformationMatrix.nbRow;
        const timesData = Array<number>(degree);
        for (let i = 0; i < timesData.length; i++) {
            timesData[i] = timeNor ** (degree - 1 - i);
        }
        const timesMat = new Matrix<number, number>([timesData], NUMBERS_STRUCTURE);

        // Computing the interpolation. Result has only 1 element
        const res = Matrix.multiplyMatrixOfScalarsByMatrix(
            timesMat.multiply(transformationMatrix),
            parametersMatrix
        );
        return res.data[0][0];
    }

    velocity(time: number): T {
        const { prevTime, nextTime, prevIdx, nextIdx } = this.prevNextTimeIdx(time);

        // Creating transformation matrix
        const dt = nextTime - prevTime;
        const transformationMatrix = this.getTransformationMatrix(dt);

        // Creating parameters vector
        const parametersMatrix = this.getParamMatrix(prevIdx, nextIdx, dt);

        // Creating vector of times
        const timeNor = nextIdx === prevIdx ? 0 : (time - prevTime) / dt;
        const degree = transformationMatrix.nbRow;
        const timesData = Array<number>(degree);
        for (let i = 0; i < timesData.length - 1; i++) {
            timesData[i] = timeNor ** (degree - 2 - i);
        }
        timesData[timesData.length - 1] = 0;
        const timesMat = new Matrix<number, number>([timesData], NUMBERS_STRUCTURE);

        // Computing the interpolation. Result has only 1 element
        const res = Matrix.multiplyMatrixOfScalarsByMatrix(
            timesMat.multiply(transformationMatrix),
            parametersMatrix
        );
        return res.data[0][0];
    }
}

class CubicHermiteSpline<T> extends Spline<T> {
    points: T[];
    dpoints: T[];
    knots: number[];
    tree: OrderedMap<number, number>;
    structure: Structure<T, number>;
    private static _transformationMatrix = new Matrix<number, number>(
        [
            [2, -2, 1, 1],
            [-3, 3, -2, -1],
            [0, 0, 1, 0],
            [1, 0, 0, 0]
        ],
        NUMBERS_STRUCTURE
    );

    constructor(structure: Structure<T, number>, points: T[], dpoints: T[], knots?: number[]) {
        super();
        if (points.length !== dpoints.length) {
            throw new Error("The number of points and derivatives should be the same.");
        }
        this.points = points;
        this.dpoints = dpoints;

        if (knots === undefined) {
            this.knots = new Array<number>(this.points.length);
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i] = i;
            }
        } else if (points.length !== knots.length) {
            throw new Error("Points and knots must have the same size");
        } else {
            this.knots = knots;
        }

        this.tree = new OrderedMap<number, number>();
        for (let i = 0; i < this.points.length; i++) {
            this.tree.setElement(this.knots[i], i);
        }

        this.structure = structure;
    }

    getTransformationMatrix(): Matrix<number, number> {
        return CubicHermiteSpline._transformationMatrix;
    }

    getParamMatrix(prev_idx: number, next_idx: number, dt: number) {
        const param_data = [
            [this.points[prev_idx]],
            [this.points[next_idx]],
            [this.structure.multiplyByScalar(dt, this.dpoints[prev_idx])],
            [this.structure.multiplyByScalar(dt, this.dpoints[next_idx])]
        ];
        return new Matrix<T, number>(param_data, this.structure);
    }
}

class QuinticHermiteSpline<T> extends Spline<T> {
    points: T[];
    dpoints: T[];
    apoints: T[];
    knots: number[];
    tree: OrderedMap<number, number>;
    structure: Structure<T, number>;
    private static _transformationMatrix = new Matrix<number, number>(
        [
            [-6, 6, -3, -3, -1 / 2, 1 / 2],
            [15, -15, 8, 7, 3 / 2, -1],
            [-10, 10, -6, -4, -3 / 2, 1 / 2],
            [0, 0, 0, 0, 1 / 2, 0],
            [0, 0, 1, 0, 0, 0],
            [1, 0, 0, 0, 0, 0]
        ],
        NUMBERS_STRUCTURE
    );

    constructor(
        structure: Structure<T, number>,
        points: T[],
        dpoints: T[],
        apoints: T[],
        knots?: number[]
    ) {
        super();
        if (points.length !== dpoints.length || points.length !== apoints.length) {
            throw new Error("The number of points and derivatives should be the same.");
        }
        this.points = points;
        this.dpoints = dpoints;
        this.apoints = apoints;

        if (knots === undefined) {
            this.knots = new Array<number>(this.points.length);
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i] = i;
            }
        } else if (points.length !== knots.length) {
            throw new Error("Points and knots must have the same size");
        } else {
            this.knots = knots;
        }

        this.tree = new OrderedMap();
        for (let i = 0; i < this.points.length; i++) {
            this.tree.setElement(this.knots[i], i);
        }

        this.structure = structure;
    }

    getTransformationMatrix(): Matrix<number, number> {
        return QuinticHermiteSpline._transformationMatrix;
    }

    getParamMatrix(prev_idx: number, next_idx: number, dt: number) {
        const param_data = [
            [this.points[prev_idx]],
            [this.points[next_idx]],
            [this.structure.multiplyByScalar(dt, this.dpoints[prev_idx])],
            [this.structure.multiplyByScalar(dt, this.dpoints[next_idx])],
            [this.structure.multiplyByScalar(dt ** 2, this.apoints[next_idx])],
            [this.structure.multiplyByScalar(dt ** 2, this.apoints[prev_idx])]
        ];
        return new Matrix<T, number>(param_data, this.structure);
    }
}

export { Spline, CubicHermiteSpline, QuinticHermiteSpline };
