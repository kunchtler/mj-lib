import { RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import {
    createBallGeometry,
    createBallMaterial,
    createHandGeometry,
    createHandMaterial,
    createJugglerCubeGeometry,
    createJugglerMaterial,
    createTableGeometry,
    createTableMaterial,
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT,
    DEFAULT_JUGGLER_CUBE_ARM_LENGTH,
    DEFAULT_JUGGLER_CUBE_COLOR,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_WIDTH,
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT
} from "../view/Default3DModels";
import { Juggler } from "./Juggler";
import { Hand } from "./Hand";
import { CatchSpot, RestSpot, TossSpot } from "./HandSpot";
import { ThreeElements } from "@react-three/fiber";
import { Ball } from "./Ball";
import { Table } from "./Table";
import { TableUnknownSpot } from "./TableSpot";

////////// Juggler //////////

//TODO : Customization options
export function JugglerMesh({
    height,
    width,
    depth,
    color
}: {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
}) {
    // We manually create the geometry to be able to translate it.
    const geometryRef = useRef(createJugglerCubeGeometry({ height, width, depth }));
    const materialRef = useRef(createJugglerMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}

export type BasicJugglerProps = {
    name: string;
    juggler?: {
        armLength?: number; //TODO : Remove (and rather only do with cube dimensions)
        height?: number;
        width?: number;
        depth?: number;
        color?: THREE.ColorRepresentation;
    };
    hands?: {
        radius?: number;
        widthSegments?: number;
        heightSegments?: number;
        color?: THREE.ColorRepresentation;
    };
    leftHandRef?: RefObject<THREE.Object3D | null> | ((elem: THREE.Object3D | null) => void);
    rightHandRef?: RefObject<THREE.Object3D | null> | ((elem: THREE.Object3D | null) => void);
} & ThreeElements["object3D"];

//TODO : Decompose with BasicHand and center-rest + rest-spot distance ?
export function BasicJuggler({
    name,
    juggler,
    hands,
    leftHandRef,
    rightHandRef,
    ...props
}: BasicJugglerProps) {
    // Default values.
    juggler ??= {};
    juggler.armLength ??= DEFAULT_JUGGLER_CUBE_ARM_LENGTH;
    juggler.height ??= DEFAULT_JUGGLER_CUBE_HEIGHT;
    juggler.width ??= DEFAULT_JUGGLER_CUBE_WIDTH;
    juggler.depth ??= DEFAULT_JUGGLER_CUBE_DEPTH;
    juggler.color ??= DEFAULT_JUGGLER_CUBE_COLOR;

    // Three Fiber sub-scene.
    return (
        <Juggler name={name} {...props}>
            <JugglerMesh
                height={juggler.height}
                width={juggler.width}
                depth={juggler.depth}
                color={juggler.color}
            />
            <Hand
                isRight={false}
                position={[
                    juggler.armLength,
                    juggler.height - juggler.armLength * 2,
                    (-juggler.depth * 2) / 3
                ]}
                ref={(elem) => {
                    if (leftHandRef !== undefined) {
                        if (typeof leftHandRef === "function") {
                            leftHandRef(elem);
                        } else {
                            leftHandRef.current = elem;
                        }
                    }
                }}
            >
                {/* <HandMesh {...hands} /> */}
                <TossSpot position={[0, 0, juggler.depth / 4]} />
                <CatchSpot position={[0, 0, -juggler.depth / 4]} />
                <RestSpot position={[0, 0, 0]} />
            </Hand>
            <Hand
                isRight={true}
                position={[
                    juggler.armLength,
                    juggler.height - juggler.armLength * 2,
                    (juggler.depth * 2) / 3
                ]}
                ref={(elem) => {
                    if (rightHandRef !== undefined) {
                        if (typeof rightHandRef === "function") {
                            rightHandRef(elem);
                        } else {
                            rightHandRef.current = elem;
                        }
                    }
                }}
            >
                {/* <HandMesh {...hands} /> */}
                <TossSpot position={[0, 0, -juggler.depth / 4]} />
                <CatchSpot position={[0, 0, juggler.depth / 4]} />
                <RestSpot position={[0, 0, 0]} />
            </Hand>
        </Juggler>
    );
}

////////// Hand //////////

export function HandMesh({
    radius,
    widthSegments,
    heightSegments,
    color
}: {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
}) {
    const geometryRef = useRef(
        createHandGeometry({
            radius,
            widthSegments,
            heightSegments
        })
    );
    const materialRef = useRef(createHandMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}

////////// Ball //////////

// TODO : Add customization options (striped, with middle band, ...)
export function BallMesh({
    radius,
    widthSegments,
    heightSegments,
    color
}: {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
}) {
    const geometryRef = useRef(
        createBallGeometry({
            radius,
            widthSegments,
            heightSegments
        })
    );
    const materialRef = useRef(createBallMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}

export type BasicBallProps = {
    name?: string;
    id: string;
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
} & ThreeElements["object3D"];

export function BasicBall({
    id,
    name,
    radius,
    widthSegments,
    heightSegments,
    color,
    ...props
}: BasicBallProps) {
    //Default values.
    radius ??= DEFAULT_BALL_RADIUS;
    widthSegments ??= DEFAULT_BALL_WIDTH_SEGMENT;
    heightSegments ??= DEFAULT_BALL_HEIGHT_SEGMENT;
    color ??= DEFAULT_BALL_COLOR;
    // Three fiber sub-scene.
    return (
        <Ball name={name} id={id} radius={radius} {...props}>
            <BallMesh
                radius={radius}
                widthSegments={widthSegments}
                heightSegments={heightSegments}
                color={color}
            />
        </Ball>
    );
}

////////// Table //////////

export function TableMesh({
    height,
    width,
    depth,
    color
}: {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
}) {
    // We manually create the geometry to be able to translate it.
    const geometryRef = useRef(createTableGeometry({ height, width, depth }));
    const materialRef = useRef(createTableMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}

export type BasicTableProps = {
    name: string;
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
} & ThreeElements["object3D"];

//TODO : Aides pour la disposition des balles.
export function BasicTable({ name, height, width, depth, color, ...props }: BasicTableProps) {
    // Default values.
    height ??= DEFAULT_TABLE_HEIGHT;
    width ??= DEFAULT_TABLE_HEIGHT;
    depth ??= DEFAULT_TABLE_DEPTH;
    color ??= DEFAULT_TABLE_COLOR;

    // Three fiber sub-scene
    return (
        <Table name={name} {...props}>
            <TableMesh height={height} width={width} depth={depth} color={color} />
            <TableUnknownSpot position={[0, height, 0]}>
                {/* <axesHelper args={[2]} position={[0, 0, 0]} /> */}
            </TableUnknownSpot>
        </Table>
    );
}
