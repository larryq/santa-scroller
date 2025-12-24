import { Enemy } from "./Enemy.js";
import { SCOUT_SPEED } from "./constants.js";

import * as THREE from "three";

export class Scout extends Enemy {
  // Requires 'scoutBaseMesh' which is a clone of the loaded GLTF model from main.js
  constructor(
    x,
    y,
    game,
    scoutBaseMesh,
    scene,
    playerMesh,
    playerState,
    bursts
  ) {
    // Smallest, fastest enemy, low HP
    super(2.5, 1, 50, 0x9999ff, SCOUT_SPEED, game, scene);
    this.originalColor = 0x9999ff;
    this.type = "SCOUT";

    if (this.mesh) {
      // Remove the placeholder geometry from the super() call
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    // Use the loaded GLTF model if available, otherwise use a fallback
    if (scoutBaseMesh) {
      // Clone the loaded scene object
      this.mesh = scoutBaseMesh.clone();
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          // Ensure each clone has a unique material instance so they don't share color changes
          child.material = child.material.clone();
          child.material.emissiveIntensity = 0.5;
          child.material.emissive.setHex(this.originalColor);
        }
      });
    } else {
      // Fallback in case main.js failed to load the model
      const geometry = new THREE.BoxGeometry(
        this.radius * 0.8,
        this.radius * 0.8,
        this.radius * 0.8
      );
      const material = new THREE.MeshPhongMaterial({
        color: this.originalColor,
        emissive: this.originalColor,
        emissiveIntensity: 0.5,
      });
      this.mesh = new THREE.Mesh(geometry, material);
    }

    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
  }

  // Override update for a special, slightly erratic movement pattern
  update(deltaFactor) {
    // Move forward (left)
    this.mesh.position.x -= this.speed * deltaFactor;

    // Add gentle sine wave movement for vertical dodging
    this.mesh.position.y +=
      Math.sin(this.mesh.position.x * 0.5) * 0.05 * deltaFactor * 60;

    // Rotate the ship mesh
    this.mesh.rotation.y += 0.1 * deltaFactor * 60;
  }

  die() {
    this.game.addScore(this.scoreValue, this.game.updateUI);

    if (this.mesh) {
      // Safely dispose of resources within the GLTF model's hierarchy
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();

          // Handle single or multi-material disposal
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.scene.remove(this.mesh);
    }
    this.mesh = null;
  }
}
