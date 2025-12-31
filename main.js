import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SPEED,
  BURST_COOLDOWN_SECONDS,
  ENEMY_SPAWN_TIME,
  POWERUP_SPAWN_TIME,
  ENEMY_SPAWN_X,
  ENEMY_DESPAWN_X,
  CRUISER_DETONATE_X,
  BOUNDARY_X,
  BOUNDARY_Y,
  INITIAL_SHIELD_HP,
  PowerUpType,
} from "./constants.js";

import * as THREE from "three";
import { initializeClassGlobals } from "./GameClasses.js";

import { Game } from "./Game.js";
import { PlayerState } from "./PlayerState.js";
import { Chaser } from "./Chaser.js";
import { Cruiser } from "./Cruiser.js";
import { Scout } from "./Scout.js";
import { Projectile } from "./Projectile.js";
import { Burst } from "./Burst.js";
import { PlasmaBurst } from "./PlasmaBurst.js";
import { PowerUp } from "./PowerUp.js";
import { House } from "./House.js";
import { PresentSparkle } from "./PresentSparkle.js";
import { DeliveryPopup } from "./DeliveryPopup.js";
import { Shield } from "./Shield.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// --- Three.js Globals (State) ---
let scene, camera, renderer, starfield;
let playerMesh;
const clock = new THREE.Clock();
let animationFrameId = null;

// --- Game State ---
let game, keys, playerState;
let frameCount = 0;
let timeSinceEnemySpawn = 0;
let timeSincePowerupSpawn = 0;
let isGameOver = false;
let gltfLoader;
let scoutBaseMesh = null;
let house1BaseMesh = null;
let TripleShotBaseMesh = null;
let christmasBallBaseMesh = null;
let presentMesh = null;
let sleighMesh = null;
let cruiserMesh = null;
let chaserMesh = null;
let shield = null;
let shieldMesh = null;
let isScoutModelLoaded = false;

// --- Game Arrays (Objects holding mesh and state) ---
let enemyProjectiles = [];
let projectiles = [];
let enemies = [];
let bursts = [];
let powerups = [];
let houses = [];
let presentSparkles = [];
let deliveryPopups = [];
let container = null;

// --- Utility Functions ---

/**
 * Initializes the Three.js scene, camera, and renderer.
 */
