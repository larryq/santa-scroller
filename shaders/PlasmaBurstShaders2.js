export const plasmaVertexShader2 = `
precision highp float;
uniform float uTime;
uniform vec3  uCenter;
uniform float uBaseRadius;
uniform float uExpandSpeed;
uniform float uNoiseScale;
uniform float uDisplaceAmp;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUV;
varying float vShellFactor;
varying float vRadius;
varying vec3 vViewPos;
varying vec3 vUnitDir;


// --- noise helpers unchanged ---
float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; ++i) {
        s += a * noise3(p);
        p *= 2.0;
        a *= 0.5;
    }
    return s;
}

void main() {
    float radius = uBaseRadius + uTime * uExpandSpeed;
    vRadius = radius;

    vec3 unitDir = normalize(position);
    vUnitDir = unitDir;

    vec3 basePos = unitDir * radius;

    

    float t = uTime * 2.8;
    //float n = fbm(unitDir * uNoiseScale + vec3(t * 0.3, -t * 0.21, t * 0.17));
    

    // float n = fbm((modelMatrix * vec4(unitDir, 0.0)).xyz * uNoiseScale
    //             + vec3(t * 0.9, -t * 0.7, t * 0.5));
    float n = fbm((modelMatrix * vec4(unitDir, 0.0)).xyz * (uNoiseScale * 1.2)
              + vec3(t * 0.6, -t * 0.4, t * 0.3));

    // Add a high-frequency twitch
    n += 0.15 * noise3(unitDir * (uNoiseScale * 4.0) + t * 2.0);
    float spike = smoothstep(0.6, 1.0, n);
    float displace = uDisplaceAmp * spike;

    vec3 displacedPos = basePos + normalize(normal) * displace;

    vec4 worldPos4 = modelMatrix * vec4(displacedPos, 1.0);
    vWorldPos = worldPos4.xyz;

    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vUV = uv;

    vec4 viewPos4 = viewMatrix * worldPos4;
    vViewPos = viewPos4.xyz;

    float shell = clamp((length(displacedPos) - (radius - uDisplaceAmp)) / (uDisplaceAmp * 2.0), 0.0, 1.0);
    vShellFactor = shell;

    gl_Position = projectionMatrix * viewMatrix * worldPos4;
}
    `;

export const plasmaFragmentShader2 = `
precision highp float;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUV;
varying float vShellFactor;
varying float vRadius;
varying vec3 vViewPos;
varying vec3 vUnitDir;

uniform vec3 uCenter;
uniform float uTime;

uniform vec3 uCoreColor;
uniform vec3 uArcColor;
uniform vec3 uGlowColor;
uniform float uIntensity;
uniform float uGlowStrength;
uniform float uFresnelPower;
uniform float uArcThreshold;
uniform float uNoiseScale;

// --- noise helpers unchanged ---
float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; ++i) {
        s += a * noise3(p);
        p *= 2.0;
        a *= 0.5;
    }
    return s;
}

void main() {

    float t = uTime * 1.3;
    float fil = fbm(vWorldPos * uNoiseScale + vec3(t * 0.27, -t * 0.19, t * 0.11));

    fil = smoothstep(uArcThreshold, 1.0, fil);
    //fil = pow(fil, 4.0);

    float dist = length(vViewPos);




    float core  = 1.0 - smoothstep(0.05 * vRadius, 0.2 *  vRadius, dist);
float shell = smoothstep(0.25 * vRadius, 0.55 * vRadius, dist)
            * (1.0 - smoothstep(0.55 * vRadius, 0.9 * vRadius, dist));
float glow  =      smoothstep(0.9 *  vRadius, 1.6 *  vRadius, dist) * uGlowStrength;


    vec3 uArcColorBottom = vec3(0.00, 0.70, 0.30);  // emerald green
    vec3 uArcColorTop    = vec3(1.00, 0.85, 0.30);  // warm gold
   
    float arcRand = noise3(vWorldPos * 3.7);

    vec3 arcColor = mix(uArcColorTop, uArcColorBottom, step(0.5, arcRand));

    // Height factor (world-space)
    float h = vUnitDir.y * 0.5 + 0.5;
    // Arc gradient color
    //arcColor = mix(uArcColorBottom, uArcColorTop, h);


    vec3 color = vec3(0.0);
    color += uCoreColor * core  * (0.3 + 0.7 * fil);
    color += arcColor * shell * fil * 1.8;
    color += uGlowColor * glow  * 0.33;                // a bit stronger glow
    // vec3 color = vec3(0.0);
    // color += uCoreColor * core * 0.2;
    // color += arcColor  * shell * fil * 3.0;
    // color += uGlowColor * glow * 0.1;

    float arcFlicker = 0.1 * sin(dot(vWorldPos, vec3(12.3, 7.1, 5.4)) + uTime * 20.0);
    color += arcFlicker * arcColor * fil;

    float pulse = 0.5 + 0.5 * sin(uTime * 12.0 + dist * 3.0);
    color *= (uIntensity * (0.8 + 0.2 * pulse));



    //float alpha = clamp(core + shell * 0.8 + glow * 0.6, 0.0, 1.0);
    float alpha = core * 0.9 + shell * 0.8 + glow * 0.5;
    alpha = clamp(alpha, 0.0, 1.0);
    alpha = max(alpha, 0.25);
    
    gl_FragColor = vec4(color, alpha);
    //gl_FragColor = vec4(vec3(fil), 1.0);
    //gl_FragColor = vec4(vec3(alpha), 1.0);

}

// void main() {

//     // Ignore noise, shells, core, glow – just test the gradient.
//    // float h = clamp((vViewPos.y / vRadius) * 0.5 + 0.5, 0.0, 1.0);
//     //float h = clamp((vWorldPos.y - (uCenter.y - vRadius)) / (2.0 * vRadius), 0.0, 1.0);
// float h = vUnitDir.y * 0.5 + 0.5;
//     vec3 uArcColorBottom = vec3(0.00, 0.70, 0.30);  // emerald green
//     vec3 uArcColorTop    = vec3(1.00, 0.85, 0.30);  // warm gold
//     vec3 arcColor = mix(uArcColorBottom, uArcColorTop, h);

//     gl_FragColor = vec4(arcColor, 1.0);
// }

`;
