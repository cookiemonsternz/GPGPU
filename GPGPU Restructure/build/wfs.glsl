precision mediump float;

uniform sampler2D texture; // Texture sampler
varying vec3 vPosition;
varying vec2 vTextureCoord;

void main() {
    vec4 textureColor = texture2D(texture, vTextureCoord);
    gl_FragColor = textureColor; // Basic color output
    // gl_FragColor = vec4(0.57, 0.34, 0.34, 1.0); // Basic color output
}
