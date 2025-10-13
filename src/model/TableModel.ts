import * as THREE from "three";
import { PerformanceChild, PerformanceChildParams } from "./PerformanceChild";

// TODO : Which properties are readonly ?
// TODO : Make react utility class for the many ballSpots.
// TODO : Change surface internal by ballspots as Object3D only ?
// In that case, we can remove many attributes.
// TODO : Use ball ID or ball Name to be placed ?
// TODO : Use a normal vector to identify the table's "top".
// TODO : Rename everywhere name to ID to make it clearer it should be unique ?
// TODO : Except for "implements", change evry interface to a type. Or not ? Choose. Which one has better messages (error, intellisense, ...) ?

//TODO : Recheck doc of all this section after change.
//TODO : Add timeline to table (could be used to light the spots).

/**
 * Interface for the constructor of TableModel.
 */
export type TableModelParams = PerformanceChildParams & {
    /**
     * The table's unique ID.
     */
    id: string;
    /**
     * Spots on the table.
     */
    spots?: Map<string, THREE.Vector3>;
    /**
     * Where a ball goes if it has no designated spot ?
     * It is both used as a failback and as a default way to layout balls.
     */
    unkownSpot?: THREE.Vector3;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a table.
 */
export class TableModel extends PerformanceChild {
    /**
     * The table's unique ID.
     */
    id: string;
    /**
     * Spots on the table.
     */
    spots: Map<string, THREE.Vector3>;
    /**
     * Where a ball goes if it has no designated spot ?
     * It is both used as a failback and as a default way to layout balls.
     */
    unkownSpot: THREE.Vector3;

    constructor({ id, spots, unkownSpot, performance }: TableModelParams) {
        super({ performance });
        this.id = id;
        this.spots = spots ?? new Map<string, THREE.Vector3>();
        this.unkownSpot = unkownSpot ?? new THREE.Vector3(0, 0, 0);
    }

    /**
     * Returns the position of a spot.
     * @param spot the spot's name.
     * @returns the ball's spot on the table as is specified in the ballsSpots attribute. If it is not found, it goes to a designated unknownBallSpot.
     */
    spotPosition(spot: string | undefined): THREE.Vector3 {
        // TODO : Change id to name ?
        if (spot === undefined) {
            return this.unkownSpot.clone();
        }
        return this.spots.get(spot)?.clone() ?? this.unkownSpot.clone();
    }
}