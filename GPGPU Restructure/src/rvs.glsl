attribute vec3 position;
attribute vec2 textureCoord; // Texture coordinates
attribute float a_index;
uniform sampler2D texture; // Texture sampler
uniform mat4 mvpMatrix; // Model-View-Projection matrix
uniform vec4 startColor; // Start color for the gradient
uniform vec4 endColor; // Color uniform for the fragment shader
varying vec2 vTextureCoord; // Varying variable to pass texture coordinates to fragment shader
varying vec4 vColor;

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

float get_utils_values(vec2 uv_pixel) {
    // We return the color of the pixel in the utils quadrant
    // Bottom left 
    vec2 uv_utils;
    if (uv_pixel.x < 0.5) {
        uv_utils = vec2(uv_pixel.x, uv_pixel.y + 0.5);
    } else {
        uv_utils = vec2(uv_pixel.x - 0.5, uv_pixel.y + 0.5);
    }
    return unpackFloat(texture2D(texture, uv_utils));
}

// float getPosValue(vec2 uv) {
//     vec4 color = texture2D(texture, uv);
//     return unpackFloat(color) * 2.0 - 1.0;
// }

vec4 lerp_color(vec4 start, vec4 end, float t) {
    return mix(start, end, t); // Linear interpolation between two colors
}

void main() {
    vTextureCoord = textureCoord * a_index; // Pass texture coordinates to fragment shader
    float posX = mod(a_index, 128.0); // Normalize to [0, 1]
    float posX2 = mod(a_index, 128.0) + 128.0; // Normalize to [0, 1]
    float posY = floor(a_index / 128.0);
    vec2 uvX = (vec2(posX, posY) + 0.5) / 256.0;
    vec2 pos = getPosValue(uvX) * 2.0 - 1.0; // Get position value from texture
    float xpos = pos.x; // Get x position from texture
    float ypos = pos.y; // Get y position from texture
    vColor = lerp_color(startColor, endColor, get_utils_values(uvX)); // Get color from utils quadrant - lifetime
    gl_Position = mvpMatrix * vec4(xpos, ypos, 0.0, 1.0); // Set position
    gl_PointSize = 0.1; // Set point size to 1.0
}