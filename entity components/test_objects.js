// imports
// base
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";// import * as THREE from "three";
// ECS
import {EntityComponent} from "../classes/ECS/entity_component.js";
import { createFractalMaterial, createFractalMaterialFromSources } from "../shaders/Simple_FractalDithering.js";
// Removed Vite `?raw` static imports to avoid MIME/type module errors on
// GitHub Pages. Shaders will be loaded at runtime via fetch as a safe fallback.
// When a bundler inlines sources, `createFractalMaterialFromSources` can still
// be used by passing explicit sources. For portability, we initialize these
// to null so the runtime-fetch path is used by default.
let vertSource = null;
let fragSource = null;

//
export class EntityComponentTestCube extends EntityComponent
{
    // bare minimum
    #params = null;

    //
    #cube = null;
    #positionOffset = { x: 0, y: 0, z: 0 };
    #size = { x: 1, y: 1, z: 1 };
    #spin = true;
    #lighting = false;

    //
    #nameLastLetterAsInt = null;

    // construct
    constructor(params)
    {
        super(params);
        this.#params = params;

        //
        if(params.positionOffset != null)
        {
            this.#positionOffset = params.positionOffset;
        }
        if(params.size != null)
        {
            this.#size = params.size;
        }
        if(params.spin != null)
        {
            this.#spin = params.spin;
        }
        if(params.lighting != null)
        {
            this.#lighting = params.lighting;
        }
    }

     // lifecycle

    async methodInitialize()
    {
        //
        const name = this.methodGetName();
        const nameLastLetter = name.charAt(name.length - 1);
        this.#nameLastLetterAsInt = nameLastLetter.charCodeAt(0);

        //
            const geometry = new THREE.BoxGeometry( this.#size.x, this.#size.y, this.#size.z );

            const loader = new THREE.TextureLoader();
            // Resolve texture URL via import.meta.url so Vite will include the asset
            // in the build output. This works in dev and in the production build.
            let texUrl;
            try {
                texUrl = new URL('../textures/texture_checkerboard.png', import.meta.url).href;
            } catch (e) {
                // Fallback: use path relative to server root
                texUrl = 'textures/texture_checkerboard.png';
            }
            const texture = await new Promise((res, rej) => loader.load(texUrl, res, undefined, rej));

            // Prefer bundler raw imports (Vite: ?raw) to avoid runtime fetches.
            // However, built output may sometimes emit shader assets instead of inlining
            // the raw strings. Detect that case and fall back to the runtime-fetching
            // factory if the imported sources are not plain strings.
            let material;
            try {
                const isVertString = typeof vertSource === 'string';
                const isFragString = typeof fragSource === 'string';

                // Heuristic: if the imported string looks like actual GLSL source (contains newlines
                // or shader keywords) treat it as source. If it looks like a URL/path (no newlines,
                // short, or ends with .vert/.frag), treat it as an asset URL and let the runtime fetch
                // loader load it from that URL.
                const looksLikeSource = (s) => typeof s === 'string' && (s.includes('\n') || s.includes('void main') || s.length > 500);

                if (isVertString && isFragString && looksLikeSource(vertSource) && looksLikeSource(fragSource)) {
                    // Inlined shader sources (dev or bundle-inlined)
                    material = createFractalMaterialFromSources(vertSource, fragSource, { map: texture, level: 3, shape: 9, lighting: this.#lighting });
                } else if (isVertString && isFragString) {
                    // Likely URLs emitted by the build. Use the runtime factory with explicit URLs.
                    material = await createFractalMaterial({ map: texture, level: 3, shape: 9, lighting: this.#lighting, vertUrl: vertSource, fragUrl: fragSource });
                } else {
                    // fallback: runtime fetch (works with any static server)
                    material = await createFractalMaterial({ map: texture, level: 3, shape: 9, lighting: this.#lighting });
                }
            } catch (err) {
                // If anything goes wrong, fall back to runtime-fetching factory.
                console.warn('Shader raw import failed or unavailable, using runtime fetch fallback.', err);
                material = await createFractalMaterial({ map: texture, level: 3, shape: 9, lighting: this.#lighting });
            }


            this.#cube = new THREE.Mesh(geometry, material);
            this.#cube.castShadow = true;
            this.#cube.receiveShadow = true;
            this.#params.scene.add(this.#cube);

            this.#cube.position.x += this.#positionOffset.x;
            this.#cube.position.y += this.#positionOffset.y;
            this.#cube.position.z += this.#positionOffset.z;

            this.methodRegisterInvokableHandler('update.position', (paramMessage) =>{ this.methodHandleUpdatePosition(paramMessage); });
        
    }

    methodUpdate(timeElapsed, timeDelta)
    {
        // early return
        if (this.#cube == null) { return; }
        if (!this.#spin) { return; }

        //
        this.#cube.rotation.y += timeDelta * (this.#nameLastLetterAsInt % 2 == 0 ? 1 : -1);
    }

    // handlers

    methodHandleUpdatePosition(paramMessage)
    {
        this.#cube.position.copy(paramMessage.invokableHandlerValue);
    }
}

//
export class EntityComponentButtonPointerLock extends EntityComponent
{
    // bare minimum
    #params = null;

    //
    #elementButton = null;
    #isVisibleButton = true;

    // construct
    constructor(params)
    {
        super(params);
        this.#params = params;
    }

     // lifecycle

    methodInitialize()
    {
        //
        this.#params.document.addEventListener("pointerlockchange", this.methodOnPointerLockChange.bind(this), false);
        this.#params.document.addEventListener("pointerlockerror", this.methodOnPointerLockError.bind(this), false);

        //
        this.#elementButton = this.#params.document.createElement("button");
        this.#elementButton.innerText = "PointerLock";
        this.#elementButton.style.position = "fixed";
        this.#elementButton.style.bottom = "0";
        this.#elementButton.style.left = "calc(50% - 45px)";
        this.#elementButton.style.right = "calc(50% - 45px)";
        this.#elementButton.style.width = "90px";
        this.#elementButton.style.fontSize = "11px";
        this.#elementButton.addEventListener("click", ((e) => this.methodOnClickButton(e)));
        this.#params.document.body.appendChild(this.#elementButton);
    }

    methodUpdate(timeElapsed, timeDelta)
    {
    }

    //

    async methodOnClickButton(e)
    {
        await this.#params.renderer.domElement.requestPointerLock();
    }

    methodOnPointerLockChange(e)
    {
        //
        const res = this.methodGetIsPointerLocked();
        if(!res)
        {
            this.#isVisibleButton = true;
            this.#elementButton.style.display = "block";
        }
        else {
            this.#isVisibleButton = false;
            this.#elementButton.style.display = "none";
        }
    }
    methodOnPointerLockError(e)
    {
        
    }

    methodGetIsPointerLocked()
    {
        const res = (this.#params.document.pointerLockElement == null || this.#params.document.pointerLockElement == undefined || this.#params.document.pointerLockElement !== this.#params.renderer.domElement);

        return !res;
    }
}
