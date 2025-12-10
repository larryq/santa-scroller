import {
  INITIAL_SHIELD_HP,
  TRIPLE_SHOT_DURATION_SECONDS,
  CHASER_SPEED,
  CRUISER_SPEED,
  PROJECTILE_SPEED,
  PowerUpType,
  SCOUT_SPEED,
} from "./constants.js";

import { vertexShader, fragmentShader } from "./shaders/BurstShaders.js";
import {
  plasmaVertexShader,
  plasmaFragmentShader,
} from "./shaders/PlasmaBurstShaders.js";
// Global references will be assumed to be defined by main.js
// We use utility functions (like updateUI) which are expected to be available globally (or passed in)
// For this structure, we rely on main.js to manage the state and provide the global variables.

// Helper function definitions are placed here to avoid circular imports.
// They rely on globals: scene, playerMesh, game, playerState, bursts, updateUI.
let scene, playerMesh, game, playerState, bursts;

/**
 * Initializes the required global state references from main.js.
 * This is called once during setup in main.js
 */
export function initializeClassGlobals(globals) {
  ({ scene, playerMesh, game, playerState, bursts } = globals);
}

// --- Game Class ---

export class Game {
  constructor(updateUI) {
    this.score = 0;
    this.updateUI = updateUI; // To be set by main.js
  }

  addScore(points, updateUI) {
    this.score += points;
    if (this.updateUI) {
      this.updateUI();
    }
  }
}

// --- PlayerState Class ---

export class PlayerState {
  constructor(BURST_COOLDOWN_SECONDS, updateUI, showMessageBox) {
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

      if (playerMesh) {
        playerMesh.material.emissive.setHex(0xffff00);
        setTimeout(() => {
          if (playerMesh) playerMesh.material.emissive.setHex(0x00ffff);
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
    if (playerMesh) scene.remove(playerMesh);
    playerMesh = null;
    this.showMessageBox(
      "Game Over!",
      `Well done, Santa. Your final score is: ${game.score}`
    );
  }
}

// --- Base Enemy Class ---

export class Enemy {
  constructor(radius, hp, scoreValue, color, speed, game) {
    this.radius = radius;
    this.hp = hp;
    this.scoreValue = scoreValue;
    this.speed = speed;
    this.type = "BASE";
    this.game = game; // Reference to the Game instance

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
    this.mesh.rotation.y += 0.05 * deltaFactor * 60;
  }

  takeDamage(damage) {
    this.hp -= damage;

    if (this.mesh) {
      this.mesh.material.color.setHex(0xffaaaa);
      setTimeout(() => {
        if (this.mesh) this.mesh.material.color.setHex(this.originalColor);
      }, 100);
    }

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.game.addScore(this.scoreValue, game.updateUI);
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.mesh = null;
  }
}

// --- Chaser Enemy (Original) ---

export class Chaser extends Enemy {
  constructor(x, y, game) {
    super(3, 3, 100, 0xff4444, CHASER_SPEED, game);
    this.originalColor = 0xff4444;
    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
    this.type = "CHASER";
  }
}

// --- Cruiser Enemy (Bomber) ---

export class Cruiser extends Enemy {
  constructor(x, y, game, CRUISER_DETONATE_X, BurstClass) {
    super(4, 5, 250, 0x44ffaa, CRUISER_SPEED, game);
    this.originalColor = 0x44ffaa;
    this.mesh.position.set(x, y, 0);
    this.type = "CRUISER";
    this.detonateX = CRUISER_DETONATE_X;
    this.BurstClass = BurstClass;
    scene.add(this.mesh);
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
      playerMesh &&
      playerState &&
      this.mesh.position.distanceTo(playerMesh.position) < 10
    ) {
      playerState.takeDamage(2); // Higher damage than a crash
    }

    // Visual explosion effect
    const explosion = new this.BurstClass(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z,
      true // isExplosion
    );
    explosion.currentRadius = 1;
    explosion.maxRadius = 10;
    explosion.damage = 0; // Already applied damage above, this is just visual
    explosion.speed = Burst.EXPLOSION_SPEED;
    bursts.push(explosion);

    // Mark for removal
    this.hp = 0;
    this.die();
  }
}

export class Scout extends Enemy {
  // Requires 'scoutBaseMesh' which is a clone of the loaded GLTF model from main.js
  constructor(x, y, game, scoutBaseMesh) {
    // Smallest, fastest enemy, low HP
    super(2.5, 1, 50, 0x9999ff, SCOUT_SPEED, game);
    this.originalColor = 0x9999ff;
    this.type = "SCOUT";

    // Replace the base mesh with the GLTF clone
    if (this.mesh) {
      // Remove the placeholder geometry from the super() call
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    // Use the loaded GLTF model if available, otherwise use a fallback
    if (scoutBaseMesh) {
      // Clone the loaded scene object
      this.mesh = scoutBaseMesh.clone();
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          // Ensure each clone has a unique material instance so they don't share color changes
          child.material = child.material.clone();
          child.material.emissiveIntensity = 0.5;
          child.material.emissive.setHex(this.originalColor);
        }
      });
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

  // Override update for a special, slightly erratic movement pattern
  update(deltaFactor) {
    // Move forward (left)
    this.mesh.position.x -= this.speed * deltaFactor;

    // Add gentle sine wave movement for vertical dodging
    this.mesh.position.y +=
      Math.sin(this.mesh.position.x * 0.5) * 0.05 * deltaFactor * 60;

    // Rotate the ship mesh
    this.mesh.rotation.y += 0.1 * deltaFactor * 60;
  }

  die() {
    this.game.addScore(this.scoreValue, game.updateUI);

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
      scene.remove(this.mesh);
    }
    this.mesh = null;
  }
}

// --- Projectile Class ---

export class Projectile {
  constructor(x, y, z) {
    this.radius = 0.5;
    this.damage = 1;

    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);
  }