function initThree() {
  scene = new THREE.Scene();
  container = document.getElementById("three-container");

  if (container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  // Setup Camera
  camera = new THREE.PerspectiveCamera(
    75,
    CANVAS_WIDTH / CANVAS_HEIGHT,
    0.01,
    5000
  );
  camera.position.set(0, 0, 40);
  camera.rotation.set(0, 0, 0);

  // Setup Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  if (container) {
    container.appendChild(renderer.domElement);
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(0, 10, 10);
  scene.add(directionalLight);
}

function onWindowResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

/**
 * Creates a background starfield.
 */
function createStarfield() {
  const vertices = [];
  const MIN_DISTANCE = 150; // no stars within 150 units of origin
  for (let i = 0; i < 1000; i++) {
    let x, y, z, dist;
    do {
      x = THREE.MathUtils.randFloatSpread(500);
      y = THREE.MathUtils.randFloatSpread(500);
      z = THREE.MathUtils.randFloatSpread(500);
      dist = Math.sqrt(x * x + y * y + z * z);
    } while (dist < MIN_DISTANCE);
    vertices.push(x, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
  });

  starfield = new THREE.Points(geometry, material);
  scene.add(starfield);
}

/**
 * Shows the game over/message box.
 */
function showMessageBox(title, text) {
  document.getElementById("messageTitle").textContent = title;
  document.getElementById("messageText").textContent = text;
  document.getElementById("messageBox").style.display = "flex";
  isGameOver = true;
}
// Export globally for the HTML button's onclick
window.showMessageBox = showMessageBox;

/**
 * Hides the custom message box.
 */
function hideMessageBox() {
  document.getElementById("messageBox").style.display = "none";
  isGameOver = false;
}
// Export globally for the HTML button's onclick
window.hideMessageBox = hideMessageBox;

/**
 * Updates the UI elements.
 */
function updateUI() {
  document.getElementById("score").textContent = game.score;
  document.getElementById("hp").textContent = playerState.hp;

  const burstUi = document.getElementById("burst-cooldown");
  if (playerState.burstCooldown > 0) {
    const seconds = Math.ceil(playerState.burstCooldown);
    burstUi.textContent = `Burst (E/Shift): ${seconds}s`;
    burstUi.style.color = "#f97316";
  } else {
    burstUi.textContent = "Burst (E/Shift): Ready";
    burstUi.style.color = "#10b981";
  }

  const tsStatus = document.getElementById("triple-shot-status");
  if (playerState.isTripleShotActive) {
    const seconds = Math.ceil(playerState.tripleShotTimer);
    tsStatus.textContent = `Triple Shot: ${seconds}s`;
    tsStatus.style.color = "#10b981";
  } else {
    tsStatus.textContent = "";
  }

  const shieldFill = document.getElementById("shield-fill");
  const shieldPercentage = (playerState.shieldHp / INITIAL_SHIELD_HP) * 100;
  shieldFill.style.width = `${Math.max(0, shieldPercentage)}%`;
  shieldFill.style.backgroundColor =
    playerState.shieldHp > 0 ? "#58a6ff" : "#555";
}

/**
 * Checks for collision between two meshes using simple radius distance.
 */
function checkCollision(mesh1, mesh2, radius1, radius2) {
  if (!mesh1 || !mesh2) return false;
  const distance = mesh1.position.distanceTo(mesh2.position);
  return distance < radius1 + radius2;
}

function loadModels() {
  gltfLoader = new GLTFLoader();

  //robot model courtest of three.js examples-- https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb
  const modelUrl = "/models/Robot.glb";
  //const modelUrl = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";
  const houseModelUrl = "/models/house1.glb";
  const tripleShotURL = "/models/RocketLauncher.gltf"; //launcher courtesy of https://quaternius.com/packs/toonshootergamekit.html
  const christmasBallURL = "/models/green_christmas_ball.glb";
  const presentURL = "/models/present_drop.glb";
  const sleighURL = "/models/sleigh.glb"; //sleigh courtesy of https://www.turbosquid.com/3d-models/christmas-sleigh-3d-model-2497551
  const cruiserURL = "/models/saucer1.glb";
  const chaserURL = "/models/chaser.glb";
  const shieldURL = "/models/shield.glb";

  return new Promise((resolve) => {
    let loadedCount = 0;

    const checkDone = () => {
      loadedCount++;
      if (loadedCount === 9) resolve();
    };

    // Load scout
    gltfLoader.load(
      modelUrl,
      (gltf) => {
        scoutBaseMesh = gltf.scene;
        scoutBaseMesh.scale.set(1.5, 1.5, 1.5);
        scoutBaseMesh.rotation.y = Math.PI;
        isScoutModelLoaded = true;
        console.log("Scout model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading scout:", error);
        isScoutModelLoaded = true;
        checkDone();
      }
    );

    // Load house
    gltfLoader.load(
      houseModelUrl,
      (gltf) => {
        house1BaseMesh = gltf.scene;
        house1BaseMesh.scale.set(1.5, 1.5, 1.5);
        console.log("House model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading house:", error);
        checkDone();
      }
    );
    // Load Triple Shot model
    gltfLoader.load(
      tripleShotURL,
      (gltf) => {
        TripleShotBaseMesh = gltf.scene;
        TripleShotBaseMesh.scale.set(3.0, 3.0, 3.0);
        console.log("Triple Shot model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading Triple Shot:", error);
        checkDone();
      }
    );
    // Load christmas ball projectile  model
    gltfLoader.load(
      christmasBallURL,
      (gltf) => {
        christmasBallBaseMesh = gltf.scene;
        //christmasBallBaseMesh.scale.set(3.0, 3.0, 3.0);
        christmasBallBaseMesh.rotation.y = Math.PI / 2;
        console.log("Christmas ball model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading Christmas ball:", error);
        checkDone();
      }
    );
    gltfLoader.load(
      presentURL,
      (gltf) => {
        presentMesh = gltf.scene;
        console.log("Present model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading Present:", error);
        checkDone();
      }
    );
    gltfLoader.load(
      sleighURL,
      (gltf) => {
        sleighMesh = gltf.scene;
        console.log("Sleigh model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading Sleigh:", error);
        checkDone();
      }
    );
    gltfLoader.load(
      cruiserURL,
      (gltf) => {
        cruiserMesh = gltf.scene;
        console.log("Cruiser model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading Cruiser:", error);
        checkDone();
      }
    );
    gltfLoader.load(
      chaserURL,
      (gltf) => {
        chaserMesh = gltf.scene;
        console.log("Chaser model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading Chaser:", error);
        checkDone();
      }
    );
    gltfLoader.load(
      shieldURL,
      (gltf) => {
        shieldMesh = gltf.scene;
        console.log("Shield model loaded successfully.");
        checkDone();
      },
      undefined,
      (error) => {
        console.error("Error loading Shield:", error);
        checkDone();
      }
    );
  });
}

// --- Player Functions ---

/**
 * Creates and sets up the player's mesh and state.
 */
function createPlayer() {
  if (playerMesh) scene.remove(playerMesh);
  if (sleighMesh) {
    // Clone the loaded scene object
    playerMesh = sleighMesh.clone();
    playerMesh.position.copy(playerMesh.position);
    playerMesh.scale.set(3.0, 3.0, 3.0);
    playerMesh.rotation.y = Math.PI / 2;
    playerMesh.traverse((child) => {
      if (child.isMesh) {
        // Ensure each clone has a unique material instance so they don't share color changes
        child.material = child.material.clone();
        //child.material.emissiveIntensity = 0.5;
      }
    });
  }

  scene.add(playerMesh);
  //create shield
  shield = new Shield(0x00ffff, game, playerMesh, scene);
  playerState = new PlayerState(
    BURST_COOLDOWN_SECONDS,
    updateUI,
    showMessageBox,
    playerMesh,
    playerState,
    scene,
    game,
    shield
  );
}

/**
 * Creates and launches projectiles.
 */
function shoot() {
  if (!playerMesh) return;
  // Standard single shot
  const p1 = new Projectile(
    playerMesh.position.x,
    playerMesh.position.y,
    playerMesh.position.z - 2,
    scene,
    christmasBallBaseMesh
  );
  projectiles.push(p1);

  // Triple shot implementation (fixed to Y-axis)
  if (playerState.isTripleShotActive) {
    // Projectile 2: Offset UP on the Y-axis
    const p2 = new Projectile(
      playerMesh.position.x,
      playerMesh.position.y + 1,
      playerMesh.position.z - 2,
      scene,
      christmasBallBaseMesh
    );
    // Projectile 3: Offset DOWN on the Y-axis
    const p3 = new Projectile(
      playerMesh.position.x,
      playerMesh.position.y - 1,
      playerMesh.position.z - 2,
      scene,
      christmasBallBaseMesh
    );
    projectiles.push(p2, p3);
  }
}

/**
 * Activates the kinetic burst.
 */
function activateBurst() {
  if (!playerMesh) return;
  const b = new PlasmaBurst(
    playerMesh.position.x,
    playerMesh.position.y,
    playerMesh.position.z,
    0xbd232fff,
    //0x58a6ff,
    scene
  );
  bursts.push(b);
}

/**
 * Spawns a power-up in a random Y location.
 */
function spawnPowerUp() {
  const x = ENEMY_SPAWN_X;
  const y = THREE.MathUtils.randFloatSpread(BOUNDARY_Y * 2);

  const type =
    Math.random() < 0.65 ? PowerUpType.TRIPLE_SHOT : PowerUpType.SHIELD;

  // Pass updateUI so the class can update the UI after effect application
  powerups.push(
    new PowerUp(
      x,
      y,
      type,
      updateUI,
      scene,
      playerState,
      TripleShotBaseMesh,
      shieldMesh
    )
  );
}

function spawnInitialHouses() {
  houses.forEach((h) => h.remove());
  houses = [];

  const startX = -BOUNDARY_X * 3;
  const endX = BOUNDARY_X * 4; // extend far to the right
  const spacing = 20; // distance between houses

  for (let x = startX; x < endX; x += spacing) {
    houses.push(new House(x, -BOUNDARY_Y - 12, scene, house1BaseMesh));
  }
}

// --- Core Game Functions ---

/**
 * Sets up the game state and Three.js environment.
 */
function setupGame() {
  initThree();

  // Initialize main game object
  game = new Game(updateUI);
  keys = {};

  // Clean up and reset arrays
  projectiles.forEach((p) => p.remove());
  enemies.forEach((e) => {
    if (e.mesh) e.die();
  });
  bursts.forEach((b) => b.remove());
  powerups.forEach((p) => p.remove());

  if (starfield) {
    scene.remove(starfield);
    starfield.geometry.dispose();
    starfield.material.dispose();
  }

  createStarfield();

  loadModels().then(() => {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.animation = "fadeOut 0.5s forwards";
    spawnInitialHouses();
    createPlayer();
    //initializeClassGlobals({ scene, playerMesh, game, playerState, bursts });
    updateUI();
    addEventListeners();

    isGameOver = false;
    frameCount = 0;
  });

  // Initialize global references in the classes after playerState is created
}

/**
 * Adds event listeners for keyboard input.
 */
function addEventListeners() {
  window.onkeydown = (e) => {
    keys[e.key.toLowerCase()] = true;
    if (
      e.key === " " ||
      e.key.startsWith("Arrow") ||
      e.key === "Shift" ||
      e.key === "e"
    ) {
      e.preventDefault();
    }
  };
  window.onkeyup = (e) => {
    keys[e.key.toLowerCase()] = false;
  };

  window.addEventListener("resize", onWindowResize);
}

/**
 * Handles player movement, abilities, and cooldowns.
 */
function handlePlayerInput(deltaFactor) {
  if (!playerMesh || isGameOver) return;

  const moveAmount = PLAYER_SPEED * deltaFactor;

  let dx = 0;
  let dy = 0;
  let movingForward = false; //only show sparkles when moving forward

  // Movement
  if (keys["a"] || keys["arrowleft"]) {
    dx -= moveAmount;
  }
  if (keys["d"] || keys["arrowright"]) {
    dx += moveAmount;
    movingForward = true;
  }

  if (keys["w"] || keys["arrowup"]) dy += moveAmount;
  if (keys["s"] || keys["arrowdown"]) dy -= moveAmount;

  // Apply movement and boundary checks
  playerMesh.position.x = Math.max(
    -BOUNDARY_X,
    Math.min(BOUNDARY_X, playerMesh.position.x + dx)
  );
  playerMesh.position.y = Math.max(
    -BOUNDARY_Y + 5,
    Math.min(BOUNDARY_Y + 1.5, playerMesh.position.y + dy)
  );

  // sparkles
  if (movingForward) {
    presentSparkles.push(
      new PresentSparkle(
        playerMesh.position.x - 2.7,
        playerMesh.position.y + 1.28,
        playerMesh.position.z,
        scene
      )
    );
  }

  // Cooldown management
  if (playerState.fireCooldown > 0) playerState.fireCooldown -= deltaFactor;
  if (playerState.burstCooldown > 0) playerState.burstCooldown -= deltaFactor;

  // Triple Shot Timer
  if (playerState.isTripleShotActive) {
    playerState.tripleShotTimer -= deltaFactor;
    if (playerState.tripleShotTimer <= 0) {
      playerState.isTripleShotActive = false;
      playerState.tripleShotTimer = 0;
    }
  }

  // Standard Shooting (Spacebar)
  if (keys[" "] && playerState.fireCooldown <= 0) {
    shoot();
    playerState.fireCooldown = playerState.maxFireCooldown;
  }

  // Kinetic Burst (E or Shift)
  if ((keys["e"] || keys["shift"]) && playerState.burstCooldown <= 0) {
    activateBurst();
    playerState.burstCooldown = playerState.maxBurstCooldown;
  }

  // Invulnerability management
  if (playerState.isInvulnerable) {
    playerState.invulnerabilityTimer -= deltaFactor;
    const timeMod = Math.floor(playerState.invulnerabilityTimer * 10);
    playerMesh.visible = timeMod % 2 === 0;
    if (playerState.invulnerabilityTimer <= 0) {
      playerState.isInvulnerable = false;
      playerMesh.visible = true;
    }
  }
  updateUI();
}

/**
 * Updates all game objects and handles collisions.
 */
function updateGame(deltaFactor) {
  frameCount++;

  // --- 1. Player Input/State ---
  handlePlayerInput(deltaFactor);

  // --- 2. Spawn Enemies and Powerups ---
  spawnEnemiesAndPowerups(deltaFactor);

  // --- 3. Update and Filter Arrays ---
  updateArrays(deltaFactor);

  // --- 4. Collision Detection ---

  checkProjectileCollisions();
  checkEnemyProjectileCollisions();
  updateShield(deltaFactor);

  // B. Burst-Enemy Collisions
  bursts.forEach((b) => {
    if (b.isActive) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (!e.mesh) continue;
        // Note: The Burst class must implement its own check using its current radius
        if (checkCollision(b.mesh, e.mesh, b.currentRadius, e.radius)) {
          if (e.takeDamage(b.damage)) {
            enemies.splice(j, 1);
          }
        }
      }
    }
  });

  // C. Player-Enemy Collisions
  checkPlayerCollisions();
}

