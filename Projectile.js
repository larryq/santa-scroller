import { PROJECTILE_SPEED } from "./constants.js";
import * as THREE from "three";

export class Projectile {
  constructor(x, y, z, scene, christmasBallBaseMesh) {
    this.radius = 0.5;
    this.damage = 1;
    this.scene = scene;
    this.christmasBallBaseMesh = christmasBallBaseMesh;

    if (this.christmasBallBaseMesh) {
      this.mesh = christmasBallBaseMesh.clone();
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          // Ensure each clone has a unique material instance so they don't share color changes
          child.material = child.material.clone();
          child.material.emissiveIntensity = 0.8;
        }
      });
    } else {
      const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
      });
      this.mesh = new THREE.Mesh(geometry, material);
    }
    this.mesh.position.set(x, y, z);
    this.scene.add(this.mesh);
  }

  update(deltaFactor) {
    this.mesh.position.x += PROJECTILE_SPEED * deltaFactor;
    this.mesh.rotation.y += 0.1 * deltaFactor * 60;
  }

  remove() {
    if (this.christmasBallBaseMesh) {
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
  }
}
