import { CRUISER_SPEED } from "./constants.js";
import { Enemy } from "./Enemy.js";
import { Burst } from "./Burst.js";

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
    bursts
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
    this.mesh.position.set(x, y, 0);
    this.type = "CRUISER";
    this.detonateX = CRUISER_DETONATE_X;
    this.BurstClass = BurstClass;
    this.game = game;
    this.playerMesh = playerMesh;
    this.playerState = playerState;
    this.bursts = bursts;
    this.scene = scene;
    this.scene.add(this.mesh);
  }

  update(deltaFactor) {
    super.update(deltaFactor);
    if (!this.mesh) return;

    // Check for self-detonation point
    if (this.mesh.position.x <= this.detonateX) {
      this.explode();
    }
  }

  explode() {
    // Apply damage to player if close (requires playerState to be globally available)
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
    super.die();
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
    super.die();
  }
}