function spawnEnemiesAndPowerups(deltaFactor) {
  timeSinceEnemySpawn += deltaFactor;
  if (timeSinceEnemySpawn >= ENEMY_SPAWN_TIME) {
    const x = ENEMY_SPAWN_X;
    const y = THREE.MathUtils.randFloatSpread(BOUNDARY_Y * 2);

    const enemyChance = Math.random();

    if (enemyChance < 0.3) {
      enemies.push(
        new Chaser(
          x,
          y,
          Burst,
          game,
          scene,
          playerMesh,
          playerState,
          bursts,
          chaserMesh
        )
      );
    } else if (enemyChance < 0.6) {
      enemies.push(
        new Cruiser(
          x,
          y,
          game,
          CRUISER_DETONATE_X,
          Burst,
          scene,
          playerMesh,
          playerState,
          bursts,
          cruiserMesh,
          enemyProjectiles
        )
      );
    } else {
      enemies.push(
        new Scout(
          x,
          y,
          game,
          scoutBaseMesh,
          scene,
          playerMesh,
          playerState,
          bursts,
          Burst
        )
      );
    }
    timeSinceEnemySpawn = 0;
  }

  timeSincePowerupSpawn += deltaFactor;
  if (timeSincePowerupSpawn >= POWERUP_SPAWN_TIME) {
    spawnPowerUp();
    timeSincePowerupSpawn = 0;
  }
}

