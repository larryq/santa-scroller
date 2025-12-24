import * as THREE from "three";

export class PresentSparkle {
  constructor(x, y, z, scene) {
    const geometry = new THREE.SphereGeometry(0.2, 6, 6);
    // const material = new THREE.MeshBasicMaterial({
    //   color: 0xffffff,
    //   transparent: true,
    //   opacity: 1.0,
    //   blending: THREE.AdditiveBlending,
    //   depthWrite: false,
    // });
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000, // Base color (keep it dark/black)
      emissive: this.baseColor, // Your random Red or Green
      emissiveIntensity: 1, // Boost the "glow" factor
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending, // You can keep this for the "overlap" glow!
    });
    this.colors = [0xff0000, 0x00ff00]; // Hex codes for Red and Green

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);

    this.life = 1.5; // seconds
    this.fadeSpeed = 1.5; // opacity fade per second

    // twinkle state
    this.twinkleTimer = Math.random() * Math.PI * 2;
    this.twinkleSpeed = 10 + Math.random() * 10;
    this.scene = scene;

    // slight color variation
    let randomColor =
      this.colors[Math.floor(Math.random() * this.colors.length)];
    this.baseColor = new THREE.Color(randomColor);
    this.colorShift = Math.random() * 0.9;

    this.scene.add(this.mesh);
  }

  update(delta) {
    this.life -= delta;
    //this.mesh.material.opacity -= this.fadeSpeed * delta;
    // twinkle brightness
    this.twinkleTimer += this.twinkleSpeed * delta;
    const twinkle = (Math.sin(this.twinkleTimer) + 1) * 0.5; // 0–1

    this.mesh.material.opacity = Math.max(0, this.life) * (0.5 + twinkle * 0.5);
    // slight color shimmer
    const r = 1.0;
    const g = 1.0 - twinkle * this.colorShift;
    const b = 1.0 - twinkle * this.colorShift;
    this.mesh.material.color.setRGB(r, g, b);
    this.mesh.material.color.setRGB(
      this.baseColor.r,
      this.baseColor.g,
      this.baseColor.b
    );
    console.log(this.baseColor);
    // gentle drift
    this.mesh.position.x += (Math.random() - 0.5) * 0.1;
    this.mesh.position.y += (Math.random() - 0.5) * 0.1;

    if (this.life <= 0) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      return false; // remove from array
    }

    return true;
  }
}
