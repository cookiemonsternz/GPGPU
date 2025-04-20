attribute vec3 position;
attribute vec2 textureCoord; // Texture coordinates
attribute float a_index;
uniform sampler2D texture; // Texture sampler
uniform mat4 mvpMatrix; // Model-View-Projection matrix
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

// float getPosValue(vec2 uv) {
//     vec4 color = texture2D(texture, uv);
//     return unpackFloat(color) * 2.0 - 1.0;
// }

void main() {
    vTextureCoord = textureCoord * a_index; // Pass texture coordinates to fragment shader
    float posX = mod(a_index, 128.0); // Normalize to [0, 1]
    float posX2 = mod(a_index, 128.0) + 128.0; // Normalize to [0, 1]
    float posY = floor(a_index / 128.0);
    vec2 uvX = (vec2(posX, posY) + 0.5) / 256.0;
    vec2 pos = getPosValue(uvX) * 2.0 - 1.0; // Get position value from texture
    // float ypos = getPosValue(uvY); // top right corner
    float xpos = pos.x; // Get x position from texture
    float ypos = pos.y; // Get y position from texture
    // vColor = vec4(xpos, ypos, a_index / 16384.0, 1.0); // Set color based on position
    gl_Position = mvpMatrix * vec4(posX / 64.0 - 1.0, posY / 64.0 - 1.0, 0.0, 1.0); // Set position
    vColor = vec4(xpos, ypos, a_index / 16384.0, 1.0); // Set color based on position
    // gl_Position = mvpMatrix * vec4(xpos, ypos, 0.0, 1.0); // Set position
    //gl_Position = vec4(0.0, 0.0, 0.0, 1.0); // Just center everything
    gl_PointSize = 1.0; // Set point size to 1.0
}