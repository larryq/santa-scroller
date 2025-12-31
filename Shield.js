import * as THREE from "three";

const SHIELD_OFFSET = 1.5; // how far the shield sits from the player's bounding sphere

export class Shield {
  constructor(color, game, playerMesh, scene) {
    this.color = color;
    this.game = game;
    this.scene = scene;
    this.playerMesh = playerMesh;
    this.isVisible = false;

    if (!this.color) {
      this.color = 0x00ffff;
    }

    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.3,
    });

    const box = new THREE.Box3().setFromObject(playerMesh);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this.radius = sphere.radius + SHIELD_OFFSET;

    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);

    this.mesh = new THREE.Mesh(geometry, material);
    this.originalPositions =
      this.mesh.geometry.attributes.position.array.slice();

    this.mesh.visible = this.isVisible;
    this.scene.add(this.mesh);
  }

  update(deltaFactor) {
    this.mesh.position.copy(this.playerMesh.position);

    this.rotateColors();
    const pos = this.mesh.geometry.attributes.position;
    const time = performance.now() * 0.02;

    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      const ox = this.originalPositions[ix];
      const oy = this.originalPositions[iy];
      const oz = this.originalPositions[iz];

      // Wobble strength
      const wobble = 0.45;

      pos.array[ix] = ox + Math.sin(time + ox * 2) * wobble;
      pos.array[iy] = oy + Math.sin(time + oy * 2) * wobble;
      pos.array[iz] = oz + Math.sin(time + oz * 2) * wobble;
    }

    pos.needsUpdate = true;
  }

  rotateColors() {
    const t = performance.now() * 0.002;

    // Shift color hue
    const hue = Math.sin(t * 0.5) * 0.1 + 0.55; // stays near cyan
    this.mesh.material.color.setHSL(hue, 1, 0.5);
  }

  show(isVisible) {
    this.isVisible = isVisible;
    this.mesh.visible = isVisible;
  }

  isShieldVisible() {
    return this.isVisible;
  }

  getRadius() {
    return this.radius;
  }
}
