import * as shapes from './shapes.js';
import {matIV, qtnIV} from './minMatrix.js';

// **** Initial Setup ****

// Canvas - Gets the canvas element + error handling so typescript doesn't bully me :(
const cElement = document.getElementById('canvas');
if (!(cElement instanceof HTMLCanvasElement)) {
  alert('Canvas element not found or null');
  throw new Error('Canvas element not found or null');
}
const c: HTMLCanvasElement = cElement;

c.width = 500;
c.height = 500;

// WebGL Context - Gets the context, checks that the getting of the context didn't fail.
const glContext = c.getContext('webgl') ?? c.getContext('experimental-webgl');
if (!glContext) {
  alert('Your browser does not support webgl');
  throw new Error('WebGL context unavailable');
}
const gl = glContext as WebGLRenderingContext;

const ext = gl.getExtension('ANGLE_instanced_arrays');
if (!ext) {
  console.error('ANGLE_instanced_arrays extension not supported');
  throw new Error('ANGLE_instanced_arrays extension not supported');
}

// Clear Screen - Sets the globals for clear color and depth, and then clears the screen / depth buffer
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// WALKER UPDATE PROGRAM
// Create Shaders - Creates and compiles the shaders
const walker_v_shader = createShader('wvs');
const walker_f_shader = createShader('wfs');
if (!walker_v_shader || !walker_f_shader) {
  console.error('Failed to create shaders');
  throw new Error('Shader creation failed'); // Stop
}

// Create Program 1 - walker update program
const walker_update_prog = createProgram(walker_v_shader, walker_f_shader);
if (!walker_update_prog) {
  console.error('Failed to create program');
  throw new Error('Program creation failed'); // Stop
}
// WALKER RENDER PROGRAM
// Create Shaders - Creates and compiles the shaders
const render_v_shader = createShader('rvs');
const render_f_shader = createShader('rfs');
if (!render_v_shader || !render_f_shader) {
  console.error('Failed to create shaders');
  throw new Error('Shader creation failed'); // Stop
}
// Create Program 2 - walker render program
const render_prog = createProgram(render_v_shader, render_f_shader);
if (!render_prog) {
  console.error('Failed to create program');
  throw new Error('Program creation failed'); // Stop
}

// **** Vertex Attributes ****

// Att. Stride - How many numbers in each index of the buffer, e.g, 3 for vec3, etc...
const positionAttStrides = 3; // vec3 for position, 3 floats
const textureCoordAttStrides = 2; // vec2 for texture coordinates, 2 floats
const indexAttStrides = 1; // vec1 for index, 1 float
// eslint-disable-next-line prettier/prettier
const walkerAttStrides = [
  positionAttStrides,
  textureCoordAttStrides,
];
// Walker Update Program
// Att. Location - basically index of the buffer, needs to be called after shader compilation
const positionAttLocation = gl.getAttribLocation(walker_update_prog, 'position');
const textureCoordAttLocation = gl.getAttribLocation(walker_update_prog, 'textureCoord');
const walkerAttLocations = [positionAttLocation, textureCoordAttLocation];

// basic rectangle, blue, would format it but prettier doesn't like it and tbh its not worth it
const vertex_data = {
  position: [-1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, -1.0, 1.0, 0.0],
  textureCoordinates: [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
  indices: [0, 1, 2, 2, 3, 0],
};

// VBO's - Vertex Buffer Objects, basically just putting the data into webgl
const vbos = Array(4);
vbos[0] = createVBO(vertex_data.position);
vbos[1] = createVBO(vertex_data.textureCoordinates);

// **** IBO ****

const ibos = Array(1);
ibos[0] = createIBO(vertex_data.indices);

// Bind IBO to target
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibos[0]);

// **** UNIFORM LOCATIONS ****

const uniformNames = ['mvpMatrix'];

const updateUniLocations: WebGLUniformLocation[] = [];

