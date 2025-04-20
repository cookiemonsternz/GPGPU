precision mediump float;

uniform sampler2D texture; // Texture sampler
varying vec3 vPosition;
varying vec2 vTextureCoord;

const int num_directions = 360;
const float jump_distance = 0.001;


float unpackFloat(vec4 c_normalized) {
    const float factor = 255.0 / 256.0;
    return factor * (
        c_normalized.r +
        c_normalized.g / 256.0 +
        c_normalized.b / (256.0 * 256.0) +
        c_normalized.a / (256.0 * 256.0 * 256.0)
    );
}

vec4 packFloat(float value) {
    value *= 256.0;
    const float factor = 256.0;
    float r = floor(value);
    float g = floor(fract(value) * factor);
    float b = floor(fract(value * factor) * factor);
    float a = floor(fract(value * factor * factor) * factor);
    return vec4(r, g, b, a) / 255.0;
}

float sdf(vec2 pos) {
    float scale = 10.0;
    return max(tan(pos.x * scale), sin(pos.y * scale));
}

vec2 random2D(vec2 uv) {
    float x = sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453;
    return normalize(vec2(fract(x), fract(x * 0.5)) * 2.0 - 1.0);
}

vec2 getPosValue(vec2 uv_pixel) {
    vec2 uv_x;
    vec2 uv_y;

    if (uv_pixel.x < 0.5) { // x pos
        uv_x = uv_pixel;
        uv_y = vec2(uv_pixel.x + 0.5, uv_pixel.y);
    } else { // y pos
        uv_x = vec2(uv_pixel.x - 0.5, uv_pixel.y);
        uv_y = uv_pixel;
    }

    uv_x = clamp(uv_x, 0.0, 1.0);
    uv_y = clamp(uv_y, 0.0, 1.0);

    vec4 color_x = texture2D(texture, uv_x);
    vec4 color_y = texture2D(texture, uv_y);

    return vec2(unpackFloat(color_x), unpackFloat(color_y));
}

vec2 getIdealNeighbour(vec2 uv_pixel, vec2 current_pos) {
    vec2 idealNeighbour = current_pos;
    float currentHighest = sdf(current_pos);

    vec2 uv_x = (uv_pixel.x < 0.5) ? uv_pixel : vec2(uv_pixel.x - 0.5, uv_pixel.y);
    vec2 base_seed = uv_x * dot(uv_x, vec2(12.9898, 78.233));

    for (int i = 0; i < num_directions; i++) {
        vec2 direction = random2D(base_seed + float(i) * 0.1);

        vec2 neighbourPos = current_pos + direction * jump_distance;
        float neighbourSDF = sdf(neighbourPos);

        if (neighbourSDF > currentHighest) {
            idealNeighbour = neighbourPos;
            currentHighest = neighbourSDF;
        }
    }
    return idealNeighbour;
}

vec2 getNewPos(vec2 uv_pixel) {
    vec2 current_pos = getPosValue(uv_pixel);
    vec2 idealNeighbour = getIdealNeighbour(uv_pixel, current_pos);

    if (sdf(idealNeighbour) > sdf(current_pos)) {
        return idealNeighbour;
    } else {
        // Walker is stuck, reinitialize at random position
        vec2 randomPos = vec2(fract(sin(dot(current_pos, vec2(12.9898, 78.233))) * 43758.5453), fract(sin(dot(current_pos, vec2(78.233, 12.9898))) * 43758.5453));
        return randomPos * 2.0 - 1.0; // Scale to [-1, 1]
    }
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(512.0, 512.0);
    
    if (uv.y >= 0.5) { // All pos data is in bottom half
        gl_FragColor = texture2D(texture, uv);
        return;
    }

    vec2 newPos = getNewPos(uv);
    if (uv.x < 0.5) { // x pos
        gl_FragColor = packFloat(newPos.x);
    } else { // y pos
        gl_FragColor = packFloat(newPos.y);
    }
    vec2 current_pos = getPosValue(uv);
    // gl_FragColor = packFloat(current_pos.x); // Get position value from texture
    //gl_FragColor = vec4(0.57, 0.34, 0.34, 1.0); // Basic color output
}