function updateArrays(deltaFactor) {
  projectiles.forEach((p) => p.update(deltaFactor));
  bursts.forEach((b) => {
    b.update(deltaFactor);
  });
  enemyProjectiles.forEach((p) => p.update(deltaFactor));
  enemies.forEach((e) => e.update(deltaFactor));
  powerups.forEach((p) => p.update(deltaFactor));
  updateHouses(deltaFactor);
  deliveryPopups.forEach((dp) => dp.update(deltaFactor, camera));

  // Filter out expired objects
  clearProjectilesFromScreen();
  const activeBursts = bursts.filter((b) => b.isActive);
  bursts.length = 0; // Clear the array, keeping the reference
  bursts.push(...activeBursts); // Push back the active elements

  enemies = enemies.filter((e) => {
    const shouldKeep =
      e.mesh && e.mesh.position.x > ENEMY_DESPAWN_X && e.hp > 0;
    if (!shouldKeep) {
      if (e.mesh) e.die();
    }
    return shouldKeep;
  });

  powerups = powerups.filter((p) => {
    const shouldKeep = p.mesh && p.mesh.position.x > ENEMY_DESPAWN_X;
    if (!shouldKeep && p.mesh) p.remove();
    return shouldKeep;
  });

  presentSparkles = presentSparkles.filter((ps) => ps.update(deltaFactor));
}