for (let i = 0; i < uniformNames.length; i++) {
  // Get the uniform location, more webgl global states :sigh:
  updateUniLocations[i] = gl.getUniformLocation(
    walker_update_prog,
    uniformNames[i],
  ) as WebGLUniformLocation;
  if (updateUniLocations[i] === null) {
    console.error(`Uniform location for '${uniformNames[i]}' is null`);
    throw new Error(`Uniform location for '${uniformNames[i]}' not found`);
  }
}

const renderUniLocations: WebGLUniformLocation[] = [];

for (let i = 0; i < uniformNames.length; i++) {
  // Get the uniform location, more webgl global states :sigh:
  renderUniLocations[i] = gl.getUniformLocation(
    render_prog,
    uniformNames[i],
  ) as WebGLUniformLocation;

  if (renderUniLocations[i] === null) {
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
const eye: [number, number, number] = [0.0, 0.0, 1.0]; // Camera position
const center: [number, number, number] = [0.0, 0.0, 0.0]; // Look at point
const up: [number, number, number] = [0.0, 1.0, 0.0]; // Up direction
m.lookAt(eye, center, up, vMatrix);

// pMatrix - Contains the projection transformation, fov and clipping planes
// const fov = 90; // Field of view
// const aspect = c.width / c.height; // Aspect ratio
// const near = 0.1; // Near clipping plane
// const far = 100; // Far clipping plane
// m.perspective(fov, aspect, near, far, pMatrix);
m.ortho(-1, 1, -1, 1, -1, 1, pMatrix); // Orthographic projection

// Calculate tmpMatrix - Does this here instead of render loop so not needed to be done every frame
m.multiply(pMatrix, vMatrix, tmpMatrix);

// calculate mvpMatrix - This is the final matrix that is passed to the shader
m.multiply(tmpMatrix, mMatrix, mvpMatrix);

// **** UNIFORMS INIT VALUES ****

// **** Texture **** ---- DISABLED ----

// Load Textures - Need to load the src as html image, then bind to webgl, then attach to uniform
const texture_srcs = ['../static/init_walkers.png'];

// load async in parallel
async function loadTextures(texture_srcs: string[]) {
  const loadedTextures = await Promise.all(texture_srcs.map(src => createTexture(src)));
  return loadedTextures;
}

let textures: WebGLTexture[] = [];

loadTextures(texture_srcs)
  .then(loadedTextures => {
    textures = loadedTextures.filter((tex): tex is WebGLTexture => tex !== null);
    // Somethings stuffed, maybe non 2^x img size?
    if (textures.length !== texture_srcs.length) {
      console.warn('Some textures failed to load.');
    }
    // Somethings really stuffed
    if (textures.length === 0 && texture_srcs.length > 0) {
      throw new Error('Failed to load any textures.');
    }
    animationLoop();
  })
  .catch(error => {
    console.error('Error loading textures:', error);
  });

const textureDim = 128;
const texture_size = textureDim * 4;
const walker_count = textureDim * textureDim;

const framebuffers: {f: WebGLFramebuffer; d: WebGLRenderbuffer; t: WebGLTexture}[] = [];
framebuffers.push(
  createFramebuffer(texture_size, texture_size),
  createFramebuffer(texture_size, texture_size),
);

// Setup buffer for rendering points
// Render Program
// eslint-disable-next-line prettier/prettier
const renderAttStrides = [
  1
];
// Att. Location - basically index of the buffer, needs to be called after shader compilation
// const renderPositionAttLocation = gl.getAttribLocation(render_prog, 'position');
const renderIndexAttLocation = gl.getAttribLocation(render_prog, 'a_index');
const renderAttLocations = [renderIndexAttLocation];
console.log('renderAttLocations', renderAttLocations);

const indices = Array(walker_count);
for (let i = 0; i < walker_count; i++) indices[i] = i;

const pointPositions = Array(walker_count * 3);
pointPositions.fill(0);

const renderVBOS = Array(3);
renderVBOS[0] = createVBO(indices);

let i = 0;

let doFirstFrame = true;

function drawFrame() {
  const ni = i;
  i = (i + 1) % 2;

  // Draw to frame buffer first
  // Draw to current buffer, using previous texture as draw source
  gl.useProgram(walker_update_prog);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[i].f);
  gl.viewport(0, 0, texture_size, texture_size);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Texture 0 = previous frame Data
  if (doFirstFrame) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    gl.uniform1i(gl.getUniformLocation(walker_update_prog as WebGLProgram, 'texture'), 0);
    doFirstFrame = false;
  } else {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, framebuffers[ni].t);
    gl.uniform1i(gl.getUniformLocation(walker_update_prog as WebGLProgram, 'texture'), 0);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibos[0]);
  set_attribute(vbos, walkerAttLocations, walkerAttStrides);
  gl.uniformMatrix4fv(updateUniLocations[0], false, mvpMatrix);
  // Uniform tex coord
  gl.drawElements(gl.TRIANGLES, vertex_data.indices.length, gl.UNSIGNED_SHORT, 0);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Render scene
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, c.width, c.height);
  gl.useProgram(render_prog);

  // Texture 0 = current frame Data
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, framebuffers[i].t);
  gl.uniform1i(gl.getUniformLocation(render_prog as WebGLProgram, 'texture'), 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  // set_attribute(renderVBOS, renderAttLocations, renderAttStrides);
  // Bind the VBO for the index attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, renderVBOS[0]);
  gl.enableVertexAttribArray(renderAttLocations[0]);
  gl.vertexAttribPointer(renderAttLocations[0], renderAttStrides[0], gl.FLOAT, false, 0, 0);
  if (!ext) {
    console.error('ANGLE_instanced_arrays extension lost!');
    return; // Or throw error
  }
  ext.vertexAttribDivisorANGLE(renderAttLocations[0], 1); // Enable instancing for index attribute
  // Set the number of instances to draw
  gl.uniformMatrix4fv(renderUniLocations[0], false, mvpMatrix);
  ext.drawArraysInstancedANGLE(gl.POINTS, 0, 1, walker_count);
  ext.vertexAttribDivisorANGLE(renderAttLocations[0], 0);
}

