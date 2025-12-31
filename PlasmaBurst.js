import {
  plasmaVertexShader,
  plasmaFragmentShader,
} from "./shaders/PlasmaBurstShaders.js";

import {
  plasmaVertexShader2,
  plasmaFragmentShader2,
} from "./shaders/PlasmaBurstShaders2.js";
import * as THREE from "three";

export class PlasmaBurst {
  constructor(x, y, z, color = 0xbd232fff, scene) {
    this.maxRadius = 15; // Max radius for collision detection
    this.currentRadius = 1; // Used for collision checking in main.js
    this.damage = 10;
    this.isActive = true;

    // Shader Animation State
    this.timer = 0;
    this.duration = 1.5; // Duration in seconds for the burst animation

    this.mesh = this.createMesh(x, y, z, color);
    this.mesh.position.set(x, y, z);

    this.uniforms = this.mesh.material.uniforms;

    this.mesh2 = this.createMesh2(x, y, z, color);
    this.mesh2.position.set(x, y, z);
    this.uniforms2 = this.mesh2.material.uniforms;
    this.scene = scene;

    this.scene.add(this.mesh2);
  }

  createMesh(x, y, z, color) {
    const geometry = new THREE.IcosahedronGeometry(1.0, 2); // Start small, will expand via shader

    // Define the custom shader material for the plasma effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        duration: { value: this.duration },
        plasmaColor: { value: new THREE.Color(color) },
      },
      vertexShader: plasmaVertexShader,
      fragmentShader: plasmaFragmentShader,
      transparent: true,
      depthWrite: false, // For better transparency sorting
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }
  createMesh2(x, y, z, color) {
    const geometry = new THREE.SphereGeometry(1.0, 128, 128);

    const uniforms2 = {
      uTime: { value: 0.0 },
      uCenter: { value: new THREE.Vector3(0.0, 0.0, 0.0) },

      uCoreColor: { value: new THREE.Color(0x44ccff) },
      uArcColor: { value: new THREE.Color(0xffffff) },
      //uGlowColor: { value: new THREE.Color(0x88ffff) },
      uGlowColor: { value: new THREE.Color(0xffffff) },
      uGlowStrength: { value: 2.0 },
      uFresnelPower: { value: 3.0 },
      uArcThreshold: { value: 0.4 },
      uBaseRadius: { value: 1.5 },
      uExpandSpeed: { value: 4.0 },
      uNoiseScale: { value: 7.0 },
      uDisplaceAmp: { value: 7.0 },
      uArcThreshold: { value: 0.4 },
      uIntensity: { value: 0.5 },
      uGlowStrength: { value: 2.0 },
    };

    const material2 = new THREE.ShaderMaterial({
      uniforms: uniforms2,
      vertexShader: plasmaVertexShader2,
      fragmentShader: plasmaFragmentShader2,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geometry, material2);
    return mesh;
  }

  update(deltaFactor) {
    if (!this.isActive || !this.mesh) return;
    // Increment timer
    this.timer += deltaFactor;

    // Update shader uniform
    this.uniforms2.uTime.value = this.timer;
    this.uniforms.time.value = this.timer;

    // Update collision radius for main.js (increases linearly)

    this.currentRadius = (this.timer / this.duration) * this.maxRadius;

    // Check if animation is complete
    const progress = this.timer / this.duration;

    if (progress >= 1) {
      this.isActive = false;
      this.remove();
      return;
    }
  }

  remove() {
    this.isActive = false;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    if (this.mesh2) {
      this.scene.remove(this.mesh2);
      this.mesh2.geometry.dispose();
      this.mesh2.material.dispose();
      this.mesh2 = null;
    }
  }
}
