export class PresentSparkle {
  constructor(x, y, z, scene) {
    const geometry = new THREE.SphereGeometry(0.2, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);

    this.life = 0.5; // seconds
    this.fadeSpeed = 1.5; // opacity fade per second

    // twinkle state
    this.twinkleTimer = Math.random() * Math.PI * 2;
    this.twinkleSpeed = 10 + Math.random() * 10;
    this.scene = scene;

    // slight color variation
    this.baseColor = new THREE.Color(1, 1, 1);
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
