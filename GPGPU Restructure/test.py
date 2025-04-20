import numpy as np

def pack_float_to_rgba(v):
    # clamp to [0,1)
    v = np.clip(v, 0.0, 1.0 - 1e-7)
    v *= 256.0
    r = int(v)
    v = (v - r) * 256.0
    g = int(v)
    v = (v - g) * 256.0
    b = int(v)
    v = (v - b) * 256.0
    a = int(v)
    return (r, g, b, a)

def rgba_to_float(px):
    r, g, b, a = px
    v = (r + g / 256.0 + b / 256.0**2 + a / 256.0**3) / 256.0
    return v

print(pack_float_to_rgba(0.0))