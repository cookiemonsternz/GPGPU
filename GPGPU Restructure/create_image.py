from PIL import Image
import numpy as np
import matplotlib.pyplot as plt

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

W, H = 256, 256
img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
px = img.load()

# fill only the top‐left and top‐right quarters
for x in range(128):
    for y in range(128):
        rnd = np.random.uniform()  # Use Beta distribution for clustering around 0 and 1
        px[x, y]           = pack_float_to_rgba(rnd)      # X‐seed
        px[x + 128, y]     = pack_float_to_rgba(np.random.uniform())  # Y‐seed
# leave the rest whatever you want

img.save("./static/init_walkers.png")
img.show()

floats = np.zeros((W, H), dtype=np.float32)
for x in range(W):
    for y in range(128):
        floats[x, y] = rgba_to_float(px[x, y])

# Histogram of floats w/ matplotlib
plt.hist(floats.flatten(), bins=256, range=(0, 1.0), density=True)
plt.title("Histogram of floats")
plt.xlabel("Value")
plt.ylabel("Density")
plt.xlim(0, 1)
plt.ylim(0, 1)  # Remove hardcoded ylim to allow matplotlib to scale automatically
plt.grid()
plt.show()