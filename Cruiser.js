import { CRUISER_SPEED, ENEMY_PROJECTILE_SPEED } from "./constants.js";
import { Enemy } from "./Enemy.js";
import { Burst } from "./Burst.js";
import { Projectile } from "./Projectile.js";

const MIN_FIRE_DISTANCE = 8;

export class Cruiser extends Enemy {
  constructor(
    x,
    y,
    game,
    CRUISER_DETONATE_X,
    BurstClass,
    scene,
    playerMesh,
    playerState,
    bursts,
    cruiserMesh,
    projectiles
  ) {
    super(
      4,
      5,
      250,
      0x44ffaa,
      CRUISER_SPEED,
      game,
      scene,
      playerMesh,
      playerState,
      bursts
    );
    this.originalColor = 0x44ffaa;
    this.type = "CRUISER";
    //this.detonateX = CRUISER_DETONATE_X;
    this.BurstClass = BurstClass;
    this.game = game;
    this.playerMesh = playerMesh;
    this.playerState = playerState;
    this.bursts = bursts;
    this.scene = scene;
    this.flashDistance = 15; // how close to player before flashing
    this.isFlashing = false; // whether flashing has started
    this.flashTimer = 0; // how long it has been flashing
    this.flashDuration = 1.5; // seconds before explosion
    this.projectiles = projectiles;

    if (this.mesh) {
      // Remove the placeholder geometry from the super() call
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    // Use the loaded GLTF model if available, otherwise use a fallback
    if (cruiserMesh) {
      // Clone the loaded scene object
      this.mesh = cruiserMesh.clone();
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          // Ensure each clone has a unique material instance so they don't share color changes
          child.material = child.material.clone();
          child.material.emissiveIntensity = 1.0;
          //child.material.emissive.setHex(this.originalColor);
        }
      });
      this.mesh.scale.set(2.2, 2.2, 2.2);
    } else {
      // Fallback in case main.js failed to load the model
      const geometry = new THREE.BoxGeometry(
        this.radius * 0.8,
        this.radius * 0.8,
        this.radius * 0.8
      );
      const material = new THREE.MeshPhongMaterial({
        color: this.originalColor,
        emissive: this.originalColor,
        emissiveIntensity: 0.5,
      });
      this.mesh = new THREE.Mesh(geometry, material);
    }

    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
  }

  //   update_old(deltaFactor) {
  //     super.update(deltaFactor);
  //     if (!this.mesh) return;

  //     // Check for self-detonation point
  //     if (this.mesh.position.x <= this.detonateX) {
  //       this.explode();
  //     }
  //   }

  update(deltaFactor) {
    super.update(deltaFactor);
    if (!this.mesh) return;

    this.mesh.rotation.y += 0.05 * deltaFactor * 60;

    const dx = this.mesh.position.x - this.playerMesh.position.x;
    const dy = this.mesh.position.y - this.playerMesh.position.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // // 1. Start flashing when close enough
    // if (!this.isFlashing && distance <= this.flashDistance) {
    //   this.isFlashing = true;
    //   this.flashTimer = 0;
    // }

    // // 2. If flashing, animate and count down
    // if (this.isFlashing) {
    //   this.flashTimer += deltaFactor;

    //   // Flash effect: toggle visibility or material color
    //   const flash = Math.sin(this.flashTimer * 20) > 0;
    //   this.mesh.visible = flash;

    //   // After flashing long enough, explode
    //   if (this.flashTimer >= this.flashDuration) {
    //     this.mesh.visible = true; // ensure visible at explosion moment
    //     this.explode();
    //   }

    //   return;
    // }

    // 3. Fire projectiles periodically when not flashing, and dont fire too close
    if (
      Math.random() < 0.44 * deltaFactor &&
      !this.isFlashing &&
      distance > MIN_FIRE_DISTANCE
    ) {
      this.fireProjectile(this.projectiles);
    }
  }

  explode() {
    // Apply damage to player if close
    if (
      this.playerMesh &&
      this.playerState &&
      this.mesh.position.distanceTo(this.playerMesh.position) < 10
    ) {
      this.playerState.takeDamage(2); // Higher damage than a crash
    }

    // Visual explosion effect
    const explosion = new this.BurstClass(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z,
      false, // isShotOrExploding = false,
      0x58a6ff,
      this.scene
    );
    explosion.currentRadius = 1;
    explosion.maxRadius = 10;
    explosion.damage = 0; // Already applied damage above, this is just visual
    explosion.speed = Burst.EXPLOSION_SPEED;
    this.bursts.push(explosion);

    // Mark for removal
    this.hp = 0;
    //no score increase for self-detonation
    //this.game.addScore(this.scoreValue, this.game.updateUI);
    this.removeMesh();
  }

  die() {
    const explosion = new this.BurstClass(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z,
      true, // the Cruiser was shot, not exploded
      0x58a6ff,
      this.scene
    );
    this.bursts.push(explosion);
    this.game.addScore(this.scoreValue, this.game.updateUI);
    this.removeMesh();
  }

  removeMesh() {
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
    this.mesh = null;
  }

  fireProjectile(projectiles) {
    const dx = this.playerMesh.position.x - this.mesh.position.x;
    const dy = this.playerMesh.position.y - this.mesh.position.y;

    const angle = Math.atan2(dy, dx);

    const speedX = Math.cos(angle) * ENEMY_PROJECTILE_SPEED;
    const speedY = Math.sin(angle) * ENEMY_PROJECTILE_SPEED;

    const projectile = new Projectile(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z,
      this.scene,
      this.christmasBallBaseMesh
    );

    // Override update to use enemy speed
    projectile.update = function (deltaFactor) {
      this.mesh.position.x += speedX * deltaFactor;
      this.mesh.position.y += speedY * deltaFactor;
      //this.mesh.rotation.y += 0.1 * deltaFactor * 60;
    };

    this.projectiles.push(projectile);
  }
}
