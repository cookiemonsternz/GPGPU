// Process for rendering:

// Init everything
// We store each walker into 3 textures:
// T1 = pos.x
// T2 = pos.y
// T3:
// r = life
// g = doRender
// b = none
// a = none
// We have fs to update this, need two fbo for ping ponging

// // What does walker update need to do?
// UNIFORMS
// Num directions
// jump size
// bias
// OTHer stuff
// needs the sdf function, might be hard to get the dynamic compiling,
// as actually need to compile shader each time, no uniform funcs :(

// how to draw?
// vs point stuff, we take in the texture, sample it based on point index, and set the gl_position etc to that one, then render it in fs.

// What does a draw loop look like
// assume fbos and stuff are all good
let i = 0;

let ni = i;
i = (ni + 1) % 2;

// Update walkers
set_attribute(plane_data);
calculate_matrices();

gl.bindFramebuffer(fbo[i].f);
gl.viewport(0, 0, 128, 128); // Size of walker texture
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
gl.useProgram(walker_program);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, fbo[ni].t);
gl.uniform1i(gl.getUniformLocation(walker_program, "u_texture"), 0);
gl.uniform1i(gl.getUniformLocation(walker_program, "u_num_dir"), num_dir);
gl.uniform1f(gl.getUniformLocation(walker_program, "u_jump_size"), jumpSize);
gl.uniform1f(gl.getUniformLocation(walker_program, "u_bias"), 0.5);
gl.drawElements(gl.TRIANGLES, plane_data.num_indices, gl.UNSIGNED_SHORT, 0);


// Draw actual scene rect
gl.useProgram(draw_program);
gl.bindFramebuffer(null);
gl.viewport(0, 0, canvas.width, canvas.height);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, fbo[i].t);
gl.uniform1i(gl.getUniformLocation(draw_program, "u_texture"), 0);
// Etc uniforms

gl.drawArraysInstanced(gl.POINTS, 0, 1, num_walkers);

// repeat...