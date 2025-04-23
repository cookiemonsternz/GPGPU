import * as shapes from './shapes.js';
import {matIV, qtnIV} from './minMatrix.js';
import {get} from 'http';
declare const ace: any;
class App {
  //#region Properties
  private m!: matIV;
  private gl!: WebGLRenderingContext;
  private ext!: ANGLE_instanced_arrays;
  private canvas!: HTMLCanvasElement;
  private updateProgram!: WebGLProgram;
  private drawProgram!: WebGLProgram;
  private matrices!: {
    mMatrix: Float32Array;
    vMatrix: Float32Array;
    pMatrix: Float32Array;
    tmpMatrix: Float32Array;
    mvpMatrix: Float32Array;
  };
  private frameBuffers: {f: WebGLFramebuffer; d: WebGLRenderbuffer; t: WebGLTexture}[] = [];
  public textureSize: number;
  public textureDim: number;
  private textures: WebGLTexture[] = [];
  private uniforms: {locations: WebGLUniformLocation[]; values: number[]}[] = [];
  public colors: {
    background: [number, number, number, number];
    start: [number, number, number, number];
    end: [number, number, number, number];
  };
  private vertexData!: {position: number[]; textureCoordinates: number[]; indices: number[]};
  private buffers: {
    vbos: WebGLBuffer[];
    ibos: WebGLBuffer[];
    attLocations: GLint[];
    attStrides: number[];
  }[] = [];
  private walkerCount: number;
  public doRender = true;
  public doFirstFrame = true;
  //#endregion

  constructor(
    textureDim = 128,
    colors: {
      background: [number, number, number, number];
      start: [number, number, number, number];
      end: [number, number, number, number];
    } = {
      background: [0.07, 0.2, 0.2, 1.0],
      start: [0.21, 0.35, 0.6, 0.1],
      end: [0.0, 1.0, 0.5, 0.05],
    },
  ) {
    this.textureSize = textureDim * 4;
    this.walkerCount = textureDim * textureDim;
    this.textureDim = textureDim;
    this.colors = colors;
    this.init();
    this.compilePrograms();
    this.createMatrices();
    this.createFramebuffers();
    this.createVertexData();
    this.createBuffers();
    this.getUniformLocations();
    this.preRenderBind();
    this.clearScreen(this.colors.background);
    this.createTextures();
  }

  init() {
    // Initialize Canvas
    const cElement = document.getElementById('canvas');
    if (!(cElement instanceof HTMLCanvasElement)) {
      alert('Canvas element not found or null');
      throw new Error('Canvas element not found or null');
    }
    this.canvas = cElement;
    this.updateCanvasSize();
    // Initialize WebGL context
    const glContext =
      this.canvas.getContext('webgl', {
        preserveDrawingBuffer: true,
        alpha: false,
        premultipliedAlpha: false,
      }) ??
      this.canvas.getContext('experimental-webgl', {
        preserveDrawingBuffer: true,
        alpha: false,
        premultipliedAlpha: false,
      });
    if (!glContext) {
      alert('Your browser does not support webgl');
      throw new Error('WebGL context unavailable');
    }
    this.gl = glContext as WebGLRenderingContext;
    // Initialize Extensions
    const ext = this.gl.getExtension('ANGLE_instanced_arrays');
    if (!ext) {
      console.error('ANGLE_instanced_arrays extension not supported');
      throw new Error('ANGLE_instanced_arrays extension not supported');
    }
    this.ext = ext;
  }

  render(i: number) {
    if (this.doRender === false) {
      return;
    }
    const newI = this.drawFrame(i);
    requestAnimationFrame(() => {
      this.render(newI);
    });
  }