function clearProjectilesFromScreen() {
  projectiles = projectiles.filter((p) => {
    const shouldKeep = p.mesh && p.mesh.position.x < BOUNDARY_X + 5;
    if (!shouldKeep && p.mesh) p.remove();
    return shouldKeep;
  });

  const filtered = enemyProjectiles.filter((p) => {
    const shouldKeep =
      p.mesh &&
      p.mesh.position.x > -BOUNDARY_X &&
      p.mesh.position.x < BOUNDARY_X &&
      p.mesh.position.y > -BOUNDARY_Y &&
      p.mesh.position.y < BOUNDARY_Y;

    if (!shouldKeep && p.mesh) p.remove();
    return shouldKeep;
  });
  enemyProjectiles.length = 0;
  enemyProjectiles.push(...filtered);
}

function checkPlayerCollisions() {
  if (playerMesh) {
    enemies = enemies.filter((e) => {
      if (!e.mesh) return false;
      let playerRadius;
      if (playerState.shield.isShieldVisible()) {
        playerRadius = playerState.shield.getRadius();
      } else {
        playerRadius = playerState.radius;
      }
      if (checkCollision(playerMesh, e.mesh, playerRadius, e.radius)) {
        playerState.takeDamage(1); // All enemy types deal 1 damage on crash (if not shield)
        e.die();
        return false;
      }
      return true;
    });

    // D. Player-PowerUp Collisions
    const nextPowerups = [];
    powerups.forEach((p) => {
      if (!p.mesh) return;
      if (checkCollision(playerMesh, p.mesh, playerState.radius, p.radius)) {
        p.applyEffect();
      } else {
        nextPowerups.push(p);
      }
    });
    powerups = nextPowerups;
  }
}

