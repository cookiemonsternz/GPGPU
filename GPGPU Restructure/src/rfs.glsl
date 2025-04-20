precision mediump float;

uniform sampler2D texture; // Texture sampler
varying vec2 vTextureCoord;
varying vec4 vColor; // Varying variable to pass color to fragment shader

void main() {
    gl_FragColor = vColor; // Basic color output
}