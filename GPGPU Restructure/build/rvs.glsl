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

float getPosValue(vec2 uv) {
    vec4 color = texture2D(texture, uv);
    return unpackFloat(color) * 2.0 - 1.0;
}

void main() {
    vTextureCoord = textureCoord * a_index; // Pass texture coordinates to fragment shader
    float posX = mod(a_index, 128.0); // Normalize to [0, 1]
    float posX2 = mod(a_index, 128.0) + 128.0; // Normalize to [0, 1]
    float posY = floor(a_index / 128.0);
    vec2 uvX = (vec2(posX, posY) + 0.5) / 256.0;
    vec2 uvY = (vec2(posX2, posY) + 0.5) / 256.0;
    float xpos = getPosValue(uvX);
    float ypos = getPosValue(uvY); // top right corner
    vColor = vec4(xpos, ypos, a_index / 16384.0, 1.0); // Set color based on position
    gl_Position = mvpMatrix * vec4(xpos, ypos, 0.0, 1.0); // Set position
    // gl_Position = vec4(0.0, 0.0, 0.0, 1.0); // Just center everything
    gl_PointSize = 1.0; // Set point size to 1.0
}