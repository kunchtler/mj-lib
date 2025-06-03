import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export class HtmlMixerContext {
    public rendererCss: CSS3DRenderer;
    public rendererWebgl: THREE.WebGLRenderer;
    public cssFactor: number;
    public cssCamera: THREE.PerspectiveCamera;
    public cssScene: THREE.Scene;
    public autoUpdateObjects: boolean;
    public updateFcts: (() => unknown)[] = [];

    /**
     * @param rendererWebgl The renderer in front.
     * @param camera The camera used.
     */
    constructor(rendererWebgl: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
        // Build cssFactor to workaround bug due to no display.
        this.cssFactor = 1000;

        // Update Renderer
        this.rendererCss = new CSS3DRenderer();
        this.rendererWebgl = rendererWebgl;

        // Handle Camera
        this.cssCamera = new THREE.PerspectiveCamera(
            camera.fov,
            camera.aspect,
            camera.near * this.cssFactor,
            camera.far * this.cssFactor
        );

        this.updateFcts.push(() => {
            this.cssCamera.quaternion.copy(camera.quaternion);

            this.cssCamera.position.copy(camera.position).multiplyScalar(this.cssFactor);
        });

        // Create a new scene to hold CSS.
        this.cssScene = new THREE.Scene();

        // Auto update objects
        this.autoUpdateObjects = true;
        this.updateFcts.push(() => {
            if (!this.autoUpdateObjects) return;
            this.cssScene.traverse((cssObject) => {
                if (cssObject instanceof THREE.Scene) return;
                const mixerPlane = cssObject.userData.mixerPlane as HtmlMixerPlane | undefined;
                if (mixerPlane === undefined) return;
                mixerPlane.update();
            });
        });

        // Render CssScene
        this.updateFcts.push(() => {
            this.rendererCss.render(this.cssScene, this.cssCamera);
        });
    }

    public update() {
        this.updateFcts.forEach((updateFct) => updateFct());
    }
}

export interface HtmlMixerPlaneOpts {
    elementW?: number;
    object3d?: THREE.Mesh<THREE.PlaneGeometry>;
    planeH?: number;
    planeW?: number;
}

/** Define a THREEx Plane. */
export class HtmlMixerPlane {
    public opts: HtmlMixerPlaneOpts;
    public domElement: HTMLElement;
    public object3d!: THREE.Mesh<THREE.PlaneGeometry>;
    public cssObject: CSS3DObject;
    public updateFcts: (() => unknown)[] = [];
    public elementWidth = 0;
    public aspectRatio = 0;
    public elementHeight = 0;
    public mixerContext: HtmlMixerContext;

    /**
     * @param mixerContext context
     * @param domElement   the dom element to mix
     * @param opts         options to set
     */
    constructor(
        mixerContext: HtmlMixerContext,
        domElement: HTMLElement,
        opts?: HtmlMixerPlaneOpts
    ) {
        this.mixerContext = mixerContext;
        this.opts = opts ?? {};
        this.opts.elementW ??= 768;
        this.opts.planeW ??= 1;
        this.opts.planeH ??= 3 / 4;
        this.domElement = domElement;

        if (!this.opts.object3d) {
            const planeMaterial = new THREE.MeshBasicMaterial({
                opacity: 0,
                color: new THREE.Color("black"),
                blending: THREE.NoBlending,
                side: THREE.DoubleSide
            });
            const geometry = new THREE.PlaneGeometry(this.opts.planeW, this.opts.planeH);

            this.setObject3D(new THREE.Mesh(geometry, planeMaterial));
        } else {
            this.setObject3D(this.opts.object3d);
        }

        // width of iframe in pixels
        this.correctSizes();
        this.correctElementSizes();

        // create a CSS3DObject to display element
        this.cssObject = new CSS3DObject(domElement);
        this.cssObject.scale
            .set(1, 1, 1)
            .multiplyScalar(this.mixerContext.cssFactor / (this.elementWidth / this.opts.planeH));

        // Hook cssObject to mixerPlane.
        this.cssObject.userData.mixerPlane = this;

        this.updateFcts.push(() => {
            // get world position
            this.object3d.updateMatrixWorld();
            const worldMatrix = this.object3d.matrixWorld;

            // get position/quaternion/scale of object3d
            const position = new THREE.Vector3();
            const scale = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            worldMatrix.decompose(position, quaternion, scale);

            // handle quaternion
            this.cssObject.quaternion.copy(quaternion);

            // handle position
            this.cssObject.position.copy(position).multiplyScalar(this.mixerContext.cssFactor);
            // handle scale
            const scaleFactor =
                this.elementWidth / (this.object3d.geometry.parameters.width * scale.x);
            this.cssObject.scale
                .set(1, 1, 1)
                .multiplyScalar(this.mixerContext.cssFactor / scaleFactor);
        });
    }

    setDomElement(newDomElement: HTMLElement) {
        // remove the oldDomElement
        const oldDomElement = this.domElement;
        if (oldDomElement.parentNode) oldDomElement.parentNode.removeChild(oldDomElement);

        // update local constiables
        this.domElement = newDomElement;
        // update cssObject
        this.cssObject.element = newDomElement;
        // reset the size of the domElement
        this.correctElementSizes();
        this.cssObject.updateMatrixWorld();
    }

    /**
     * Hook event so cssObject is attached to cssScene when
     * object3d is added/removed.
     *
     * @param newObject
     */
    public setObject3D(newObject: typeof this.object3d) {
        this.object3d = newObject;
        this.object3d.addEventListener("added", () => {
            this.mixerContext.cssScene.add(this.cssObject);
        });
        this.object3d.addEventListener("removed", () => {
            this.mixerContext.cssScene.remove(this.cssObject);
        });
    }

    public correctElementSizes() {
        this.domElement.style.height = `${this.elementHeight}px`;
        this.domElement.style.width = `${this.elementWidth}px`;
    }

    public correctSizes() {
        this.aspectRatio = (this.opts.planeH ?? 1) / (this.opts.planeW ?? 1);
        this.elementWidth = this.opts.elementW ?? 0;
        this.elementHeight = this.elementWidth * this.aspectRatio;
    }

    public update() {
        this.updateFcts.forEach((updateFct) => updateFct());
    }
}
