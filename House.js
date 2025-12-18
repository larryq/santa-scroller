export class House {
  constructor(x, y, scene) {
    this.width = 12; // adjust to taste
    this.height = 6;
    this.scene = scene;

    const geometry = new THREE.BoxGeometry(this.width, this.height, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffddaa,
      emissive: 0x442200,
      emissiveIntensity: 0.4,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, -5); // behind gameplay
    this.scene.add(this.mesh);

    this.hasReceivedPresent = false;
  }

  update(deltaFactor) {
    // Parallax speed
    this.mesh.position.x -= 5 * deltaFactor;
  }

  remove() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
