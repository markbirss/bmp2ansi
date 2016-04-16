"use strict";

export default class Framebuffer {
  /*
   * Create a new framebuffer with `width` x `height` pixels.
   * `colorDepth` is informational only. The pixels are stored as 32-bit
   * values, as aRGB: 8 bits per color, big-endian (blue in the lowest 8
   * bits), with the highest 8 bits as alpha (transparency).
   */
  constructor(width, height, colorDepth) {
    // pixels are stored in (y, x) order, top to bottom, left to right.
    this.buffer = new ArrayBuffer(4 * width * height);
    this.pixels = new Uint32Array(this.buffer);
    this.width = width;
    this.height = height;
    this.colorDepth = colorDepth;
  }

  inspect() {
    return `Framebuffer(width=${this.width}, height=${this.height}, depth=${this.colorDepth})`;
  }

  setPixel(x, y, color) {
    this.pixels[y * this.width + x] = color;
  }

  getPixel(x, y) {
    return this.pixels[y * this.width + x];
  }

  getPixelAsGray(x, y) {
    // 0.21 R + 0.72 G + 0.07 B
    const pixel = this.pixels[y * this.width + x];
    return 0.21 * ((pixel >> 16) & 0xff) + 0.72 * ((pixel >> 8) & 0xff) + 0.07 * (pixel & 0xff);
  }

  isOn(x, y) {
    return this.getPixelAsGray(x, y) >= 127;
  }

  /*
   * remove the alpha channel by rendering each pixel against a given
   * background color.
   */
  renderAlpha(backgroundColor) {
    for (let i = 0; i < this.pixels.length; i++) {
      const alpha = (this.pixels[i] >> 24) & 0xff;
      if (alpha == 255) continue;

      const color = this.pixels[i] & 0xffffff;
      const blend = alpha / 255;
      const mix = (shift) => {
        const pc = (color >> shift) & 0xff;
        const bc = (backgroundColor >> shift) & 0xff;
        return ((pc * blend + bc * (1.0 - blend)) & 0xff) << shift;
      };

      this.pixels[i] = 0xff000000 | mix(16) | mix(8) | mix(0);
    }
  }

  /*
   * walk a flood-fill algorithm starting from a single point (default 0, 0).
   * for each pixel, call `f(x, y, pixel)`. the `f` function should return
   * `true` if the given pixel is "inside" the region, and we should keep
   * exploring in this direction. additionally, `f` may modify the image.
   * each pixel will only be called once.
   */
  walk(f, x = 0, y = 0) {
    const used = new Uint8Array(this.width * this.height);
    const workQueue = [ (y * this.width + x) ];

    while (workQueue.length > 0) {
      const offset = workQueue.pop();
      if (used[offset] == 0) {
        used[offset] = 1;
        const currentY = Math.floor(offset / this.width);
        const currentX = offset % this.width;
        const included = f(currentX, currentY, this.pixels[offset]);
        if (included) {
          // add work for any pixel nearby that's still in range.
          if (currentX > 0) workQueue.push(offset - 1);
          if (currentX < this.width - 1) workQueue.push(offset + 1);
          if (currentY > 0) workQueue.push(offset - this.width);
          if (currentY < this.height - 1) workQueue.push(offset + this.width);
        }
      }
    }
  }
}
