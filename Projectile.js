import { PROJECTILE_SPEED } from "./constants.js";

export class Projectile {
  constructor(x, y, z, scene) {
    this.radius = 0.5;
    this.damage = 1;
    this.scene = scene;

    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);
    this.scene.add(this.mesh);
  }

  update(deltaFactor) {
    this.mesh.position.x += PROJECTILE_SPEED * deltaFactor;
  }

  remove() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
