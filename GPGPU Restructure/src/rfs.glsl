precision mediump float;

uniform sampler2D texture; // Texture sampler
varying vec2 vTextureCoord;
varying vec4 vColor; // Varying variable to pass color to fragment shader

void main() {
    vec4 textureColor = texture2D(texture, vTextureCoord);
    gl_FragColor = vec4(vec3(1.0), 0.01); // Basic color output
}