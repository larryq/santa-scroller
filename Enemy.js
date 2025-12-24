import * as THREE from "three";
export class Enemy {
  constructor(radius, hp, scoreValue, color, speed, game, scene) {
    this.radius = radius;
    this.hp = hp;
    this.scoreValue = scoreValue;
    this.speed = speed;
    this.type = "BASE";
    this.game = game;
    this.scene = scene;

    const geometry = new THREE.DodecahedronGeometry(this.radius * 0.8);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.originalColor = color;
  }

  update(deltaFactor) {
    if (!this.mesh) return;
    this.mesh.position.x -= this.speed * deltaFactor;
    this.mesh.position.y += (Math.random() - 0.5) * 0.1;
    this.mesh.rotation.y += 0.05 * deltaFactor * 60;

    if (this.knockbackVelocityX > 0) {
      this.mesh.position.x += this.knockbackVelocityX;
      this.mesh.position.y += this.knockbackVelocityY;

      // Slow the bounce down over time
      this.knockbackVelocityX *= 0.9;
      this.knockbackVelocityY *= 0.9;
    }
  }

  takeDamage(damage) {
    this.hp -= damage;
    this.knockbackVelocityX = 0.2;
    this.knockbackVelocityY = (Math.random() - 0.5) * 0.1;

    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.setHex(0xffaaaa);
      setTimeout(() => {
        if (this.mesh) this.mesh.material.color.setHex(this.originalColor);
      }, 100);
    }
    this.mesh.position.x += 0.5; // Knockback effect

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.game.addScore(this.scoreValue, this.game.updateUI);
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.mesh = null;
  }
}