  drawFrame(i: number) {
    const ni = i;
    i = (i + 1) % 2;
    // Draw to frame buffer first
    // Draw to current buffer, using previous texture as draw source
    this.gl.useProgram(this.updateProgram);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffers[i].f);
    this.gl.viewport(0, 0, this.textureSize, this.textureSize);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    // Texture 0 = previous frame Data
    if (this.doFirstFrame) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
      this.gl.uniform1i(
        this.gl.getUniformLocation(this.updateProgram as WebGLProgram, 'texture'),
        0,
      );
      this.doFirstFrame = false;
    } else {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameBuffers[ni].t);
      this.gl.uniform1i(
        this.gl.getUniformLocation(this.updateProgram as WebGLProgram, 'texture'),
        0,
      );
    }
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers[0].ibos[0]);
    this.set_attribute(
      this.buffers[0].vbos,
      this.buffers[0].attLocations as number[],
      this.buffers[0].attStrides,
    );
    this.gl.uniformMatrix4fv(this.uniforms[0].locations[0], false, this.matrices.mvpMatrix);
    // Uniform tex coord
    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.vertexData.indices.length,
      this.gl.UNSIGNED_SHORT,
      0,
    );
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    // Render scene
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.useProgram(this.drawProgram);
    // Alpha Blending - Enables alpha blending, the method used for transparency
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA); // just look at the site lol, w029
    // Texture 0 = current frame Data
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameBuffers[i].t);
    this.gl.uniform1i(this.gl.getUniformLocation(this.drawProgram as WebGLProgram, 'texture'), 0);
    // Set the start and end colors
    this.gl.uniform4fv(this.uniforms[1].locations[1], this.colors.start);
    this.gl.uniform4fv(this.uniforms[1].locations[2], this.colors.end);
    // set_attribute(renderVBOS, renderAttLocations, renderAttStrides);
    // Bind the VBO for the index attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[1].vbos[0]);
    this.gl.enableVertexAttribArray(this.buffers[1].attLocations[0]);
    this.gl.vertexAttribPointer(
      this.buffers[1].attLocations[0],
      this.buffers[1].attStrides[0],
      this.gl.FLOAT,
      false,
      0,
      0,
    );
    if (!this.ext) {
      console.error('ANGLE_instanced_arrays extension lost!');
      return; // Or throw error
    }
    this.ext.vertexAttribDivisorANGLE(this.buffers[1].attLocations[0], 1); // Enable instancing for index attribute
    // Set the number of instances to draw
    this.gl.uniformMatrix4fv(this.uniforms[1].locations[0], false, this.matrices.mvpMatrix);
    this.ext.drawArraysInstancedANGLE(this.gl.POINTS, 0, 1, this.walkerCount);
    this.ext.vertexAttribDivisorANGLE(this.buffers[1].attLocations[0], 0);
    this.gl.disable(this.gl.BLEND);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    return i;
  }

  updateCanvasSize() {
    const cssW = this.canvas.clientWidth,
      cssH = this.canvas.clientHeight,
      dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  compilePrograms() {
    // Program 1 - Walker update shader
    // shaders
    const walker_v_shader = this.createShader('wvs');
    const walker_f_shader = this.createShader('wfs');
    if (!walker_v_shader || !walker_f_shader) {
      console.error('Error compiling walker shaders');
      return;
    }
    // program
    const walker_update_prog = this.createProgram(walker_v_shader, walker_f_shader);
    if (!walker_update_prog) {
      console.error('Failed to create program');
      throw new Error('Program creation failed'); // Stop
    }
    // Program 2 - Walker draw shader
    // shaders
    const render_v_shader = this.createShader('rvs');
    const render_f_shader = this.createShader('rfs');
    if (!render_v_shader || !render_f_shader) {
      console.error('Failed to create shaders');
      throw new Error('Shader creation failed'); // Stop
    }
    // Create Program 2 - walker render program
    const render_prog = this.createProgram(render_v_shader, render_f_shader);
    if (!render_prog) {
      console.error('Failed to create program');
      throw new Error('Program creation failed'); // Stop
    }

    // Store the programs
    this.updateProgram = walker_update_prog;
    this.drawProgram = render_prog;
  }

  compileUpdateProgram(wfsCode: string) {
    const walker_v_shader = this.createShader('wvs');
    const walker_f_shader = this.createShaderFromCode(wfsCode, this.gl.FRAGMENT_SHADER);
    if (!walker_v_shader || !walker_f_shader) {
      console.error('Error compiling walker shaders');
      return;
    }
    // program
    const walker_update_prog = this.createProgram(walker_v_shader, walker_f_shader);
    if (!walker_update_prog) {
      console.error('Failed to create program');
      throw new Error('Program creation failed'); // Stop
    }

    this.updateProgram = walker_update_prog;
  }

  createMatrices() {
    this.m = new matIV();
    this.matrices = {
      mMatrix: this.m.identity(this.m.create()),
      vMatrix: this.m.identity(this.m.create()),
      pMatrix: this.m.identity(this.m.create()),
      tmpMatrix: this.m.identity(this.m.create()),
      mvpMatrix: this.m.identity(this.m.create()),
    };
    // vMatrix - Contains information about the camera
    const eye: [number, number, number] = [0.0, 0.0, 1.0]; // Camera position
    const center: [number, number, number] = [0.0, 0.0, 0.0]; // Look at point
    const up: [number, number, number] = [0.0, 1.0, 0.0]; // Up direction
    this.m.lookAt(eye, center, up, this.matrices.vMatrix);

    // pMatrix - Contains the projection transformation, fov and clipping planes
    // const fov = 90; // Field of view
    // const aspect = c.width / c.height; // Aspect ratio
    // const near = 0.1; // Near clipping plane
    // const far = 100; // Far clipping plane
    // m.perspective(fov, aspect, near, far, pMatrix);
    this.m.ortho(-1, 1, -1, 1, -1, 1, this.matrices.pMatrix); // Orthographic projection

    // Calculate tmpMatrix - Does this here instead of render loop so not needed to be done every frame
    this.m.multiply(this.matrices.pMatrix, this.matrices.vMatrix, this.matrices.tmpMatrix);

    // calculate mvpMatrix - This is the final matrix that is passed to the shader
    this.m.multiply(this.matrices.tmpMatrix, this.matrices.mMatrix, this.matrices.mvpMatrix);
  }

  createFramebuffers() {
    this.frameBuffers.push(
      this.createFramebuffer(this.textureSize, this.textureSize),
      this.createFramebuffer(this.textureSize, this.textureSize),
    );
  }

  createBuffers() {
    // Att. Stride - How many numbers in each index of the buffer, e.g, 3 for vec3, etc...
    const positionAttStrides = 3; // vec3 for position, 3 floats
    const textureCoordAttStrides = 2; // vec2 for texture coordinates, 2 floats
    const indexAttStrides = 1; // vec1 for index, 1 float
    const walkerAttStrides = [positionAttStrides, textureCoordAttStrides];
    // Walker Update Program
    // Att. Location - basically index of the buffer, needs to be called after shader compilation
    const positionAttLocation = this.gl.getAttribLocation(this.updateProgram, 'position');
    const textureCoordAttLocation = this.gl.getAttribLocation(this.updateProgram, 'textureCoord');
    const walkerAttLocations = [positionAttLocation, textureCoordAttLocation];

    // Create VBOs and IBOs
    const vbos = [
      this.createVBO(this.vertexData.position),
      this.createVBO(this.vertexData.textureCoordinates),
    ];
    const ibos = [this.createIBO(this.vertexData.indices)];
    // Create attribute locations and strides
    const renderAttStrides = [1];
    const renderIndexAttLocation = this.gl.getAttribLocation(this.drawProgram, 'a_index');
    const renderAttLocations = [renderIndexAttLocation];
    console.log('renderAttLocations', renderAttLocations);

    const indices = Array(this.walkerCount);
    for (let i = 0; i < this.walkerCount; i++) {
      indices[i] = i;
    }
    const pointPositions = Array(this.walkerCount * 3);
    pointPositions.fill(0);

    const renderVBOs = [this.createVBO(indices)];
    // Store the buffers
    this.buffers.push(
      {
        vbos: vbos,
        ibos: ibos,
        attLocations: walkerAttLocations,
        attStrides: walkerAttStrides,
      },
      {
        vbos: renderVBOs,
        ibos: [],
        attLocations: renderAttLocations,
        attStrides: renderAttStrides,
      },
    );
  }

  createVertexData() {
    const vertex_data = {
      position: [-1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, -1.0, 1.0, 0.0],
      textureCoordinates: [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
      indices: [0, 1, 2, 2, 3, 0],
    };
    this.vertexData = vertex_data;
  }

  getUniformLocations() {
    const drawUniformNames = ['mvpMatrix'];

    const updateUniLocations: WebGLUniformLocation[] = [];

    for (let i = 0; i < drawUniformNames.length; i++) {
      // Get the uniform location, more webgl global states :sigh:
      updateUniLocations[i] = this.gl.getUniformLocation(
        this.updateProgram,
        drawUniformNames[i],
      ) as WebGLUniformLocation;
      if (updateUniLocations[i] === null) {
        console.error(`Uniform location for '${drawUniformNames[i]}' is null`);
        throw new Error(`Uniform location for '${drawUniformNames[i]}' not found`);
      }
    }

    const renderUniformNames = ['mvpMatrix', 'startColor', 'endColor'];
    const renderUniLocations: WebGLUniformLocation[] = [];

    for (let i = 0; i < renderUniformNames.length; i++) {
      // Get the uniform location, more webgl global states :sigh:
      renderUniLocations[i] = this.gl.getUniformLocation(
        this.drawProgram,
        renderUniformNames[i],
      ) as WebGLUniformLocation;

      if (renderUniLocations[i] === null) {
        console.error(`Uniform location for '${renderUniformNames[i]}' is null`);
        throw new Error(`Uniform location for '${renderUniformNames[i]}' not found`);
      }
    }
    // Store the uniform locations
    this.uniforms = [
      {locations: updateUniLocations, values: []},
      {locations: renderUniLocations, values: []},
    ];
  }

  async loadTextures(texture_srcs: string[]) {
    const loadedTextures = await Promise.all(texture_srcs.map(src => this.createTexture(src)));
    return loadedTextures;
  }

  createTextures() {
    const texture_srcs = ['../static/init_walkers.png'];
    this.loadTextures(texture_srcs)
      .then(loadedTextures => {
        this.textures = loadedTextures.filter((tex): tex is WebGLTexture => tex !== null);
        // Somethings stuffed, maybe non 2^x img size?
        if (this.textures.length !== texture_srcs.length) {
          console.warn('Some textures failed to load.');
        }
        // Somethings really stuffed
        if (this.textures.length === 0 && texture_srcs.length > 0) {
          throw new Error('Failed to load any textures.');
        }
        console.log('Textures loaded successfully');
        this.render(0);
      })
      .catch(error => {
        console.error('Error loading textures:', error);
      });
  }

  preRenderBind() {
    // Bind ibo
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers[0].ibos[0]);
  }

  clearScreen(color: [number, number, number, number]) {
    this.gl.clearColor(color[0], color[1], color[2], color[3]);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  createShader(id: string) {
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
        shader = this.gl.createShader(this.gl.VERTEX_SHADER) as WebGLShader;
        break;
      // Compile for fragment shader
      case 'x-shader/x-fragment':
        shader = this.gl.createShader(this.gl.FRAGMENT_SHADER) as WebGLShader;
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
    this.gl.shaderSource(shader, scriptElement.text);
    // Compile the shader
    this.gl.compileShader(shader);
    // Check that shader compiled successfully
    if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.log('Shader ' + scriptElement.type + ' compiled successfully');
      return shader;
    } else {
      console.error(
        'Error compiling' + scriptElement.type + 'shader: ' + this.gl.getShaderInfoLog(shader),
      );
      this.gl.deleteShader(shader);
      return null;
    }
  }

  createShaderFromCode(code: string, type: number) {
    // Create a shader object
    const shader = this.gl.createShader(type);
    if (!shader) {
      console.error('Error while creating shader');
      throw new Error('Could not create shader');
    }

    // Set the shader source code
    this.gl.shaderSource(shader, code);

    // Compile the shader
    this.gl.compileShader(shader);

    // Check for compilation errors
    if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.log('Shader compiled successfully');
      return shader;
    } else {
      console.error(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
  }

  createProgram(vs: WebGLShader, fs: WebGLShader) {
    // create a program object
    const program = this.gl.createProgram();
    if (!program) {
      console.error('Error while creating program');
      throw new Error('Could not create program');
    }

    // Attach the shaders to the program
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);

    // Link the program
    this.gl.linkProgram(program);

    // Check if the program linked successfully
    if (this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      // Use the program
      this.gl.useProgram(program);
      console.log('Program linked successfully');
      return program;
    } else {
      console.error(this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
  }

  createFramebuffer(
    width: number,
    height: number,
  ): {t: WebGLTexture; f: WebGLFramebuffer; d: WebGLRenderbuffer} {
    console.log('Creating framebuffer', width, 'x', height);
    const framebuffer = this.gl.createFramebuffer();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    // Depth render buffer
    const depthBuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthBuffer);

    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
    this.gl.framebufferRenderbuffer(
      this.gl.FRAMEBUFFER,
      this.gl.DEPTH_ATTACHMENT,
      this.gl.RENDERBUFFER,
      depthBuffer,
    );

    // Color texture
    const fTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, fTexture);
    // Allocate texture memory - null means no data, so only allocate memory
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null,
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    // attach to framebuffer
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      fTexture,
      0,
    );

    // Unbind all
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    // return framebuffer
    return {f: framebuffer, d: depthBuffer, t: fTexture};
  }

  set_attribute(vbos: WebGLBuffer[], attLs: GLint[], attSs: number[]) {
    for (const i in vbos) {
      // Bind Buffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbos[i]);
      // Enable attribute
      this.gl.enableVertexAttribArray(attLs[i]);
      // Set attribute pointer
      this.gl.vertexAttribPointer(attLs[i], attSs[i], this.gl.FLOAT, false, 0, 0);
    }
  }

  createVBO(data: number[]) {
    // Create the buffer object
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      console.error('Error while creating buffer');
      throw new Error('Could not create buffer');
    }

    // Bind the buffer object to target, in webgl 1.0, either ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER, difference is that
    // ELEMENT_ARRAY_BUFFER is used for IBO
    // and ARRAY_BUFFER is used for VBO
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

    // Pass the vertex data to the buffer object
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);

    // disable buffer binding
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

    console.log('VBO created successfully');
    // Return generated vbo
    return buffer;
  }

  createIBO(data: number[]) {
    // create base buffer object
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      console.error('Error while creating buffer');
      throw new Error('Could not create buffer');
    }

    // bind object to target, in this case, IBO, so element array buffer
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);

    // pass index data to buffer object
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), this.gl.STATIC_DRAW);

    // disable buffer binding
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);

    console.log('IBO created successfully');
    // return generated ibo
    return buffer;
  }

  async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = e => reject(new Error(`Failed to load image: ${src}, error: ${e}`));
      img.src = src;
    });
  }

  async createTexture(src: string): Promise<WebGLTexture | null> {
    try {
      const img = await this.loadImage(src);

      const tex = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        img,
      );
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);

      return tex;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

