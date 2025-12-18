import { Enemy } from "./Enemy.js";
import { CHASER_SPEED } from "./constants.js";

export class Chaser extends Enemy {
  constructor(x, y, game, scene, playerMesh, playerState, bursts) {
    super(
      3,
      3,
      100,
      0xff4444,
      CHASER_SPEED,
      game,
      scene,
      playerMesh,
      playerState,
      bursts
    );
    this.originalColor = 0xff4444;
    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
    this.type = "CHASER";
  }
}
