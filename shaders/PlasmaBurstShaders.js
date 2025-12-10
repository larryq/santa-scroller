// Plasma Burst Shaders (Used by the Player's E/Shift ability)

export const plasmaVertexShader = `
uniform float time;
uniform float duration; // <-- ADDED: Needed for correct expansion calculation
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vNormal = normal;
    vPosition = position;
    vUv = uv;

    // 1. Calculate Normalized Progress (0.0 to 1.0)
    float progress = time / duration;

    // Radial expansion over time: scale from 1.0 (initial) up to 15.0 (maxRadius)
    // 14.0 is calculated as (maxScale - 1.0) -> (15.0 - 1.0)
    float maxScale = 15.0; 
    float expandFactor = 1.0 + progress * (maxScale - 1.0); // Now correctly scales up to 15x
    
    vec3 displacedPosition = position;
    
    // Apply the necessary large expansion
    displacedPosition *= expandFactor; 

    // Simple vertex displacement based on time and position for a 'shimmer'
    float displacement = sin(position.x * 5.0 + time * 3.0) * 0.1 +
                         cos(position.y * 5.0 + time * 2.5) * 0.1;
    
    // Apply minor displacement for the plasma shimmer effect
    displacedPosition += normal * displacement * 0.2; 

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
`;

export const plasmaFragmentShader = `
uniform float time;
uniform float duration;
uniform vec3 plasmaColor;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    // Normalized time (0 to 1) for a single, non-repeating burst
    float progress = time / duration;

    // 1. Plasma Coloring (creates moving, colored bands)
    float bandFrequency = 10.0;
    float brightness = 0.5 + 0.5 * cos(vUv.x * bandFrequency + time * 5.0) + 
                       0.5 + 0.5 * sin(vUv.y * bandFrequency * 0.5 + time * 4.0);

    // Color gradient based on plasmaColor
    vec3 color = plasmaColor * (brightness * 0.8 + 0.2); 
    
    // 2. Center Glow (fresnel-like effect for the rim)
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float rim = 1.0 - dot(normalize(vNormal), viewDir);
    rim = pow(rim, 2.0);
    color += plasmaColor * rim * 1.5; // Add strong rim glow

    // 3. Fade Out (Alpha)
    // Fade the whole effect out as the burst nears its end
    float fadeOut = smoothstep(0.7, 1.0, progress); // Starts fading sharply after 70% duration
    float alpha = 1.0 - fadeOut;

    gl_FragColor = vec4(color, alpha);
}
`;
