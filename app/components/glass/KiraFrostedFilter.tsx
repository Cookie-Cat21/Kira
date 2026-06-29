"use client";

/**
 * Bespalov-style frosted refraction filter (codepen.io/Mikhail-Bespalov/pen/MYwrMNy).
 * Applied via `backdrop-filter: url(#kira-frosted)` on the glass rim so the store
 * behind bends through the edge with a subtle lens effect.
 */
export default function KiraFrostedFilter() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <filter id="kira-frosted" primitiveUnits="objectBoundingBox">
        <feImage
          href={BEVEL_MAP}
          x="0"
          y="0"
          width="1"
          height="1"
          preserveAspectRatio="none"
          result="map"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
        <feDisplacementMap
          in="blur"
          in2="map"
          scale="0.65"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

const BEVEL_MAP =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">` +
      `<defs>` +
      `<linearGradient id="r" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0%" stop-color="#000"/><stop offset="34%" stop-color="#800000"/>` +
      `<stop offset="66%" stop-color="#800000"/><stop offset="100%" stop-color="#f00"/>` +
      `</linearGradient>` +
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="#000"/><stop offset="34%" stop-color="#008000"/>` +
      `<stop offset="66%" stop-color="#008000"/><stop offset="100%" stop-color="#0f0"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect width="100" height="100" fill="url(#r)"/>` +
      `<rect width="100" height="100" fill="url(#g)" style="mix-blend-mode:screen"/>` +
      `</svg>`
  );
