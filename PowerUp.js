import {
  PowerUpType,
  TRIPLE_SHOT_DURATION_SECONDS,
  INITIAL_SHIELD_HP,
} from "./constants.js";
import * as THREE from "three";

export class PowerUp {
  constructor(
    x,
    y,
    type,
    updateUI,
    scene,
    playerState,
    TripleShotBaseMesh,
    shieldMesh
  ) {
    this.radius = 2;
    this.type = type;
    this.updateUI = updateUI;
    this.scene = scene;
    this.playerState = playerState;
    this.TripleShotBaseMesh = TripleShotBaseMesh;
    this.shieldMesh = shieldMesh;

    let color;
    if (type === PowerUpType.TRIPLE_SHOT) {
      if (this.TripleShotBaseMesh) {
        this.mesh = TripleShotBaseMesh.clone();
        this.mesh.traverse((child) => {
          if (child.isMesh) {
            // Ensure each clone has a unique material instance so they don't share color changes
            child.material = child.material.clone();
          }
        });
      } else {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.8,
        });
        this.mesh = new THREE.Mesh(geometry, material);
      }
    } else if (type === PowerUpType.SHIELD) {
      if (this.shieldMesh) {
        this.mesh = shieldMesh.clone();
        this.mesh.traverse((child) => {
          if (child.isMesh) {
            // Ensure each clone has a unique material instance so they don't share color changes
            child.material = child.material.clone();
          }
        });
      } else {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
        });
        this.mesh = new THREE.Mesh(geometry, material);
      }
      this.mesh.scale.set(0.35, 0.35, 0.35);
    }
    this.mesh.position.set(x, y, 0);
    this.scene.add(this.mesh);
  }

  update(deltaFactor) {
    this.mesh.rotation.y += 0.03 * deltaFactor * 60;
    this.mesh.position.x -= 0.05 * deltaFactor * 60;
  }

  applyEffect() {
    if (this.type === PowerUpType.TRIPLE_SHOT) {
      this.playerState.isTripleShotActive = true;
      this.playerState.tripleShotTimer = TRIPLE_SHOT_DURATION_SECONDS;
    } else if (this.type === PowerUpType.SHIELD) {
      this.playerState.shieldHp = INITIAL_SHIELD_HP;
      this.playerState.shield.show(true);
    }
    this.remove();
    this.updateUI();
  }

  remove() {
    if (this.TripleShotBaseMesh) {
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
    } else if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.mesh = null;
  }
}
