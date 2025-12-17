// Plasma Burst Shaders (Used by the Player's E/Shift ability)

export const plasmaVertexShader = `
uniform float time;
uniform float duration; 
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying float vLightningContrast; // New varying to pass lightning contrast to Fragment

// --- UTILITY: 3D HASH/RANDOM FUNCTION ---
float rand(vec3 p) {
    p  = fract(p * 0.3183099 + .1);
    p *= p.xyz + p.yzx;
    return fract((p.x + p.y) * p.z);
}
// --- END UTILITY ---

// --- UTILITY: SMOOTHSTEP FUNCTION ---
// Cubic easing for smoother interpolation
vec3 smoothstep3(vec3 edge0, vec3 edge1, vec3 x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * (3.0 - 2.0 * x);
}
// --- END UTILITY ---

// --- UTILITY: 3D VALUE NOISE FUNCTION ---
// Interpolates the hash values at the corners of the grid for smooth noise.
float valueNoise3D(vec3 p) {
    vec3 i = floor(p); // Integer grid coordinate
    vec3 f = fract(p); // Fractional position within the cell
    
    // Smooth interpolation factor (using smoothstep)
    vec3 u = smoothstep3(vec3(0.0), vec3(1.0), f); 

    // Look up random values at the 8 corners of the cell
    float v000 = rand(i);
    float v100 = rand(i + vec3(1.0, 0.0, 0.0));
    float v010 = rand(i + vec3(0.0, 1.0, 0.0));
    float v110 = rand(i + vec3(1.0, 1.0, 0.0));
    float v001 = rand(i + vec3(0.0, 0.0, 1.0));
    float v101 = rand(i + vec3(1.0, 0.0, 1.0));
    float v011 = rand(i + vec3(0.0, 1.0, 1.0));
    float v111 = rand(i + vec3(1.0, 1.0, 1.0));

    // Interpolate along X
    float a = mix(v000, v100, u.x);
    float b = mix(v010, v110, u.x);
    float c = mix(v001, v101, u.x);
    float d = mix(v011, v111, u.x);

    // Interpolate along Y
    float e = mix(a, b, u.y);
    float g = mix(c, d, u.y);

    // Interpolate along Z
    return mix(e, g, u.z);
}
// --- END UTILITY ---

void main() {
    vNormal = normal;
    vPosition = position;
    vUv = uv;

    // 1. Calculate Normalized Progress (0.0 to 1.0)
    float progress = time / duration;

    // Radial expansion over time: scale from 1.0 (initial) up to 15.0 (maxRadius)
    float maxScale = 15.0; 
    float expandFactor = 1.0 + progress * (maxScale - 1.0); 
    
    vec3 displacedPosition = position;
    
    // Apply the necessary large expansion
    displacedPosition *= expandFactor; 

    // 2. Lightning Geometry Displacement (Vertex Shader)
    vec3 noisePos = displacedPosition * 0.15; 
    noisePos += vec3(time * 0.5, time * 0.3, time * 0.6); 
    
    // Use the smooth interpolated noise instead of the sharp hash noise
    float smoothNoise = valueNoise3D(noisePos * 10.0); // 10.0 controls the feature size

    // Apply high contrast to the smooth noise to create the lightning veins
    // We use a high power on the *smooth* noise to sharpen the lines
    float lightningDisplacement = pow(smoothNoise, 15.0); 

    // Pass the contrast value to the fragment shader for coloring the veins
    vLightningContrast = lightningDisplacement;
    
    // Apply outward displacement only along the lightning veins
    // Displacement intensity is reduced slightly, but still visible
    displacedPosition += normal * lightningDisplacement * 0.2 * progress * expandFactor; 

    // Simple vertex displacement for general shimmer (kept low)
    float shimmer = sin(position.x * 5.0 + time * 3.0) * 0.1 +
                    cos(position.y * 5.0 + time * 2.5) * 0.1;
    displacedPosition += normal * shimmer * 0.05; 

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
varying float vLightningContrast; // Received from Vertex Shader

void main() {
    // Normalized time (0 to 1) for a single, non-repeating burst
    float progress = time / duration;
    
    // Define the Christmas palette 
    vec3 green = vec3(0.0, 1.0, 0.0);
    vec3 red = vec3(1.0, 0.1, 0.1); 
    vec3 white = vec3(1.0); // For the lightning core

    // 1. Create Turbulent Red/Green Plasma Flow (Swirl)
    float swirlSpeed = 8.0;
    float swirlIntensity = 5.0;
    float noiseFactor = (
        sin(vPosition.x * swirlIntensity + time * swirlSpeed) +
        cos(vPosition.y * swirlIntensity - time * swirlSpeed * 1.3) +
        sin(vPosition.z * swirlIntensity + time * swirlSpeed * 0.8)
    );

    float mixFactor = noiseFactor / 6.0 + 0.5;
    mixFactor = smoothstep(0.3, 0.7, mixFactor); 
    
    vec3 festiveColor = mix(red, green, mixFactor);

    // Combine Shimmer and Festive Color
    float bandFrequency = 10.0;
    float brightness = 0.5 + 0.5 * cos(vUv.x * bandFrequency + time * 5.0) + 
                       0.5 + 0.5 * sin(vUv.y * bandFrequency * 0.5 + time * 4.0);

    vec3 color = festiveColor * (brightness * 0.8 + 0.2); 
    
    // --- LIGHTNING GLOW OVERLAY ---
    // vLightningContrast is non-zero only along the geometrically displaced veins.
    
    // 2. Strong White Core: Overlay a bright white core for the lightning
    color = mix(color, white, vLightningContrast); 

    // 3. Colored Bloom: Add a strong green/red glow around the white core for bloom
    // Use the turbulent festive color to make the bloom dynamic
    color += festiveColor * vLightningContrast * 4.0; // Increased intensity for better glow


    // 4. Center Glow (fresnel-like effect for the rim)
    vec3 rimGlowColor = vec3(1.0, 0.8, 0.0); 
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float rim = 1.0 - dot(normalize(vNormal), viewDir);
    rim = pow(rim, 2.0);
    color += rimGlowColor * rim * 1.5; 

    // 5. Fade Out (Alpha)
    float fadeOut = smoothstep(0.7, 1.0, progress); 
    float alpha = 1.0 - fadeOut;
    
    // Ensure the alpha completely kills the glow at the end
    alpha *= (1.0 - progress * 0.2); // slight overall fade down

    gl_FragColor = vec4(color, alpha);
}
`;
