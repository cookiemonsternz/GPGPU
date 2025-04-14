"use strict";
//#endregion
//#region Setup
// Setup canvas and webgl
const c = document.getElementById('canvas');
c.width = 500;
c.height = 500;
const gl = c.getContext('webgl') ||
    c.getContext('experimental-webgl') ||
    alert('Your browser does not support WebGL');
// Clear the canvas
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
let texture = createImg('./texture.png');
// // Culling and Depth Testing
// // Culling hides back faces, depth testing changes draw order
// gl.enable(gl.CULL_FACE);
// gl.frontFace(gl.CCW);
// // Depth testing
// gl.enable(gl.DEPTH_TEST);
// gl.depthFunc(gl.LEQUAL);
//#endregion
//#region Shaders Initialization
// Initialize shaders, program, and buffers
const v_shader = createShader('vs');
const f_shader = createShader('fs');
const prog = createProgram(v_shader, f_shader);
//#endregion
//#region Shapes
//#region Torus
function torus(row, column, irad, orad, color) {
    const pos = [], nor = [], col = [], idx = [];
    for (let i = 0; i <= row; i++) {
        const r = ((Math.PI * 2) / row) * i;
        const rr = Math.cos(r);
        const ry = Math.sin(r);
        for (let ii = 0; ii <= column; ii++) {
            const tr = ((Math.PI * 2) / column) * ii;
            const tx = (rr * irad + orad) * Math.cos(tr);
            const ty = ry * irad;
            const tz = (rr * irad + orad) * Math.sin(tr);
            const rx = rr * Math.cos(tr);
            const rz = rr * Math.sin(tr);
            nor.push(rx, ry, rz);
            pos.push(tx, ty, tz);
            // const tc = hsva((360 / column) * ii, 1, 1, 1) as number[];
            col.push(color[0], color[1], color[2], color[3]);
        }
    }
    for (let i = 0; i < row; i++) {
        for (let ii = 0; ii < column; ii++) {
            const r = (column + 1) * i + ii;
            idx.push(r, r + column + 1, r + 1);
            idx.push(r + column + 1, r + column + 2, r + 1);
        }
    }
    return [pos, nor, col, idx];
}
//#endregion
//#region Sphere
function sphere(row, column, rad, color) {
    const pos = [], nor = [], col = [], idx = [];
    for (let i = 0; i <= row; i++) {
        const r = (Math.PI / row) * i;
        const ry = Math.cos(r);
        const rr = Math.sin(r);
        for (let ii = 0; ii <= column; ii++) {
            const tr = ((Math.PI * 2) / column) * ii;
            const tx = rr * rad * Math.cos(tr);
            const ty = ry * rad;
            const tz = rr * rad * Math.sin(tr);
            const rx = rr * Math.cos(tr);
            const rz = rr * Math.sin(tr);
            const tc = color ? color : hsva((360 / row) * i, 1, 1, 1);
            pos.push(tx, ty, tz);
            nor.push(rx, ry, rz);
            if (tc) {
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }
    }
    let r = 0;
    for (let i = 0; i < row; i++) {
        for (let ii = 0; ii < column; ii++) {
            r = (column + 1) * i + ii;
            idx.push(r, r + 1, r + column + 2);
            idx.push(r, r + column + 2, r + column + 1);
        }
    }
    return [pos, nor, col, idx];
}
//#endregion
//#endregion
//#region VBO Creation
// VBOS
const attLocations = new Array(2);
attLocations[0] = gl.getAttribLocation(prog, 'position');
attLocations[1] = gl.getAttribLocation(prog, 'normal');
attLocations[2] = gl.getAttribLocation(prog, 'color');
attLocations[3] = gl.getAttribLocation(prog, 'textureCoord');
const attStrides = new Array(2);
attStrides[0] = 3; // vec3 for position, 3 floats
attStrides[1] = 3; // vec3 for normal, 3 floats
attStrides[2] = 4; // vec4 for color, 4 floats
attStrides[3] = 2; // vec2 for texture coord, 2 floats
// const torus_data = torus(128, 128, 0.25, 0.75, [0.3, 0.7, 0.9, 1.0]); // Create torus data
// // Data for vertex positions
// const vertex_positions = torus_data[0];
const vertex_positions = [
    // eslint-disable-next-line prettier/prettier
    -1.0, 1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, -1.0, 0.0,
    1.0, -1.0, 0.0,
];
// const vertex_normals = torus_data[1];
const vertex_normals = [
    // eslint-disable-next-line prettier/prettier
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
];
// const vertex_color = torus_data[2];
const vertex_color = [
    // eslint-disable-next-line prettier/prettier
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
];
// eslint-disable-next-line prettier/prettier
const texture_coord = [
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0
];
// const indexes = torus_data[3];
// eslint-disable-next-line prettier/prettier
const indexes = [
    0, 1, 2,
    3, 2, 1
];
// Create the VBO's
const vbos = Array(2);
vbos[0] = createVBO(vertex_positions);
vbos[1] = createVBO(vertex_normals);
vbos[2] = createVBO(vertex_color);
vbos[3] = createVBO(texture_coord);
// Bind vbos to attributes
set_attribute(vbos, attLocations, attStrides);
// Create the IBO
const ibos = Array(1);
ibos[0] = createIBO(indexes);
// Bind IBO to target
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibos[0]);
//#endregion
//#region Matrices Creation
// Get the uniform location
const uniLocations = [];
uniLocations[0] = gl.getUniformLocation(prog, 'mvpMatrix');
uniLocations[1] = gl.getUniformLocation(prog, 'mMatrix');
uniLocations[2] = gl.getUniformLocation(prog, 'invMatrix');
uniLocations[3] = gl.getUniformLocation(prog, 'lightPosition');
uniLocations[4] = gl.getUniformLocation(prog, 'eyeDirection');
uniLocations[5] = gl.getUniformLocation(prog, 'ambientColor');
uniLocations[6] = gl.getUniformLocation(prog, 'texture');
// Prepare matrices
const m = new matIV();
// MVP matrix
const mMatrix = m.identity(m.create());
const vMatrix = m.identity(m.create());
const pMatrix = m.identity(m.create());
const tmpMatrix = m.identity(m.create());
const mvpMatrix = m.identity(m.create());
const invMatrix = m.identity(m.create());
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
// pv Matrix
m.multiply(pMatrix, vMatrix, tmpMatrix);
// Set the light direction
let lightPosition = [1.0, 0.5, 1.0];
// Set the eye direction
const eyeDirection = [0.0, 2.0, 3.0];
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.uniform1i(uniLocations[6], 0); // Set the texture uniform variable
//#endregion
//#region Draw Loop
// Counter for current frame
let count = 0;
function drawFrame() {
    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Increment count
    count += 0.5;
    // Calc rotation in radians
    const rad = ((count % 360) * Math.PI) / 180;
    lightPosition = [Math.sin(count / 100) * 2, 0.5, Math.cos(count / 100) * 2];
    // get offset of rectangle
    m.identity(mMatrix);
    // m.translate(mMatrix, [0.0, Math.sin(rad), 0.0], mMatrix); // Translate to origin
    // m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix); // Rotate around Y axis
    // Draw rectangle elements
    m.multiply(tmpMatrix, mMatrix, mvpMatrix); // MVP matrix
    m.inverse(mMatrix, invMatrix); // Inverse matrix
    gl.uniformMatrix4fv(uniLocations[0], false, mvpMatrix); // Set the uniform variable
    gl.uniformMatrix4fv(uniLocations[1], false, mMatrix); // Set the model matrix uniform variable
    gl.uniformMatrix4fv(uniLocations[2], false, invMatrix); // Set the uniform variable
    gl.uniform3fv(uniLocations[3], lightPosition); // Set the light position
    gl.uniform3fv(uniLocations[4], eyeDirection); // Set the eye direction
    gl.uniform4fv(uniLocations[5], [0.05, 0.05, 0.05, 1.0]); // Set the ambient color
    // Draw the object
    gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);
    // Flush to screen
    gl.flush();
}
function animationLoop() {
    drawFrame();
    //setTimeout(animationLoop, 1000 / 60);
    requestAnimationFrame(animationLoop);
}
animationLoop();
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
            alert('Error fetching shader sourcxe');
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
    // ELEMENT_ARRAY_BUFFER is used for IBO
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
function createIBO(data) {
    // create base buffer object
    const buffer = gl.createBuffer();
    // bind object to target, in this case, IBO, so element array buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    // pass index data to buffer object
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
    // disable buffer binding
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    console.log('IBO created successfully');
    // return generated ibo
    return buffer;
}
function createImg(source) {
    const img = new Image();
    img.onload = function () {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        console.log('Texture created successfully');
        texture = tex;
    };
    img.src = source;
}
// function create_texture(source){
//   // イメージオブジェクトの生成
//   var img = new Image();
//   // データのオンロードをトリガーにする
//   img.onload = function(){
//       // テクスチャオブジェクトの生成
//       var tex = gl.createTexture();
//       // テクスチャをバインドする
//       gl.bindTexture(gl.TEXTURE_2D, tex);
//       // テクスチャへイメージを適用
//       gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
//       // ミップマップを生成
//       gl.generateMipmap(gl.TEXTURE_2D);
//       // テクスチャのバインドを無効化
//       gl.bindTexture(gl.TEXTURE_2D, null);
//       // 生成したテクスチャをグローバル変数に代入
//       texture = tex;
//   };
//   // イメージオブジェクトのソースを指定
//   img.src = source;
// }
function set_attribute(vbos, attLs, attSs) {
    for (const i in vbos) {
        // Bind Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, vbos[i]);
        // Enable attribute
        gl.enableVertexAttribArray(attLs[i]);
        // Set attribute pointer
        gl.vertexAttribPointer(attLs[i], attSs[i], gl.FLOAT, false, 0, 0);
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function hsva(h, s, v, a) {
    if (s > 1 || v > 1 || a > 1) {
        return;
    }
    const th = h % 360;
    const i = Math.floor(th / 60);
    const f = th / 60 - i;
    const m = v * (1 - s);
    const n = v * (1 - s * f);
    const k = v * (1 - s * (1 - f));
    const color = [];
    if (s > 0 && s < 0) {
        color.push(v, v, v, a);
    }
    else {
        const r = [v, n, m, m, k, v];
        const g = [k, v, v, n, m, m];
        const b = [m, m, k, v, v, n];
        color.push(r[i], g[i], b[i], a);
    }
    return color;
}
//#endregion