// Initialize the app
const app = new App();

window.addEventListener('resize', () => {
  app.updateCanvasSize();
  app.createFramebuffer(app.textureSize, app.textureSize);
  app.doFirstFrame = true;
  app.clearScreen(app.colors.background);
  app.render(0);
});

function compileShaders() {
  console.warn('Reloading shaders');
  console.time('Recompile');
  // First get the code for wfs, this is what the user will edit
  const code = editor.getValue();
  // Get the colors from the code
  const colors = getColors(code);
  app.colors.background = colors[0] as [number, number, number, number];
  app.colors.start = colors[1] as [number, number, number, number];
  app.colors.end = colors[2] as [number, number, number, number];
  // Get the code for the shader
  const shaderCode = getCode(code);
  const wvsCode = '\n' + defaultWFSPt1 + shaderCode + defaultWFSPt2 + '\n';
  // console.log('wvsCode', wvsCode);
  // Test if the code is valid

  // Compile the shader
  app.doRender = false;
  app.compileUpdateProgram(wvsCode);
  app.getUniformLocations();
  app.doFirstFrame = true;
  app.clearScreen(app.colors.background);
  app.doRender = true;
  console.timeEnd('Recompile');
}

const defaultWFSPt1 = `precision highp float;

uniform sampler2D texture; // Texture sampler
varying vec3 vPosition;
varying vec2 vTextureCoord;
const float jump_distance = 0.0005;

float unpackFloat(vec4 c_normalized) {
    const float factor = 255.0 / 256.0;
    return factor * (c_normalized.r +
        c_normalized.g / 256.0 +
        c_normalized.b / (256.0 * 256.0) +
        c_normalized.a / (256.0 * 256.0 * 256.0));
}

vec4 packFloat(float value) {
    value *= 256.0;
    const float factor = 256.0;
    float r = floor(value);
    float g = floor(fract(value) * factor);
    float b = floor(fract(value * factor) * factor);
    float a = floor(fract(value * factor * factor) * factor);
    return vec4(r, g, b, a) / 255.0;
}

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}`;
const defaultWFSPt2 = `vec2 random2D(vec2 uv) {
    float x = sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453;
    return normalize(vec2(fract(x), fract(x * 0.5)) * 2.0 - 1.0);
}

vec2 getPosValue(vec2 uv_pixel) {
    vec2 uv_x;
    vec2 uv_y;

    if(uv_pixel.x < 0.5) { // x pos
        uv_x = uv_pixel;
        uv_y = vec2(uv_pixel.x + 0.5, uv_pixel.y);
    } else { // y pos
        uv_x = vec2(uv_pixel.x - 0.5, uv_pixel.y);
        uv_y = uv_pixel;
    }

    uv_x = clamp(uv_x, 0.0, 1.0);
    uv_y = clamp(uv_y, 0.0, 1.0);

    vec4 color_x = texture2D(texture, uv_x);
    vec4 color_y = texture2D(texture, uv_y);

    return vec2(unpackFloat(color_x), unpackFloat(color_y));
}

vec2 getIdealNeighbour(vec2 uv_pixel, vec2 current_pos) {
    vec2 idealNeighbour = current_pos;
    float currentHighest = sdf(current_pos);

    vec2 uv_x = (uv_pixel.x < 0.5) ? uv_pixel : vec2(uv_pixel.x - 0.5, uv_pixel.y);
    vec2 base_seed = uv_x * dot(uv_x, vec2(12.9898, 78.233));

    for(int i = 0; i < num_directions; i++) {
        vec2 direction = random2D(base_seed + float(i) * 0.1);

        vec2 neighbourPos = current_pos + direction * jump_distance;
        float neighbourSDF = sdf(neighbourPos);

        if(neighbourSDF > currentHighest) {
            idealNeighbour = neighbourPos;
            currentHighest = neighbourSDF;
        }
    }
    return idealNeighbour;
}

bool isStuck(vec2 uv_pixel) {
    vec2 current_pos = getPosValue(uv_pixel);
    vec2 idealNeighbour = getIdealNeighbour(uv_pixel, current_pos);
    return sdf(idealNeighbour) <= sdf(current_pos) + 0.0001;
}

vec2 getNewPos(vec2 uv_pixel, bool isCheck) {
    vec2 current_pos = getPosValue(uv_pixel);
    vec2 idealNeighbour = getIdealNeighbour(uv_pixel, current_pos);

    if(sdf(idealNeighbour) > sdf(current_pos)) {
        return idealNeighbour;
    } else {
        vec2 randomPos = vec2(fract(sin(dot(current_pos, vec2(12.9898, 78.233))) * 43758.5453), fract(sin(dot(current_pos, vec2(78.233, 12.9898))) * 43758.5453));
        return randomPos * 2.0 - 1.0; // Scale to [-1, 1]
    }
}

vec4 resetLife(vec2 uv_pixel) {
    // // We need to get bottom left quadrant
    // vec2 uv_utils;
    // if (uv_pixel.x < 0.5) {
    //     uv_utils = vec2(uv_pixel.x, uv_pixel.y + 0.5);
    // } else {
    //     uv_utils = vec2(uv_pixel.x - 0.5, uv_pixel.y + 0.5);
    // }
    return packFloat(0.0); // Reset life value
}

float get_utils_values(vec2 uv_pixel) {
    // We return the color of the pixel in the utils quadrant
    // Bottom left 
    vec2 uv_utils;
    if(uv_pixel.x < 0.5) {
        uv_utils = vec2(uv_pixel.x, uv_pixel.y + 0.5);
    } else {
        uv_utils = vec2(uv_pixel.x - 0.5, uv_pixel.y + 0.5);
    }
    return unpackFloat(texture2D(texture, uv_utils));
}

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(512.0, 512.0);

    if(uv.y <= 0.5) {
        vec2 newPos = getNewPos(uv, false);
        if(uv.x < 0.5) { // x pos
            gl_FragColor = packFloat(newPos.x);
        } else { // y pos
            gl_FragColor = packFloat(newPos.y);
        }
    } else {
        vec2 uv_pos = uv - vec2(0.0, 0.5);
        if(isStuck(uv_pos) || unpackFloat(texture2D(texture, uv)) > 3.0) {
            gl_FragColor = resetLife(uv);
        } else {
            float current_life = unpackFloat(texture2D(texture, uv));
            gl_FragColor = packFloat(current_life + 0.01);
        }
    }
    // gl_FragColor = packFloat(current_pos.x); // Get position value from texture
    //gl_FragColor = vec4(0.57, 0.34, 0.34, 1.0); // Basic color output
}`;

