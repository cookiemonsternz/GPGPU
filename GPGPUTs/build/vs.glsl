attribute vec3 position;
attribute vec4 color;
uniform mat4 mvpMatrix; // Model View Projection matrix
varying vec4 vColor;

void main() {
    vColor = color;
    gl_Position = mvpMatrix * vec4(position, 1.0);
}