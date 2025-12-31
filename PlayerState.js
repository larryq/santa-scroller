export class PlayerState {
  constructor(
    BURST_COOLDOWN_SECONDS,
    updateUI,
    showMessageBox,
    playerMesh,
    playerState,
    scene,
    game,
    shield
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
    this.shield = shield;

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
      console.log(
        `Shield absorbed ${absorbed} damage, remaining shield HP: ${this.shieldHp}`
      );

      if (this.shieldHp <= 0 && this.shield) {
        this.shield.show(false);
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
