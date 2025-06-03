import * as THREE from "three";
import { TableModel } from "../model/TableModel";

export interface TableSimParams {
    model: TableModel;
    // object3D: THREE.Object3D;
}

export type TableInfo = {
    ballPlacement: Map<string, THREE.Vector3>;
    unknownBallPosition: THREE.Vector3;
};

export class TableSim {
    model: TableModel;
    // object3D: THREE.Object3D;

    constructor({ model }: TableSimParams) {
        this.model = model;
        // this.object3D = object3D;
    }

    fillPositionInfo({ ballPlacement, unknownBallPosition }: TableInfo) {
        this.model.ballsPlacement = ballPlacement;
        this.model.unkownBallPosition = unknownBallPosition;
    }

    // addSpot(ballName: string, spot: THREE.Vector3) {
    //     this.model.ballsPlacement.set(ballName, spot);
    // }

    // removeSpot(ballName: string) {
    //     this.model.ballsPlacement.delete(ballName);
    // }

    // setUnknownSpot(spot: THREE.Vector3) {
    //     this.model.unkownBallPosition = spot;
    // }
}