// **** ACE ****
const editor = ace.edit('editor', {
  mode: 'ace/mode/glsl',
  selectionStyle: 'text',
});
editor.setTheme('ace/theme/monokai');
const defaultCode = `// *** ctrl + s to compile (cmd + s on mac) ***
// most standard glsl functions are available
// Webgl 1.0 so some limitations, e.g no round() :(
// snoise - simplex noise - this is also available
// more noise functions to come soon...
// but you can always write your own :)

// number of directions each walker checks
// lower number = more performance
const int num_directions = 200;

const background_color = vec4(0.07, 0.2, 0.2, 1.0);
const start_color = vec4(0.21, 0.35, 0.6, 0.1);
const end_color = vec4(0.0, 1.0, 0.5, 0.05);

float sdf(vec2 pos) {
    float scale = 5.0;
    // Example SDF function (noise), simplex noise
    return snoise(pos * scale);
}`;
editor.setValue(defaultCode, -1);

editor.commands.addCommand({
  name: 'compile',
  bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
  sender: 'editor|cli',
  exec: function (editor) {
    console.log('Compiling');
    compileShaders(editor.getValue());
  },
});
// **** REGEX ****
function removeComments(code: string) {
  const regex = /\/\/.*$/gm; // Single line comments
  const regex2 = /\/\*[\s\S]*?\*\//g; // Multi-line comments
  const cleanedCode = code.replace(regex, '').replace(regex2, '');
  return cleanedCode;
}

