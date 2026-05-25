// #precision directive removed; rely on Three.js glslVersion to insert it
precision highp float;
precision highp int;

in vec2 vUv;
in vec4 vClipPos;

out vec4 outColor;

uniform sampler2D uMainTex;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform float uScale;
uniform vec2 uClamp;
uniform float uDotRadius;
uniform float uInputExposure;
uniform float uInputOffset;
uniform float uAASmoothness;
uniform float uAAStretch;
uniform int uLevel;
uniform bool uQuantizeDots;
uniform int uShape; // 0=circle...

// --- Bayer utilities (translated from HLSL) ---
uint spreadBits(uint x) {
    x = (x ^ (x << 8)) & 0x00ff00ffu;
    x = (x ^ (x << 4)) & 0x0f0f0f0fu;
    x = (x ^ (x << 2)) & 0x33333333u;
    x = (x ^ (x << 1)) & 0x55555555u;
    return x;
}

uint reverseBits(uint i) {
    i = ((i & 0xaaaaaaaau) >> 1) | ((i & 0x55555555u) << 1);
    i = ((i & 0xccccccccu) >> 2) | ((i & 0x33333333u) << 2);
    i = ((i & 0xf0f0f0f0u) >> 4) | ((i & 0x0f0f0f0fu) << 4);
    i = ((i & 0xff00ff00u) >> 8) | ((i & 0x00ff00ffu) << 8);
    i = (i >> 16) | (i << 16);
    return i;
}

float GetBayerFromCoordLevel_Direct(uvec2 p, uint level) {
    uint px = spreadBits(p.x);
    uint py = spreadBits(p.y);
    uint i = (px ^ py) | (px << 1u);
    i = reverseBits(i);
    uint shift = 32u - (2u * level);
    uint mask = 1u << (2u * level);
    return float(i >> shift) / float(mask);
}

// --- SDF functions (ported minimal set) ---

float dot2(vec2 v) { return dot(v,v); }

float SDF_Circle(vec2 p, float r) { return length(p) - r; }

float SDF_Square(vec2 p, float r) {
    vec2 d = abs(p) - r;
    return length(max(d, vec2(0.0))) + min(max(d.x,d.y), 0.0);
}

float sdHeart(in vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0) return length(p - vec2(0.25,0.75)) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p - vec2(0.0,1.0)), dot2(p - 0.5*max(p.x+p.y, 0.0)))) * sign(p.x - p.y);
}

float SDF(vec2 p, float radius) {
    if (uShape == 0) return SDF_Circle(p, radius);
    if (uShape == 1) return SDF_Square(p, radius);
    if (uShape == 9) return sdHeart(p / radius);
    // fallback
    return SDF_Circle(p, radius);
}

float AA_SDF(float value, float smoothness) {
    vec2 ddist = vec2(dFdx(value), dFdy(value));
    float w = 0.5 * clamp(length(ddist), 0.0, 1.0);
    w *= smoothness;
    return smoothstep(-w, w, -value);
}

// --- Frequency calculation (Rune) simplified ---

vec4 CalculateFrequency_Rune(vec2 uv_DitherTex, vec4 screenPos, vec2 dx, vec2 dy, int level, float scale) {
    mat2 matr = mat2(dx, dy);
    vec4 vectorized = vec4(dx, dy);
    float Q = dot(vectorized, vectorized);
    float R = determinant(matr);
    float discriminantSqr = max(0.0, Q*Q - 4.0*R*R);
    float discriminant = sqrt(discriminantSqr);
    vec2 freq = sqrt(vec2(Q + discriminant, Q - discriminant) * 0.5);
    float spacing = freq.y;
    float scaleExp = exp2(scale + float(level));
    spacing *= scaleExp;
    return vec4(freq, freq * scaleExp);
}

void main() {
    // sample texture and compute luminance
    vec3 tex = texture(uMainTex, vUv).rgb;
    float albedo = dot(vec3(0.299,0.587,0.114), tex);

    float luminance = albedo;
    luminance = clamp(luminance * uInputExposure + uInputOffset, uClamp.x, uClamp.y);

    float LEVEL = exp2(float(uLevel));
    float LEVEL_RESOLUTION = LEVEL;
    float LEVEL_PREV = float(max(0, uLevel - 1));
    float LEVEL_PREV_RESOLUTION = exp2(LEVEL_PREV);
    float LEVEL_DOTCOUNT = LEVEL_RESOLUTION * LEVEL_RESOLUTION;
    float LEVEL_PREV_DOTCOUNT = LEVEL_PREV_RESOLUTION * LEVEL_PREV_RESOLUTION;

    vec4 frequencies = CalculateFrequency_Rune(vUv, vClipPos, dFdx(vUv), dFdy(vUv), uLevel, uScale);
    float logLevel = log2(frequencies.w / max(luminance, 1e-6));
    float floorLog = floor(logLevel);
    float fracLog = fract(logLevel);

    vec2 tileUV = fract(vUv * exp2(-floorLog));
    vec2 cellUV = fract(tileUV * LEVEL_RESOLUTION) - 0.5;

    uvec2 cellCoord = uvec2(floor(tileUV * LEVEL_RESOLUTION));
    float b0 = GetBayerFromCoordLevel_Direct(cellCoord + uvec2(0u,0u), uint(uLevel));
    float b1 = GetBayerFromCoordLevel_Direct(cellCoord + uvec2(1u,0u), uint(uLevel));
    float b2 = GetBayerFromCoordLevel_Direct(cellCoord + uvec2(0u,1u), uint(uLevel));
    float b3 = GetBayerFromCoordLevel_Direct(cellCoord + uvec2(1u,1u), uint(uLevel));
    vec4 bayer = vec4(b0, b1, b2, b3);

    vec4 bayerMask = (bayer * LEVEL_DOTCOUNT) - LEVEL_PREV_DOTCOUNT;
    float numNewDots = LEVEL_DOTCOUNT - LEVEL_PREV_DOTCOUNT;
    float invisible = numNewDots * (1.0 - fracLog);
    vec4 scales = vec4(invisible) - bayerMask;
    if (uQuantizeDots) {
        scales = step(vec4(1.0), scales);
    } else {
        scales = clamp(scales, 0.0, 1.0);
    }

    vec4 scalar = vec4(1.0) / max((fracLog * 0.5 + 0.5) * luminance * scales, vec4(1e-6));
    vec2 sample0 = (cellUV + vec2(+0.5, +0.5)) * scalar.x;
    vec2 sample1 = (cellUV + vec2(-0.5, +0.5)) * scalar.y;
    vec2 sample2 = (cellUV + vec2(+0.5, -0.5)) * scalar.z;
    vec2 sample3 = (cellUV + vec2(-0.5, -0.5)) * scalar.w;

    vec4 SDFs = vec4(
        SDF(sample0, uDotRadius),
        SDF(sample1, uDotRadius),
        SDF(sample2, uDotRadius),
        SDF(sample3, uDotRadius)
    );

    float minSDF = min(min(SDFs.x, SDFs.y), min(SDFs.z, SDFs.w));
    float smoothness = uAASmoothness;
    float grazingSmoothing = uAAStretch * frequencies.x / max(frequencies.y, 1e-6);
    float dots = AA_SDF(minSDF, smoothness + grazingSmoothing);

    vec3 color = mix(uColor1.rgb, uColor2.rgb, dots);
    outColor = vec4(color, 1.0);
}
