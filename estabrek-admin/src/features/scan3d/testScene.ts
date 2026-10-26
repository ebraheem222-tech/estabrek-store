/**
 * Drawn scenes for the scan's tests (vision.test.ts, analyse.test.ts): a wall, the printed
 * mat seen from the front and above (an ellipse) turned by a known angle, a product
 * standing on it, its shadow, and whatever else a test needs in the frame.
 */
import { MAT_R, MAT_STYLES, matBit, type MatStyle } from "./mat";
import { toEllipse, type Ellipse, type Img } from "./vision";

export type Blob = { cx: number; cy: number; rx: number; ry: number; rgb: [number, number, number] };
export type Scene = {
  w: number;
  h: number;
  mat: Ellipse | null;
  theta: number;
  mirror: 1 | -1;
  product?: Blob;
  shadow?: Blob;
  /** Something else in the frame (a hand, a passer-by), drawn last. */
  extra?: Blob;
  gain?: number;
  edgeThing?: boolean;
  style?: MatStyle;
  /** The whole picture moved (the camera did), in pixels. */
  shift?: [number, number];
};

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export const inBlob = (b: Blob, x: number, y: number) => ((x - b.cx) / b.rx) ** 2 + ((y - b.cy) / b.ry) ** 2 <= 1;

export function draw(s: Scene): Img {
  const data = new Uint8ClampedArray(s.w * s.h * 4);
  const [sx, sy] = s.shift ?? [0, 0];
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const X = x - sx;
      const Y = y - sy;
      // A warm wall and table, a little uneven.
      let rgb: [number, number, number] = [150 + (((X % 7) + 7) % 7), 132 + (((Y % 5) + 5) % 5), 118];
      if (s.mat) {
        const { r, t } = toEllipse(s.mat, X, Y);
        if (r <= 98 / 92.5) {
          let ink = false;
          if (r >= MAT_R.innerRing[0] && r <= MAT_R.innerRing[1]) ink = true;
          else if (r >= MAT_R.outerRing[0] && r <= MAT_R.outerRing[1]) ink = true;
          else if (r >= MAT_R.code[0] && r <= MAT_R.code[1]) ink = matBit((s.mirror * t * 180) / Math.PI - s.theta) === 1;
          // As printed: a little less than the pure colours.
          const c = hex(MAT_STYLES[s.style ?? "colour"][ink ? "ink" : "paper"]);
          rgb = [c[0] * 0.9 + 12, c[1] * 0.9 + 12, c[2] * 0.9 + 10];
        }
      }
      if (s.shadow && inBlob(s.shadow, X, Y)) rgb = [rgb[0] * 0.6, rgb[1] * 0.6, rgb[2] * 0.6];
      if (s.edgeThing && x < s.w * 0.05 && y < s.h * 0.4) rgb = [40, 90, 200];
      if (s.product && inBlob(s.product, X, Y)) rgb = s.product.rgb;
      if (s.extra && inBlob(s.extra, x, y)) rgb = s.extra.rgb;
      const g = s.gain ?? 1;
      const i = (y * s.w + x) * 4;
      data[i] = rgb[0] * g;
      data[i + 1] = rgb[1] * g;
      data[i + 2] = rgb[2] * g;
      data[i + 3] = 255;
    }
  return { w: s.w, h: s.h, data };
}
