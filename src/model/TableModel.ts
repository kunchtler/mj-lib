import { Euler, Object3D, Vector3 } from "three";
import { MapCallbacks } from "./MapCallbacks";
import { SpotModel } from "./SpotModel";
import { ThreeSyncedPosition, ThreeSyncedRotation, ThreeSyncedScale } from "./ThreeSyncedProperty";

// TODO : Which properties are readonly ?
// TODO : Recheck doc of all this sections after change.
// TODO : Add timeline to table (could be used to light the spots).

/**
 * Interface for the constructor of TableModel.
 */
export type TableModelParams = {
    /**
     * The table's unique ID.
     */
    id: string;
    /**
     * The table's position.
     */
    position?: Vector3;
    /**
     * The table's rotation.
     */
    rotation?: Euler;
    /**
     * The table's scale.
     */
    scale?: Vector3;
    /**
     * Spots on the table, relative to the table's position.
     */
    spotsPos?: Map<string, Vector3>;
    /**
     * Where a ball goes if it has no designated spot ?
     * It is both used as a failback and as a default way to layout balls.
     */
    unkownSpotPos?: Vector3;
};

// TODO : SpotsPos is relative, have pos but also table rotation (to correctly orient the balls) this or up vector for table or up vector per spot (is table has weird shape ???)

// TODO : Document that _object SHOULD NOT BE INTERACTED WITH, used internally.
// TODO : And that to change position, it should be the position field that changes.
// TODO : Document what is relative to what, ie what position is relative to what position.
// TODO : Streamline where vector clones should be or not.

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a table.
 */
export class TableModel {
    /**
     * The table's unique ID.
     */
    id: string;
    /**
     * The table's position.
     */
    position: ThreeSyncedPosition;
    /**
     * The table's rotation.
     */
    rotation: ThreeSyncedRotation;
    /**
     * The table's scale.
     */
    scale: ThreeSyncedScale;
    /**
     * Spots on the table.
     */
    spots: MapCallbacks<string, SpotModel>;
    /**
     * Where a ball goes if it has no designated spot ?
     * It is both used as a failback and as a default way to layout balls.
     */
    unkownSpot: SpotModel;

    readonly _object = new Object3D();

    constructor({ id, position, rotation, scale, spotsPos, unkownSpotPos }: TableModelParams) {
        this.id = id;

        // Sync the table's postional properties with the object.
        this.position = new ThreeSyncedPosition(this._object, position);
        this.rotation = new ThreeSyncedRotation(this._object, rotation);
        this.scale = new ThreeSyncedScale(this._object, scale);

        this.spots = new MapCallbacks({
            onSetElement: (key, value) => {
                this._object.add(value._object);
            },
            onDeleteElement: (key, value) => {
                if (value !== undefined) {
                    this._object.remove(value._object);
                }
            }
        });
        if (spotsPos !== undefined) {
            for (const [spotName, spotPos] of spotsPos) {
                this.spots.set(spotName, new SpotModel({ position: spotPos }));
            }
        }
        this.unkownSpot = new SpotModel({ position: unkownSpotPos });
    }

    get object(): Object3D {
        return this._object;
    }

    /**
     * Returns the position of a spot.
     * @param spot the spot's name.
     * @returns the ball's spot on the table as is specified in the ballsSpots attribute. If it is not found, it goes to a designated unknownBallSpot.
     */
    spotPosition(spot?: string): Vector3 {
        if (spot === undefined) {
            return this.unkownSpot.position.getGlobal();
        }
        return this.spots.get(spot)?.position.getGlobal() ?? this.unkownSpot.position.getGlobal();
    }

    upVector(): Vector3 {
        return new Vector3(0, 1, 0).applyEuler(this.rotation.getGlobal());
    }
}
