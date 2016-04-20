"use strict";

import { get_color } from "antsy";
import { readBmp } from "./bmp";

import "source-map-support/register";

const ESC = "\u001b";
const BLOCK_TOP = "\u2580";
const BLOCK_BOTTOM = "\u2584";
const SPACE = " ";

const BLACK = 0;

// percent intensity required before we'll bother to render a pixel (on black)
const CUTOFF = 0.1;

export function main() {
  const argv = process.argv.slice(2);
  if (argv.length == 0) {
    process.stderr.write("usage: bmp2ansi <filename.bmp>\n");
    process.stderr.write("  writes ansi codes to stderr\n");
    process.exit(1);
  }

  argv.forEach(filename => {
    const fb = readBmp(filename);
    fb.renderAlpha(BLACK);
    process.stdout.write(renderFramebuffer(fb, CUTOFF));
  });
}

function renderFramebuffer(fb, cutoff) {
  let out = "";
  for (let y = 0; y < fb.height; y += 2) {
    out += renderRow(fb, y, cutoff) + "\n";
  }
  return out;
}

// two rows at a time, because of the block chars.
function renderRow(fb, y, cutoff) {
  let line = "";
  for (let x = 0; x < fb.width; x++) {
    const topIntensity = fb.getPixelAsGray(x, y) / 255;
    const bottomIntensity = fb.getPixelAsGray(x, y + 1) / 255;

    // don't display anything if both colors are too dim.
    // otherwise, pick the brightest color to be the "block" forground.
    if (topIntensity <= cutoff && bottomIntensity <= cutoff) {
      line += ESC + "[0m" + SPACE;
    } else if (topIntensity >= bottomIntensity) {
      line += fgColor(fb.getPixel(x, y)) + bgColor(fb.getPixel(x, y + 1)) + BLOCK_TOP;
    } else {
      line += fgColor(fb.getPixel(x, y + 1)) + bgColor(fb.getPixel(x, y)) + BLOCK_BOTTOM;
    }
  }
  line += ESC + "[0m";
  return line;
}

function fgColor(color) {
  return ansiColor(color, "38");
}

function bgColor(color) {
  return ansiColor(color, "48");
}

function ansiColor(color, prefix) {
  let hex = (color & 0xffffff).toString(16);
  while (hex.length < 6) hex = "0" + hex;
  return ESC + "[" + prefix + ";5;" + get_color(hex) + "m";
}
