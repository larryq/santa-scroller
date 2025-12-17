// GLSL code for the Vertex Shader
export const vertexShader = `
  uniform float time;
  uniform float duration;
  uniform vec3 explosionColor;
  uniform bool isShotOrExploding;
  
  attribute float size;
  attribute vec3 velocity; // Unique velocity vector for each particle

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    float progress = time / duration;
    
    // Safety clamp (0.0 to 1.0)
    progress = clamp(progress, 0.0, 1.0); 

    // Calculate position: start position + (velocity * progress * a non-linear scale)
    // Using a power function for a fast start and slowdown
    vec3 animatedPosition = position + velocity * (progress * progress * 40.0);
    
    vec4 mvPosition = modelViewMatrix * vec4(animatedPosition, 1.0);

    // Particle size, scaled by progress
    if(isShotOrExploding) { // this is a shot
         gl_PointSize = size;
    } else { // this is an explosion                
         gl_PointSize = size * (1.0 - progress) * (500.0 / -mvPosition.z);
    } 

    // Fade opacity as it expands
    vOpacity = 1.0 - progress;
    
    // Set color (use the uniform explosionColor)
    vColor = explosionColor;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// GLSL code for the Fragment Shader
export const fragmentShader = `
  uniform sampler2D pointTexture; // Texture to make points round/soft
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    // Distance from the center of the point
    float dist = length(gl_PointCoord - vec2(0.5));
    
    // Basic soft circle shape for the particle
    float circle = 1.0 - dist;
    
    if (circle < 0.01) discard; // Cut off hard edges

    // Final color and opacity
    gl_FragColor = vec4(vColor, vOpacity * circle);
  }
`;
