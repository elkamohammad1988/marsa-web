import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("portfolio-screenshots");
const svg = readFileSync(resolve("app/icon.svg"));

for (const size of [512, 180, 64, 32, 16]) {
  await sharp(svg, { density: 400 }).resize(size, size).png().toFile(resolve(out, `icon-${size}.png`));
  console.log(`icon-${size}.png`);
}

const SW = [
  ["#BE185D", "brand"], ["#831843", "deep"], ["#F7CAC9", "quartz"],
  ["#91A8D0", "serenity"], ["#FB7185", "dark rose"],
];
const swatches = SW.map((c, i) =>
  `<rect x="${40 + i * 150}" y="620" width="130" height="130" rx="20" fill="${c[0]}"/>` +
  `<text x="${105 + i * 150}" y="792" font-family="sans-serif" font-size="24" fill="#1a0c14" text-anchor="middle">${c[1]}</text>`
).join("");

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="810" height="840">
  <rect width="810" height="840" fill="#faf4f6"/>
  <text x="40" y="72" font-family="sans-serif" font-size="34" font-weight="700" fill="#1a0c14">Marsa — icon &amp; rosé quartz</text>
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#BE185D"/><stop offset="1" stop-color="#831843"/></linearGradient></defs>
  <rect x="40" y="120" width="460" height="460" rx="108" fill="url(#g)"/>
  <g transform="translate(270,350) scale(15)" fill="none">
    <circle cx="0" cy="-8" r="3.6" fill="#fff"/>
    <g stroke="#fff" stroke-width="2.9" stroke-linecap="round" fill="none">
      <path d="M-7.5 -0.6q7.5 4.4 15 0"/>
      <path d="M-10 3.8q10 5.4 20 0" opacity="0.8"/>
    </g>
  </g>
  <text x="560" y="250" font-family="sans-serif" font-size="52" font-weight="700" fill="#be185d">marsa</text>
  <text x="562" y="300" font-family="sans-serif" font-size="22" fill="#6e5c66">Where your money lands.</text>
  ${swatches}
</svg>`;
await sharp(Buffer.from(sheet)).png().toFile(resolve(out, "brand-sheet.png"));
console.log("brand-sheet.png");
