var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
import * as shapes from './shapes.js';
import { matIV } from './minMatrix.js';
// **** Initial Setup ****
// Canvas - Gets the canvas element + error handling so typescript doesn't bully me :(
const cElement = document.getElementById('canvas');
if (!(cElement instanceof HTMLCanvasElement)) {
    alert('Canvas element not found or null');
    throw new Error('Canvas element not found or null');
}
const c = cElement;
c.width = 500;
c.height = 500;
// WebGL Context - Gets the context, checks that the getting of the context didn't fail.
const glContext = (_a = c.getContext('webgl')) !== null && _a !== void 0 ? _a : c.getContext('experimental-webgl');
if (!glContext) {
    alert('Your browser does not support webgl');
    throw new Error('WebGL context unavailable');
}
const gl = glContext;
// Clear Screen - Sets the globals for clear color and depth, and then clears the screen / depth buffer
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
// Create Shaders - Creates and compiles the shaders
const v_shader = createShader('vs');
const f_shader = createShader('fs');
if (!v_shader || !f_shader) {
    console.error('Failed to create shaders');
    throw new Error('Shader creation failed'); // Stop
}
// Create Program - Responsible for linking together v and f shader, as well
const prog = createProgram(v_shader, f_shader);
if (!prog) {
    console.error('Failed to create program');
    throw new Error('Program creation failed'); // Stop
}
// Culling - Enables culling of back faces, so no back faces drawn duh
gl.enable(gl.CULL_FACE);
gl.frontFace(gl.CCW);
// Depth testing - Enables depth testing, draw objects in order of depth (kinda)
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
// Alpha Blending - Enables alpha blending, the method used for transparency
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // just look at the site lol, w029
// **** Vertex Attributes ****
// Att. Location - basically index of the buffer, needs to be called after shader compilation
const positionAttLocation = gl.getAttribLocation(prog, 'position');
const normalAttLocation = gl.getAttribLocation(prog, 'normal');
const colorAttLocation = gl.getAttribLocation(prog, 'color');
const textureCoordAttLocation = gl.getAttribLocation(prog, 'textureCoord');
const attLocations = [
    positionAttLocation,
    normalAttLocation,
    colorAttLocation,
    textureCoordAttLocation,
];
// Att. Stride - How many numbers in each index of the buffer, e.g, 3 for vec3, etc...
const positionAttStrides = 3; // vec3 for position, 3 floats
const normalAttStrides = 3; // vec3 for normal, 3 floats
const colorAttStrides = 4; // vec4 for color, 4 floats
const textureCoordAttStrides = 2; // vec2 for texture coordinates, 2 floats
// eslint-disable-next-line prettier/prettier
const attStrides = [
    positionAttStrides,
    normalAttStrides,
    colorAttStrides,
    textureCoordAttStrides,
];
// Vertex Data - All the info for the vertexes
const torus_data = shapes.torus(128, 128, 0.5, 1.0, [1.0, 1.0, 1.0, 0.5]);
const vertex_data = {
    position: torus_data[0],
    normal: torus_data[1],
    color: torus_data[2],
    textureCoordinates: torus_data[4],
    indices: torus_data[3],
};
// basic rectangle, blue, would format it but prettier doesn't like it and tbh its not worth it
// const vertex_data = {
//   position: [-1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, -1.0, 1.0, 0.0],
//   normal: [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0],
//   color: Array(16).fill(1.0),
//   textureCoordinates: [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
//   indices: [0, 1, 2, 2, 3, 0],
// };
// VBO's - Vertex Buffer Objects, basically just putting the data into webgl
const vbos = Array(4);
vbos[0] = createVBO(vertex_data.position);
vbos[1] = createVBO(vertex_data.normal);
vbos[2] = createVBO(vertex_data.color);
vbos[3] = createVBO(vertex_data.textureCoordinates);
// Bind vbos to attributes
set_attribute(vbos, attLocations, attStrides);
// **** IBO ****
const ibos = Array(1);
ibos[0] = createIBO(vertex_data.indices);
// Bind IBO to target
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibos[0]);
// **** UNIFORM LOCATIONS ****
const uniformNames = [
    'mvpMatrix',
    'mMatrix',
    'invMatrix',
    'lightPosition',
    'eyeDirection',
    'ambientColor',
];
const uniLocations = [];
for (let i = 0; i < uniformNames.length; i++) {
    // Get the uniform location, more webgl global states :sigh:
    uniLocations[i] = gl.getUniformLocation(prog, uniformNames[i]);
    if (uniLocations[i] === null) {
        console.error(`Uniform location for '${uniformNames[i]}' is null`);
        throw new Error(`Uniform location for '${uniformNames[i]}' not found`);
    }
}
// Texture Uniforms - Seperate, idk if this is the best way bc I haven't actually tried to do multiple textures yet
// const textureUniformNames = ['texture'];
// const textureUniformLocations: WebGLUniformLocation[] = [];
// for (let i = 0; i < textureUniformNames.length; i++) {
//   textureUniformLocations[i] = gl.getUniformLocation(
//     prog,
//     textureUniformNames[i],
//   ) as WebGLUniformLocation;
//   if (textureUniformLocations[i] === null) {
//     console.error(`Texture uniform location for '${textureUniformNames[i]}' is null`);
//     throw new Error(`Texture uniform location for '${textureUniformNames[i]}' not found`);
//   }
// }
// **** MATRIX SETUP ****
// Matrix class
const m = new matIV();
// Initialize Matrices - create creates a float32array, identity sets it to all zeroes
const mMatrix = m.identity(m.create()); // Model matrix (transform)
const vMatrix = m.identity(m.create()); // View matrix (camera transform)
const pMatrix = m.identity(m.create()); // Projection matrix (projection ig?)
const tmpMatrix = m.identity(m.create()); // View * Projection matrix (used so we don't have to compute every frame)
const mvpMatrix = m.identity(m.create()); // Projection * View * Model matrix, passed to shaders
const invMatrix = m.identity(m.create()); // Inverse mvpMatrix for lighting calculations, so light doesn't also have model transform applied
// vMatrix - Contains information about the camera
const eye = [0.0, 2.0, 3.0]; // Camera position
const center = [0.0, 0.0, 0.0]; // Look at point
const up = [0.0, 1.0, 0.0]; // Up direction
m.lookAt(eye, center, up, vMatrix);
// pMatrix - Contains the projection transformation, fov and clipping planes
const fov = 90; // Field of view
const aspect = c.width / c.height; // Aspect ratio
const near = 0.1; // Near clipping plane
const far = 100; // Far clipping plane
m.perspective(fov, aspect, near, far, pMatrix);
// Calculate tmpMatrix - Does this here instead of render loop so not needed to be done every frame
m.multiply(pMatrix, vMatrix, tmpMatrix);
// **** UNIFORMS INIT VALUES ****
// Set the light position
const lightPosition = [1.0, 0.5, 1.0];
// Set the eye direction
const eyeDirection = [0.0, 2.0, 3.0];
// **** Texture **** ---- DISABLED ----
// // Load Textures - Need to load the src as html image, then bind to webgl, then attach to uniform
// const texture_srcs = ['../static/img.png'];
// // load async in parallel
// async function loadTextures(texture_srcs: string[]) {
//   const loadedTextures = await Promise.all(texture_srcs.map(src => createTexture(src)));
//   return loadedTextures;
// }
// let textures: WebGLTexture[] = [];
// loadTextures(texture_srcs)
//   .then(loadedTextures => {
//     textures = loadedTextures.filter((tex): tex is WebGLTexture => tex !== null);
//     // Somethings stuffed, maybe non 2^x img size?
//     if (textures.length !== texture_srcs.length) {
//       console.warn('Some textures failed to load.');
//     }
//     // Somethings really stuffed
//     if (textures.length === 0 && texture_srcs.length > 0) {
//       throw new Error('Failed to load any textures.');
//     }
//     animationLoop();
//   })
//   .catch(error => {
//     console.error('Error loading textures:', error);
//   });
// Counter for current frame
let count = 0;
animationLoop(); // DELETE THIS IF USING TEXTURES, HAS TO USE ABOVE METHOD
function drawFrame() {
    // Clear Screen - Clears the screen
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Increment count
    count += 0.5;
    // Calc rotation in radians
    //const rad = ((count % 360) * Math.PI) / 180;
    //const rad2 = ((count % 720) * Math.PI) / 360;
    //lightPosition = [Math.sin(count / 100) * 2, 0.5, Math.cos(count / 100) * 2];
    // Calculate mMatrix - Controls the transformation of object
    m.identity(mMatrix);
    // m.translate(mMatrix, [0.0, Math.sin(rad), 0.0], mMatrix); // Translate to origin
    // m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix); // Rotate around Y axis
    // Calculate mvpMatrix - Uses m, v, and p Matrices, and also generates the inverse for lighting calculations
    m.multiply(tmpMatrix, mMatrix, mvpMatrix); // MVP matrix
    m.inverse(mMatrix, invMatrix); // Inverse matrix
    // Set Uniforms - Sets all of the uniform variables for the shaders (f and v)
    // mvpMatrix
    gl.uniformMatrix4fv(uniLocations[0], false, mvpMatrix);
    // mMatrix
    gl.uniformMatrix4fv(uniLocations[1], false, mMatrix);
    // invMatrix
    gl.uniformMatrix4fv(uniLocations[2], false, invMatrix);
    // lightPositon
    gl.uniform3fv(uniLocations[3], lightPosition);
    // eyeDirection
    gl.uniform3fv(uniLocations[4], eyeDirection);
    // ambientColor
    gl.uniform4fv(uniLocations[5], [0.1, 0.1, 0.1, 1.0]);
    // Set Textures - Textures are like uniforms but have a bit more setup for some reason
    // texture
    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    // gl.uniform1i(textureUniformLocations[0], 0);
    // Draw Elements - Used to draw a mesh using an index buffer rather than just raw vertices.
    gl.drawElements(gl.TRIANGLES, vertex_data.indices.length, gl.UNSIGNED_SHORT, 0);
    // Flush - Isn't required, ensures all issued commands are executed asap
    // gl.flush();
}
function animationLoop() {
    drawFrame();
    requestAnimationFrame(animationLoop);
}
// **** FUNCTIONS ****
function createShader(id) {
    let shader = null;
    // Get the shader source
    const scriptElement = document.getElementById(id);
    // Make sure source exists
    if (!scriptElement || !(scriptElement instanceof HTMLScriptElement)) {
        console.error('Shader not found');
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
            console.error('Unknown shader type');
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
            console.error('Error fetching shader sourcxe');
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
        console.error('Error compiling' + scriptElement.type + 'shader: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
}
function createProgram(vs, fs) {
    // create a program object
    const program = gl.createProgram();
    if (!program) {
        console.error('Error while creating program');
        throw new Error('Could not create program');
    }
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
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
}
function createVBO(data) {
    // Create the buffer object
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error('Error while creating buffer');
        throw new Error('Could not create buffer');
    }
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
    if (!buffer) {
        console.error('Error while creating buffer');
        throw new Error('Could not create buffer');
    }
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
function loadImage(src) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = e => reject(new Error(`Failed to load image: ${src}, error: ${e}`));
            img.src = src;
        });
    });
}
function createTexture(src) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const img = yield loadImage(src);
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
            return tex;
        }
        catch (error) {
            console.error(error);
            return null;
        }
    });
}
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
