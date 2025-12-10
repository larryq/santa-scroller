export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_SPEED = 30; // Units per second
export const PROJECTILE_SPEED = 60; // Units per second
export const CHASER_SPEED = 6; // Original Enemy Speed
export const CRUISER_SPEED = 5; // New Slower Enemy Speed (Bomber)
export const ENEMY_SPAWN_TIME = 1.5; // seconds per spawn
export const POWERUP_SPAWN_TIME = 10; // seconds per spawn
export const BURST_COOLDOWN_SECONDS = 3;
export const TRIPLE_SHOT_DURATION_SECONDS = 5;
export const INITIAL_SHIELD_HP = 5;
export const ENEMY_SPAWN_X = 50; // X-coordinate where enemies spawn (Right side)
export const ENEMY_DESPAWN_X = -50; // X-coordinate where enemies go off screen (Left side)
export const CRUISER_DETONATE_X = 5; // X-coordinate where Cruisers explode
export const BOUNDARY_X = 40; // Horizontal world space boundary
export const BOUNDARY_Y = 20; // Vertical world space boundary
export const PLAYER_BURST_COLOR = 0x58a6ff;
export const ENEMY_BURST_COLOR = 0xff0000; // Red (Hostile)
export const SCOUT_SPEED = 6;

// --- PowerUp Types ---

export const PowerUpType = {
  TRIPLE_SHOT: "TRIPLE_SHOT",
  SHIELD: "SHIELD",
};
