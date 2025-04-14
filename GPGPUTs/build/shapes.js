function torus(row, column, irad, orad, color) {
  const pos = [],
    nor = [],
    col = [],
    idx = [];
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

function sphere(row, column, rad, color) {
  const pos = [],
    nor = [],
    col = [],
    idx = [];
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
