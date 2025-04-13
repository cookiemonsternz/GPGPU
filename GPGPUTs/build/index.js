"use strict";
//#endregion
//#region Setup
// Setup canvas and webgl
const c = document.getElementById('canvas');
c.width = 300;
c.height = 300;
const gl = c.getContext('webgl') ||
    c.getContext('experimental-webgl') ||
    alert('Your browser does not support WebGL');
// Clear the canvas
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
//#endregion
//#region Shaders Initialization
// Initialize shaders, program, and buffers
const v_shader = createShader('vs');
const f_shader = createShader('fs');
const prog = createProgram(v_shader, f_shader);
//#endregion
//#region VBO Initialization
// VBOS
const attLocations = new Array(2);
attLocations[0] = gl.getAttribLocation(prog, 'position');
attLocations[1] = gl.getAttribLocation(prog, 'color');
const attStrides = new Array(2);
attStrides[0] = 3; // vec3 for position, 3 floats
attStrides[1] = 4; // vec4 for color, 4 floats
// Data for vertex positions
const vertex_positions = [
    // X, Y, Z
    // eslint-disable-next-line prettier/prettier
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
];
const vertex_color = [
    // R, G, B, A
    // eslint-disable-next-line prettier/prettier
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
];
//#endregion
//#region VBO Creation
// Create the VBO's
const position_vbo = createVBO(vertex_positions);
const color_vbo = createVBO(vertex_color);
// Vertex position buffer
gl.bindBuffer(gl.ARRAY_BUFFER, position_vbo);
gl.enableVertexAttribArray(attLocations[0]);
gl.vertexAttribPointer(attLocations[0], attStrides[0], gl.FLOAT, false, 0, 0);
// Vertex color buffer
gl.bindBuffer(gl.ARRAY_BUFFER, color_vbo);
gl.enableVertexAttribArray(attLocations[1]);
gl.vertexAttribPointer(attLocations[1], attStrides[1], gl.FLOAT, false, 0, 0);
//#endregion
//#region Matrices Creation
// Prepare matrices
const m = new matIV();
// MVP matrix
const mMatrix = m.identity(m.create());
const vMatrix = m.identity(m.create());
const pMatrix = m.identity(m.create());
const mvpMatrix = m.identity(m.create());
// View coordinate transformation matrix
const eye = [0.0, 1.0, 3.0]; // Camera position
const center = [0.0, 0.0, 0.0]; // Look at point
const up = [0.0, 1.0, 0.0]; // Up direction
m.lookAt(eye, center, up, vMatrix);
// Perspective projection matrix
const fov = 90; // Field of view
const aspect = c.width / c.height; // Aspect ratio
const near = 0.1; // Near clipping plane
const far = 100; // Far clipping plane
m.perspective(fov, aspect, near, far, pMatrix);
// Multiply the matrices, in order: pvm, because webgl uses backwards order
m.multiply(pMatrix, vMatrix, mvpMatrix);
m.multiply(mvpMatrix, mMatrix, mvpMatrix);
//#endregion
//#region Draw to screen
// Get the uniform location
const uniLocation = gl.getUniformLocation(prog, 'mvpMatrix');
// Set the uniform value
gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
// Draw to screen
gl.drawArrays(gl.TRIANGLES, 0, 3);
gl.flush();
//#endregion
//#region Helper Functions
function createShader(id) {
    let shader = null;
    // Get the shader source
    const scriptElement = document.getElementById(id);
    // Make sure source exists
    if (!scriptElement) {
        alert('Shader not found');
        return;
    }
    switch (scriptElement.type) {
        // Compile for vertex shader
        case 'x-shader/x-vertex':
            shader = gl.createShader(gl.VERTEX_SHADER);
            break;
        // Compile for fragment shader
        case 'x-shader/x-fragment':
            shader = gl.createShader(gl.FRAGMENT_SHADER);
            break;
        // If not a shader, yell at me
        default:
            alert('Unknown shader type');
            return;
    }
    // Get the shader source text, need to fetch from src attribute, bc script is stored in external file.
    const src = scriptElement.src;
    if (src) {
        // Fetch the shader source from the src attribute
        const xhr = new XMLHttpRequest();
        xhr.open('GET', src, false);
        xhr.send(null);
        if (xhr.status !== 200) {
            alert('Error fetching shader source');
            return;
        }
        scriptElement.text = xhr.responseText;
    }
    // Assign the shader source to generated shader
    gl.shaderSource(shader, scriptElement.text);
    // Compile the shader
    gl.compileShader(shader);
    // Check that shader compiled successfully
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log('Shader ' + scriptElement.type + ' compiled successfully');
        return shader;
    }
    else {
        alert('Error compiling' +
            scriptElement.type +
            'shader: ' +
            gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
}
function createProgram(vs, fs) {
    // create a program object
    const program = gl.createProgram();
    // Attach the shaders to the program
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    // Link the program
    gl.linkProgram(program);
    // Check if the program linked successfully
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        // Use the program
        gl.useProgram(program);
        console.log('Program linked successfully');
        return program;
    }
    else {
        alert(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
}
function createVBO(data) {
    // Create the buffer object
    const buffer = gl.createBuffer();
    // Bind the buffer object to target, in webgl 1.0, either ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER, difference is that
    // ELEMENT_ARRAY_BUFFER is used for index buffer
    // and ARRAY_BUFFER is used for VBO
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Pass the vertex data to the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    // disable buffer binding
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    console.log('VBO created successfully');
    // Return generated vbo
    return buffer;
}
//#endregion
