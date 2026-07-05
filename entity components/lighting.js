// imports
// base
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";// import * as THREE from "three";
// ECS
import {EntityComponent} from "../classes/ECS/entity_component.js";

//
export class EntityComponentDirectionalLight extends EntityComponent
{
    // bare minimum
    #params = null;

    //
    #light = null;

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
        const color = this.#params.color ?? 0xffffff;
        const intensity = this.#params.intensity ?? 1.0;

        //
        this.#light = new THREE.DirectionalLight(color, intensity);
        this.#light.position.copy(this.#params.position ?? new THREE.Vector3(5, 8, 5));
        this.#light.target.position.copy(this.#params.target ?? new THREE.Vector3(0, 0, 0));

        //
        this.#light.castShadow = true;
        const shadowCamSize = this.#params.shadowCamSize ?? 15;
        this.#light.shadow.camera.left = -shadowCamSize;
        this.#light.shadow.camera.right = shadowCamSize;
        this.#light.shadow.camera.top = shadowCamSize;
        this.#light.shadow.camera.bottom = -shadowCamSize;
        this.#light.shadow.camera.near = 0.5;
        this.#light.shadow.camera.far = 50;
        this.#light.shadow.mapSize.set(2048, 2048);
        this.#light.shadow.bias = -0.0005;

        //
        this.#params.scene.add(this.#light);
        this.#params.scene.add(this.#light.target);
    }

    methodUpdate(timeElapsed, timeDelta)
    {
    }
}