  update(deltaFactor) {
    this.mesh.position.x += PROJECTILE_SPEED * deltaFactor;
  }

  remove() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

export class Burst {
  static KINETIC_SPEED = 2.1;
  static EXPLOSION_SPEED = 8.1;
  constructor(x, y, z, isExplosion = false, color = 0x58a6ff) {
    this.maxRadius = isExplosion ? 10 : 15;
    this.currentRadius = 1;
    this.damage = isExplosion ? 0 : 10;
    this.isActive = true;
    this.speed = isExplosion ? Burst.EXPLOSION_SPEED : Burst.KINETIC_SPEED;
    this.timer = 0;
    this.duration = 1.5; // Duration of the burst effect in seconds

    this.mesh = this.createMesh(x, y, z, color);
    this.mesh.position.set(x, y, z);
    this.uniforms = this.mesh.material.uniforms;
    scene.add(this.mesh);
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
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false, // Ensures transparent particles render correctly
      blending: THREE.AdditiveBlending, // Good for explosions
    });

    // Use THREE.Points (particle system) instead of THREE.Mesh
    const points = new THREE.Points(geometry, material);
    points.position.set(x, y, z);
    scene.add(points);
    return points;
  }

  update(deltaFactor) {
    if (!this.isActive || !this.mesh) return;

    this.timer += deltaFactor;
    this.uniforms.time.value = this.timer; // Update the uniform for the shader!

    const progress = this.timer / this.duration;

    if (progress >= 1) {
      this.isActive = false;
      this.remove();
      return;
    }
  }

  remove() {
    this.isActive = false;
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

export class PlasmaBurst {
  constructor(x, y, z, color = 0x58a6ff) {
    this.maxRadius = 15; // Max radius for collision detection
    this.currentRadius = 1; // Used for collision checking in main.js
    this.damage = 10;
    this.isActive = true;

    // Shader Animation State
    this.timer = 0;
    this.duration = 1.5; // Duration in seconds for the burst animation

    this.mesh = this.createMesh(x, y, z, color);
    this.mesh.position.set(x, y, z);

    // Cache uniforms for easy access in update()
    this.uniforms = this.mesh.material.uniforms;

    scene.add(this.mesh);
  }

  createMesh(x, y, z, color) {
    const geometry = new THREE.IcosahedronGeometry(1.0, 2); // Start small, will expand via shader

    // Define the custom shader material for the plasma effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        duration: { value: this.duration },
        plasmaColor: { value: new THREE.Color(color) },
      },
      vertexShader: plasmaVertexShader,
      fragmentShader: plasmaFragmentShader,
      transparent: true,
      depthWrite: false, // For better transparency sorting
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  update(deltaFactor) {
    if (!this.isActive || !this.mesh) return;

    // Increment timer
    this.timer += deltaFactor;

    // Update shader uniform
    this.uniforms.time.value = this.timer;

    // Update collision radius for main.js (increases linearly)
    this.currentRadius = (this.timer / this.duration) * this.maxRadius;

    // Check if animation is complete
    const progress = this.timer / this.duration;

    if (progress >= 1) {
      this.isActive = false;
      this.remove();
      return;
    }
  }

  remove() {
    this.isActive = false;
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }
}

export class PowerUp {
  constructor(x, y, type, updateUI) {
    this.radius = 2;
    this.type = type;
    this.updateUI = updateUI;

    let color;
    if (type === PowerUpType.TRIPLE_SHOT) {
      color = 0x00ff00;
    } else if (type === PowerUpType.SHIELD) {
      color = 0xff0000;
    }

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
    });
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.set(x, y, 0);
    scene.add(this.mesh);
  }

  update(deltaFactor) {
    this.mesh.rotation.y += 0.03 * deltaFactor * 60;
    this.mesh.position.x -= 0.05 * deltaFactor * 60;
  }

  applyEffect() {
    if (this.type === PowerUpType.TRIPLE_SHOT) {
      playerState.isTripleShotActive = true;
      playerState.tripleShotTimer = TRIPLE_SHOT_DURATION_SECONDS;
    } else if (this.type === PowerUpType.SHIELD) {
      playerState.shieldHp = INITIAL_SHIELD_HP;
    }
    this.remove();
    this.updateUI();
  }

  remove() {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.mesh = null;
  }
}
