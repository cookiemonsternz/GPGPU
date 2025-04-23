precision highp float;

uniform sampler2D texture; // Texture sampler
varying vec3 vPosition;
varying vec2 vTextureCoord;

const int num_directions = 200;
const float jump_distance = 0.0005;

float unpackFloat(vec4 c_normalized) {
    const float factor = 255.0 / 256.0;
    return factor * (c_normalized.r +
        c_normalized.g / 256.0 +
        c_normalized.b / (256.0 * 256.0) +
        c_normalized.a / (256.0 * 256.0 * 256.0));
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

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float sdf(vec2 pos) {
    float scale = 5.0;
    // Example SDF function (noise), pseudo perlin
    return snoise(pos * scale);
}

vec2 random2D(vec2 uv) {
    float x = sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453;
    return normalize(vec2(fract(x), fract(x * 0.5)) * 2.0 - 1.0);
}

vec2 getPosValue(vec2 uv_pixel) {
    vec2 uv_x;
    vec2 uv_y;

    if(uv_pixel.x < 0.5) { // x pos
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

    for(int i = 0; i < num_directions; i++) {
        vec2 direction = random2D(base_seed + float(i) * 0.1);

        vec2 neighbourPos = current_pos + direction * jump_distance;
        float neighbourSDF = sdf(neighbourPos);

        if(neighbourSDF > currentHighest) {
            idealNeighbour = neighbourPos;
            currentHighest = neighbourSDF;
        }
    }
    return idealNeighbour;
}

bool isStuck(vec2 uv_pixel) {
    vec2 current_pos = getPosValue(uv_pixel);
    vec2 idealNeighbour = getIdealNeighbour(uv_pixel, current_pos);
    return sdf(idealNeighbour) <= sdf(current_pos) + 1e-6;
}

vec2 getNewPos(vec2 uv_pixel, bool isCheck) {
    vec2 current_pos = getPosValue(uv_pixel);
    vec2 idealNeighbour = getIdealNeighbour(uv_pixel, current_pos);

    if(sdf(idealNeighbour) > sdf(current_pos)) {
        return idealNeighbour;
    } else {
        vec2 randomPos = vec2(fract(sin(dot(current_pos, vec2(12.9898, 78.233))) * 43758.5453), fract(sin(dot(current_pos, vec2(78.233, 12.9898))) * 43758.5453));
        return randomPos * 2.0 - 1.0; // Scale to [-1, 1]
    }
}

vec4 resetLife(vec2 uv_pixel) {
    // // We need to get bottom left quadrant
    // vec2 uv_utils;
    // if (uv_pixel.x < 0.5) {
    //     uv_utils = vec2(uv_pixel.x, uv_pixel.y + 0.5);
    // } else {
    //     uv_utils = vec2(uv_pixel.x - 0.5, uv_pixel.y + 0.5);
    // }
    return packFloat(0.0); // Reset life value
}

float get_utils_values(vec2 uv_pixel) {
    // We return the color of the pixel in the utils quadrant
    // Bottom left 
    vec2 uv_utils;
    if(uv_pixel.x < 0.5) {
        uv_utils = vec2(uv_pixel.x, uv_pixel.y + 0.5);
    } else {
        uv_utils = vec2(uv_pixel.x - 0.5, uv_pixel.y + 0.5);
    }
    return unpackFloat(texture2D(texture, uv_utils));
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(512.0, 512.0);

    if(uv.y <= 0.5) {
        vec2 newPos = getNewPos(uv, false);
        if(uv.x < 0.5) { // x pos
            gl_FragColor = packFloat(newPos.x);
        } else { // y pos
            gl_FragColor = packFloat(newPos.y);
        }
        vec2 current_pos = getPosValue(uv);
    } else {
        vec2 uv_pos = uv - vec2(0.0, 0.5);
        if(isStuck(uv_pos) || unpackFloat(texture2D(texture, uv)) > 3.0) {
            gl_FragColor = resetLife(uv);
        } else {
            float current_life = unpackFloat(texture2D(texture, uv));
            gl_FragColor = packFloat(current_life + 0.01);
        }
    }
    // gl_FragColor = packFloat(current_pos.x); // Get position value from texture
    //gl_FragColor = vec4(0.57, 0.34, 0.34, 1.0); // Basic color output
}
