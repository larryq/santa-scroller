export class PlayerState {
  constructor(
    BURST_COOLDOWN_SECONDS,
    updateUI,
    showMessageBox,
    playerMesh,
    playerState,
    scene,
    game
  ) {
    this.hp = 10;
    this.fireCooldown = 0;
    this.maxFireCooldown = 0.25;
    this.burstCooldown = 0;
    this.maxBurstCooldown = BURST_COOLDOWN_SECONDS;
    this.radius = 2;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;

    this.isTripleShotActive = false;
    this.tripleShotTimer = 0;
    this.shieldHp = 0;
    this.playerMesh = playerMesh;
    this.playerState = playerState;
    this.scene = scene;
    this.game = game;

    // External function references
    this.updateUI = updateUI;
    this.showMessageBox = showMessageBox;
  }

  takeDamage(damage) {
    if (this.isInvulnerable) return;

    let damageToPlayer = damage;

    // 1. Check Shield
    if (this.shieldHp > 0) {
      const absorbed = Math.min(damage, this.shieldHp);
      this.shieldHp -= absorbed;
      damageToPlayer -= absorbed;

      if (this.playerMesh) {
        this.playerMesh.material.emissive.setHex(0xffff00);
        setTimeout(() => {
          if (this.playerMesh)
            this.playerMesh.material.emissive.setHex(0x00ffff);
        }, 100);
      }
    }

    // 2. Apply leftover damage to HP
    if (damageToPlayer > 0) {
      this.hp -= damageToPlayer;

      if (this.hp <= 0) {
        this.die();
      } else {
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 2.0;
      }
    }
    this.updateUI();
  }

  die() {
    if (this.playerMesh) this.scene.remove(this.playerMesh);
    this.playerMesh = null;
    this.showMessageBox(
      "Game Over!",
      `Well done, Santa. Your final score is: ${this.game.score}`
    );
  }
}