function checkProjectileCollisions() {
  const nextProjectiles = [];

  // A. Projectile-Enemy Collisions
  projectiles.forEach((p) => {
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!e.mesh || !p.mesh) continue;
      if (checkCollision(p.mesh, e.mesh, p.radius, e.radius)) {
        if (e.takeDamage(p.damage)) {
          enemies.splice(j, 1);
        }
        p.remove();
        hit = true;
        break;
      }
    }
    if (!hit) {
      nextProjectiles.push(p);
    }
  });
  projectiles = nextProjectiles;
}

function updateShield(deltaFactor) {
  playerState.shield.update(deltaFactor);
}
//check if enemy projectiles hit player
function checkEnemyProjectileCollisions() {
  const nextProjectiles = [];
  let playerRadius;
  if (playerState.shield.isShieldVisible()) {
    playerRadius = playerState.shield.getRadius();
  } else {
    playerRadius = playerState.radius;
  }
  enemyProjectiles.forEach((p) => {
    if (!p.mesh) return; // skip invalid projectiles

    const hit = checkCollision(p.mesh, playerMesh, p.radius, playerRadius);

    if (hit) {
      playerState.takeDamage(p.damage);
      p.remove();
    } else {
      nextProjectiles.push(p);
    }
  });

  enemyProjectiles.length = 0;
  enemyProjectiles.push(...nextProjectiles);
}

