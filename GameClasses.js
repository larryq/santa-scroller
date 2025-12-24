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
