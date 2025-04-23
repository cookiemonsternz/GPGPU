var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { matIV } from './minMatrix.js';
class App {
    //#endregion
    constructor(textureDim = 128, colors = { background: [0, 0, 0, 1], start: [1, 0, 0, 0.01], end: [0, 0, 1, 0.05] }) {
        this.frameBuffers = [];
        this.textures = [];
        this.uniforms = [];
        this.buffers = [];
        this.doRender = true;
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
        var _a;
        // Initialize Canvas
        const cElement = document.getElementById('canvas');
        if (!(cElement instanceof HTMLCanvasElement)) {
            alert('Canvas element not found or null');
            throw new Error('Canvas element not found or null');
        }
        this.canvas = cElement;
        this.updateCanvasSize();
        // Initialize WebGL context
        const glContext = (_a = this.canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            alpha: false,
            premultipliedAlpha: false,
        })) !== null && _a !== void 0 ? _a : this.canvas.getContext('experimental-webgl', {
            preserveDrawingBuffer: true,
            alpha: false,
            premultipliedAlpha: false,
        });
        if (!glContext) {
            alert('Your browser does not support webgl');
            throw new Error('WebGL context unavailable');
        }
        this.gl = glContext;
        // Initialize Extensions
        const ext = this.gl.getExtension('ANGLE_instanced_arrays');
        if (!ext) {
            console.error('ANGLE_instanced_arrays extension not supported');
            throw new Error('ANGLE_instanced_arrays extension not supported');
        }
        this.ext = ext;
    }
    render(i, doFirstFrame = true) {
        if (this.doRender === false) {
            return;
        }
        const newI = this.drawFrame(i, doFirstFrame);
        requestAnimationFrame(() => {
            this.render(newI, false);
        });
    }
    drawFrame(i, doFirstFrame) {
        const ni = i;
        i = (i + 1) % 2;
        // Draw to frame buffer first
        // Draw to current buffer, using previous texture as draw source
        this.gl.useProgram(this.updateProgram);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffers[i].f);
        this.gl.viewport(0, 0, this.textureSize, this.textureSize);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        // Texture 0 = previous frame Data
        if (doFirstFrame) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
            this.gl.uniform1i(this.gl.getUniformLocation(this.updateProgram, 'texture'), 0);
            doFirstFrame = false;
        }
        else {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameBuffers[ni].t);
            this.gl.uniform1i(this.gl.getUniformLocation(this.updateProgram, 'texture'), 0);
        }
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers[0].ibos[0]);
        this.set_attribute(this.buffers[0].vbos, this.buffers[0].attLocations, this.buffers[0].attStrides);
        this.gl.uniformMatrix4fv(this.uniforms[0].locations[0], false, this.matrices.mvpMatrix);
        // Uniform tex coord
        this.gl.drawElements(this.gl.TRIANGLES, this.vertexData.indices.length, this.gl.UNSIGNED_SHORT, 0);
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
        this.gl.uniform1i(this.gl.getUniformLocation(this.drawProgram, 'texture'), 0);
        // Set the start and end colors
        this.gl.uniform4fv(this.uniforms[1].locations[1], this.colors.start);
        this.gl.uniform4fv(this.uniforms[1].locations[2], this.colors.end);
        // set_attribute(renderVBOS, renderAttLocations, renderAttStrides);
        // Bind the VBO for the index attribute
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[1].vbos[0]);
        this.gl.enableVertexAttribArray(this.buffers[1].attLocations[0]);
        this.gl.vertexAttribPointer(this.buffers[1].attLocations[0], this.buffers[1].attStrides[0], this.gl.FLOAT, false, 0, 0);
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
        const cssW = this.canvas.clientWidth, cssH = this.canvas.clientHeight, dpr = window.devicePixelRatio || 1;
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
    compileUpdateProgram() {
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
        const eye = [0.0, 0.0, 1.0]; // Camera position
        const center = [0.0, 0.0, 0.0]; // Look at point
        const up = [0.0, 1.0, 0.0]; // Up direction
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
        this.frameBuffers.push(this.createFramebuffer(this.textureSize, this.textureSize), this.createFramebuffer(this.textureSize, this.textureSize));
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
        this.buffers.push({
            vbos: vbos,
            ibos: ibos,
            attLocations: walkerAttLocations,
            attStrides: walkerAttStrides,
        }, {
            vbos: renderVBOs,
            ibos: [],
            attLocations: renderAttLocations,
            attStrides: renderAttStrides,
        });
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
        const updateUniLocations = [];
        for (let i = 0; i < drawUniformNames.length; i++) {
            // Get the uniform location, more webgl global states :sigh:
            updateUniLocations[i] = this.gl.getUniformLocation(this.updateProgram, drawUniformNames[i]);
            if (updateUniLocations[i] === null) {
                console.error(`Uniform location for '${drawUniformNames[i]}' is null`);
                throw new Error(`Uniform location for '${drawUniformNames[i]}' not found`);
            }
        }
        const renderUniformNames = ['mvpMatrix', 'startColor', 'endColor'];
        const renderUniLocations = [];
        for (let i = 0; i < renderUniformNames.length; i++) {
            // Get the uniform location, more webgl global states :sigh:
            renderUniLocations[i] = this.gl.getUniformLocation(this.drawProgram, renderUniformNames[i]);
            if (renderUniLocations[i] === null) {
                console.error(`Uniform location for '${renderUniformNames[i]}' is null`);
                throw new Error(`Uniform location for '${renderUniformNames[i]}' not found`);
            }
        }
        // Store the uniform locations
        this.uniforms = [
            { locations: updateUniLocations, values: [] },
            { locations: renderUniLocations, values: [] },
        ];
    }
    loadTextures(texture_srcs) {
        return __awaiter(this, void 0, void 0, function* () {
            const loadedTextures = yield Promise.all(texture_srcs.map(src => this.createTexture(src)));
            return loadedTextures;
        });
    }
    createTextures() {
        const texture_srcs = ['../static/init_walkers.png'];
        this.loadTextures(texture_srcs)
            .then(loadedTextures => {
            this.textures = loadedTextures.filter((tex) => tex !== null);
            // Somethings stuffed, maybe non 2^x img size?
            if (this.textures.length !== texture_srcs.length) {
                console.warn('Some textures failed to load.');
            }
            // Somethings really stuffed
            if (this.textures.length === 0 && texture_srcs.length > 0) {
                throw new Error('Failed to load any textures.');
            }
            console.log('Textures loaded successfully');
            this.render(0, true);
        })
            .catch(error => {
            console.error('Error loading textures:', error);
        });
    }
    preRenderBind() {
        // Bind ibo
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers[0].ibos[0]);
    }
    clearScreen(color) {
        this.gl.clearColor(color[0], color[1], color[2], color[3]);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    createShader(id) {
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
                shader = this.gl.createShader(this.gl.VERTEX_SHADER);
                break;
            // Compile for fragment shader
            case 'x-shader/x-fragment':
                shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
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
        }
        else {
            console.error('Error compiling' + scriptElement.type + 'shader: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
    }
    createProgram(vs, fs) {
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
        }
        else {
            console.error(this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
    }
    createFramebuffer(width, height) {
        console.log('Creating framebuffer', width, 'x', height);
        const framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        // Depth render buffer
        const depthBuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depthBuffer);
        // Color texture
        const fTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, fTexture);
        // Allocate texture memory - null means no data, so only allocate memory
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        // attach to framebuffer
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, fTexture, 0);
        // Unbind all
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        // return framebuffer
        return { f: framebuffer, d: depthBuffer, t: fTexture };
    }
    set_attribute(vbos, attLs, attSs) {
        for (const i in vbos) {
            // Bind Buffer
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbos[i]);
            // Enable attribute
            this.gl.enableVertexAttribArray(attLs[i]);
            // Set attribute pointer
            this.gl.vertexAttribPointer(attLs[i], attSs[i], this.gl.FLOAT, false, 0, 0);
        }
    }
    createVBO(data) {
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
    createIBO(data) {
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
    loadImage(src) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = e => reject(new Error(`Failed to load image: ${src}, error: ${e}`));
                img.src = src;
            });
        });
    }
    createTexture(src) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const img = yield this.loadImage(src);
                const tex = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.bindTexture(this.gl.TEXTURE_2D, null);
                return tex;
            }
            catch (error) {
                console.error(error);
                return null;
            }
        });
    }
}
// Initialize the app
const app = new App();
window.addEventListener('keypress', event => {
    if (event.key === 'r') {
        console.warn('Reloading shaders');
        console.time('Recompile');
        app.doRender = false;
        app.compileUpdateProgram();
        app.getUniformLocations();
        app.doRender = true;
        console.timeEnd('Recompile');
    }
});