function getColors(code: string) {
  // Need to filter to return an array of form:
  /*
  colors = [
    'const background_color = vec4(0.0, 0.0, 0.0, 1.0);',
    'const start_color = vec4(1.0, 0.0, 0.0, 0.01);',
    'const end_color = vec4(0.0, 0.0, 1.0, 0.05);',
  ]
  */
  // Then filter again to get the color values and return array of form:
  /*
  colors = [
    [0.0, 0.0, 0.0, 1.0],
    [1.0, 0.0, 0.0, 0.01],
    [0.0, 0.0, 1.0, 0.05],
  ]
  */
  const regex = /const\s+(\w+)\s*=\s*vec4\(([^)]+)\);/g; // Regex to match vec4 colors
  const colors: string[] = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    colors.push(match[2]);
  }
  const colorValues = colors.map(color => {
    const values = color.split(',').map(value => parseFloat(value.trim()));
    return values;
  });
  return colorValues;
}

function getCode(code: string) {
  // Get the 'code' part of the shader
  // in the case of default code, this would be
  /*
  const int num_directions = 36;
  float sdf(vec2 pos) {
    float scale = 5.0;
    return snoise(pos * scale);
  }
  */
  // So we need to filter out the colors, comments, and any other junk
  let cleanedCode = removeComments(code);
  // Filter out the colors
  const colorRegex = /const\s+(\w+)\s*=\s*vec4\(([^)]+)\);/g; // Regex to match vec4 colors
  cleanedCode = cleanedCode.replace(colorRegex, '');
  return cleanedCode;
}
