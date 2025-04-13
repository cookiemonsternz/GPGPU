//#region Imports
declare const matIV: {
  new (): {
    create(): Float32Array;
    identity(dest: Float32Array): Float32Array;
    multiply(
      mat1: Float32Array,
      mat2: Float32Array,
      dest: Float32Array,
    ): Float32Array;
    scale(
      mat: Float32Array,
      vec: [number, number, number],
      dest: Float32Array,
    ): Float32Array;
    translate(
      mat: Float32Array,
      vec: [number, number, number],
      dest: Float32Array,
    ): Float32Array;
    rotate(
      mat: Float32Array,
      angle: number,
      axis: [number, number, number],
      dest: Float32Array,
    ): Float32Array;
    lookAt(
      eye: [number, number, number],
      center: [number, number, number],
      up: [number, number, number],
      dest: Float32Array,
    ): Float32Array;
    perspective(
      fovy: number,
      aspect: number,
      near: number,
      far: number,
      dest: Float32Array,
    ): Float32Array;
    transpose(mat: Float32Array, dest: Float32Array): Float32Array;
    inverse(mat: Float32Array, dest: Float32Array): Float32Array;
  };
};
//#endregion

//#region Setup
// Setup canvas and webgl
const c = document.getElementById('canvas') as HTMLCanvasElement;

c.width = 300;
c.height = 300;

const gl =
  (c.getContext('webgl') as WebGLRenderingContext) ||
  (c.getContext('experimental-webgl') as WebGLRenderingContext) ||
  alert('Your browser does not support WebGL');

// Clear the canvas
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
//#endregion

//#region Shaders Initialization
// Initialize shaders, program, and buffers
const v_shader = createShader('vs') as WebGLShader;
const f_shader = createShader('fs') as WebGLShader;

const prog = createProgram(v_shader, f_shader) as WebGLProgram;
//#endregion

//#region VBO Creation
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
  0.0, -1.0, 0.0,
];

const vertex_color = [
  // R, G, B, A
  // eslint-disable-next-line prettier/prettier
  1.0, 0.0, 0.0, 1.0,
  0.0, 1.0, 0.0, 1.0,
  0.0, 0.0, 1.0, 1.0,
  1.0, 1.0, 0.0, 1.0,
];

const indexes = [
  // indexes for vertex positions
  // eslint-disable-next-line prettier/prettier
  0, 1, 2,
  1, 2, 3
];

// Create the VBO's
const vbos = Array(2);
vbos[0] = createVBO(vertex_positions) as WebGLBuffer;
vbos[1] = createVBO(vertex_color) as WebGLBuffer;

// Bind vbos to attributes
set_attribute(vbos, attLocations, attStrides);

// Create the IBO
const ibos = Array(1);
ibos[0] = createIBO(indexes) as WebGLBuffer;
// Bind IBO to target
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibos[0]);
//#endregion

//#region Matrices Creation
// Get the uniform location
const uniLocation = gl.getUniformLocation(prog, 'mvpMatrix');

// Prepare matrices
const m = new matIV();
// MVP matrix
const mMatrix = m.identity(m.create());
const vMatrix = m.identity(m.create());
const pMatrix = m.identity(m.create());
const tmpMatrix = m.identity(m.create());
const mvpMatrix = m.identity(m.create());

// View coordinate transformation matrix
const eye: [number, number, number] = [0.0, 1.0, 3.0]; // Camera position
const center: [number, number, number] = [0.0, 0.0, 0.0]; // Look at point
const up: [number, number, number] = [0.0, 1.0, 0.0]; // Up direction
m.lookAt(eye, center, up, vMatrix);

// Perspective projection matrix
const fov = 90; // Field of view
const aspect = c.width / c.height; // Aspect ratio
const near = 0.1; // Near clipping plane
const far = 100; // Far clipping plane
m.perspective(fov, aspect, near, far, pMatrix);

// pv Matrix
m.multiply(pMatrix, vMatrix, tmpMatrix);
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
  count++;

  // Calc rotation in radians
  const rad = ((count % 360) * Math.PI) / 180;

  // get offset of rectangle
  m.identity(mMatrix);
  m.rotate(mMatrix, rad, [0.0, 1.0, 0.0], mMatrix); // Rotate around Y axis
  // Draw rectangle elements
  m.multiply(tmpMatrix, mMatrix, mvpMatrix); // MVP matrix
  gl.uniformMatrix4fv(uniLocation, false, mvpMatrix); // Set the uniform variable
  gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0); // Draw the rectangle

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
function createShader(id: string) {
  let shader: WebGLShader | null = null;
  // Get the shader source
  const scriptElement = document.getElementById(id) as HTMLScriptElement;
  // Make sure source exists
  if (!scriptElement) {
    alert('Shader not found');
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
  } else {
    alert(
      'Error compiling' +
        scriptElement.type +
        'shader: ' +
        gl.getShaderInfoLog(shader),
    );
    gl.deleteShader(shader);
    return null;
  }
}

function createProgram(vs: WebGLShader, fs: WebGLShader) {
  // create a program object
  const program = gl.createProgram() as WebGLProgram;

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
    alert(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
}

function createVBO(data: number[]) {
  // Create the buffer object
  const buffer = gl.createBuffer() as WebGLBuffer;

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
  const buffer = gl.createBuffer() as WebGLBuffer;

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
//#endregion