function updateHouses(deltaFactor) {
  houses.forEach((h) => h.update(deltaFactor));
  houses.forEach((h) => {
    if (h.mesh.position.x < -BOUNDARY_X - 20) {
      // Move house to the far right to recycle it
      h.mesh.position.x += BOUNDARY_X * 2 + 40;
      h.hasReceivedPresent = false;
    }
  });
  if (playerMesh) {
    houses.forEach((h) => {
      if (
        !h.hasReceivedPresent &&
        playerMesh.position.x > h.mesh.position.x - 2 &&
        playerMesh.position.x < h.mesh.position.x + 2
      ) {
        dropPresentIntoHouse(h, deltaFactor);
        h.hasReceivedPresent = true;
      }
    });
  }
}

function dropPresentIntoHouse(house, deltaFactor) {
  let wobbleTimer = 0;
  let fallTimer = wobbleTimer;
  let present = null;

  if (presentMesh) {
    // Clone the loaded scene object
    present = presentMesh.clone();
    present.scale.set(0.67, 0.67, 0.67);
    present.position.copy(playerMesh.position);
    present.position.y -= 7; // start slightly below the sleigh
    present.traverse((child) => {
      if (child.isMesh) {
        // Ensure each clone has a unique material instance so they don't share color changes
        child.material = child.material.clone();
        //child.material.emissiveIntensity = 0.5;
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
    present = new THREE.Mesh(geometry, material);
  }

  scene.add(present);

  // store the present's starting X
  const baseX = present.position.x;

  // IMPORTANT: match the house's actual scroll speed
  const houseScrollSpeed = 5; //need to get rid of this magic number later

  const fall = () => {
    if (!present.parent) return;

    // wobble
    wobbleTimer += deltaFactor;
    fallTimer += deltaFactor;

    const wobbleSpeed = 2;
    const wobbleAmount = 0.2;
    const wobble = Math.sin(wobbleTimer * wobbleSpeed) * wobbleAmount;

    // rotation wobble
    present.rotation.y += wobble * 0.02;
    //present.rotation.z = wobble * 1.5;
    present.rotation.y -= Math.PI / 120;

    // ✅ horizontal tracking: match house movement exactly
    const scrollOffset = houseScrollSpeed * fallTimer;

    // ✅ apply wobble relative to baseX
    present.position.x = baseX - scrollOffset + wobble;

    // vertical fall
    present.position.y -= 7 * deltaFactor;

    // landing
    if (present.position.y <= house.mesh.position.y + house.height / 2) {
      if (present) {
        // Safely dispose of resources within the GLTF model's hierarchy
        present.traverse((child) => {
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
        scene.remove(present);
      }

      deliveryPopups.push(
        new DeliveryPopup(
          house.mesh.position.x,
          house.mesh.position.y + house.height + 1,
          house.mesh.position.z,
          camera,
          "Delivered!",
          scene
        )
      );
      return;
    }

    requestAnimationFrame(fall);
  };

  fall();
}

/**
 * The main rendering loop.
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const deltaFactor = Math.min(delta, 0.05);

  if (!isGameOver) {
    updateGame(deltaFactor);
  }

  // Starfield parallax effect
  const time = clock.getElapsedTime();
  camera.position.x = Math.sin(time * 0.1) * 2;
  starfield.rotation.y += 0.0005;

  renderer.render(scene, camera);
}

/**
 * Restarts the game by cleaning up and setting up a new session.
 */
function restartGame() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  setupGame();
  animate();
}
// Export globally for the HTML button's onclick
window.restartGame = restartGame;

// --- Initialization ---

window.onload = function () {
  setupGame();
  animate(); // Start the animation loop
};
