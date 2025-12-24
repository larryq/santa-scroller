import * as THREE from "three";
export class House {
  constructor(x, y, scene, houseBaseMesh) {
    this.width = 12; // adjust to taste
    this.height = 6;
    this.scene = scene;
    this.houseBaseMesh = houseBaseMesh;

    const geometry = new THREE.BoxGeometry(this.width, this.height, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffddaa,
      emissive: 0x442200,
      emissiveIntensity: 0.4,
    });

    if (this.houseBaseMesh) {
      // Clone the loaded scene object
      this.mesh = houseBaseMesh.clone();
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          // Ensure each clone has a unique material instance so they don't share color changes
          child.material = child.material.clone();
          child.material.emissiveIntensity = 0.5;
          //child.material.emissive.setHex(this.originalColor);
        }
      });
    } else {
      this.mesh = new THREE.Mesh(geometry, material);
    }
    this.mesh.scale.set(2.5, 2.5, 2.5);
    this.mesh.rotation.y = Math.PI;
    this.mesh.position.set(x, y, -5); // behind gameplay
    this.scene.add(this.mesh);

    this.hasReceivedPresent = false;
  }

  update(deltaFactor) {
    // Parallax speed
    this.mesh.position.x -= 5 * deltaFactor;
  }

  remove() {
    // this.scene.remove(this.mesh);
    // this.mesh.geometry.dispose();
    // this.mesh.material.dispose();
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
  }
}