function animationLoop() {
  drawFrame();
  requestAnimationFrame(animationLoop);
}

//#region **** FUNCTIONS ****

function createShader(id: string) {
  let shader: WebGLShader | null = null;
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
      shader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
      break;
    // Compile for fragment shader
    case 'x-shader/x-fragment':
      shader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
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
  } else {
    console.error(
      'Error compiling' + scriptElement.type + 'shader: ' + gl.getShaderInfoLog(shader),
    );
    gl.deleteShader(shader);
    return null;
  }
}

function createProgram(vs: WebGLShader, fs: WebGLShader) {
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
  } else {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
}

function createVBO(data: number[]) {
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

function createIBO(data: number[]) {
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

function set_attribute(vbos: WebGLBuffer[], attLs: GLint[], attSs: number[]) {
  for (const i in vbos) {
    // Bind Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vbos[i]);
    // Enable attribute
    gl.enableVertexAttribArray(attLs[i]);
    // Set attribute pointer
    gl.vertexAttribPointer(attLs[i], attSs[i], gl.FLOAT, false, 0, 0);
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = e => reject(new Error(`Failed to load image: ${src}, error: ${e}`));
    img.src = src;
  });
}

async function createTexture(src: string): Promise<WebGLTexture | null> {
  try {
    const img = await loadImage(src);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return tex;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function createFramebuffer(
  width: number,
  height: number,
): {t: WebGLTexture; f: WebGLFramebuffer; d: WebGLRenderbuffer} {
  const framebuffer = gl.createFramebuffer();

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  // Depth render buffer
  const depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

  // Color texture
  const fTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fTexture);
  // Allocate texture memory - null means no data, so only allocate memory
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // attach to framebuffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);

  // Unbind all
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // return framebuffer
  return {f: framebuffer, d: depthBuffer, t: fTexture};
}

function hsva(h: number, s: number, v: number, a: number) {
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
  if (s! > 0 && s! < 0) {
    color.push(v, v, v, a);
  } else {
    const r = [v, n, m, m, k, v];
    const g = [k, v, v, n, m, m];
    const b = [m, m, k, v, v, n];
    color.push(r[i], g[i], b[i], a);
  }
  return color;
}
//#endregion
