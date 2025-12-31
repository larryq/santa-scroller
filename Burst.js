import { vertexShader, fragmentShader } from "./shaders/BurstShaders.js";
import * as THREE from "three";
export class Burst {
  static KINETIC_SPEED = 2.1;
  static EXPLOSION_SPEED = 8.1;
  constructor(x, y, z, isShotOrExploding = false, color = 0x58a6ff, scene) {
    this.maxRadius = isShotOrExploding ? 10 : 15;
    this.currentRadius = 1;
    this.damage = isShotOrExploding ? 0 : 10;
    this.isActive = true;
    this.speed = isShotOrExploding
      ? Burst.EXPLOSION_SPEED
      : Burst.KINETIC_SPEED;
    this.timer = 0;
    this.duration = 1.5; // Duration of the burst effect in seconds
    this.isShotOrExploding = isShotOrExploding;
    this.scene = scene;
    this.mesh = this.createMesh(x, y, z, color);
    this.mesh.position.set(x, y, z);
    this.uniforms = this.mesh.material.uniforms;
    this.scene.add(this.mesh);
  }

  createMesh(x, y, z, color) {
    const numParticles = 400;
    const geometry = new THREE.BufferGeometry();

    const positions = [];
    const velocities = [];
    const sizes = [];

    // Generate particle positions (starting point) and randomized velocities
    for (let i = 0; i < numParticles; i++) {
      positions.push(0, 0, 0); // All start at (0, 0, 0) relative to the burst mesh center

      // Randomly scatter particle velocities (spherical distribution)
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize(); // Create a normalized direction vector (length 1)

      // Scale the velocity magnitude
      const speed = 0.5 + Math.random() * 2.0;
      v.multiplyScalar(speed);

      velocities.push(v.x, v.y, v.z);
      sizes.push(1.0 + Math.random() * 2.0); // Random particle size
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute(
      "velocity",
      new THREE.Float32BufferAttribute(velocities, 3)
    );
    geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

    // Define the custom shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        // These will be updated every frame in the update method
        time: { value: 0.0 },
        duration: { value: this.duration },
        explosionColor: { value: new THREE.Color(color) },
        pointTexture: { value: null }, // Placeholder for texture if needed (can be ignored for now)
        isShotOrExploding: { value: this.isShotOrExploding },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false, // Ensures transparent particles render correctly
      blending: THREE.AdditiveBlending, // Good for explosions
    });

    const points = new THREE.Points(geometry, material);
    points.position.set(x, y, z);
    this.scene.add(points);
    return points;
  }

  update(deltaFactor) {
    if (!this.isActive || !this.mesh) return;

    this.timer += deltaFactor;
    this.uniforms.time.value = this.timer;

    const progress = this.timer / this.duration;

    if (progress >= 1) {
      this.isActive = false;
      this.remove();
      return;
    }
  }

  remove() {
    this.isActive = false;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
