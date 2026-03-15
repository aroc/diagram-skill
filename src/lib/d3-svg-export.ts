export function exportSvg(
  svgElement: SVGSVGElement,
  options?: {
    padding?: number;
    background?: string;
  },
): string {
  const padding = options?.padding ?? 40;
  const background = options?.background ?? "white";

  // Get content bounding box from the live zoom-layer
  const zoomLayer = svgElement.querySelector(".zoom-layer") as SVGGElement;
  if (!zoomLayer) return "";
  const bounds = zoomLayer.getBBox();

  // Clone the SVG to avoid mutating the live DOM
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Reset zoom transform on the clone
  const cloneZoomLayer = clone.querySelector(".zoom-layer");
  if (cloneZoomLayer) {
    cloneZoomLayer.removeAttribute("transform");
  }

  // Set viewBox to content bounds with padding
  const vbX = bounds.x - padding;
  const vbY = bounds.y - padding;
  const vbW = bounds.width + padding * 2;
  const vbH = bounds.height + padding * 2;
  clone.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  clone.setAttribute("width", String(vbW));
  clone.setAttribute("height", String(vbH));
  clone.removeAttribute("class");

  // Add background rect if not transparent
  if (background !== "transparent") {
    const bgRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    bgRect.setAttribute("x", String(vbX));
    bgRect.setAttribute("y", String(vbY));
    bgRect.setAttribute("width", String(vbW));
    bgRect.setAttribute("height", String(vbH));
    bgRect.setAttribute("fill", background);
    clone.insertBefore(bgRect, clone.firstChild);
  }

  // Inline CSS for self-contained SVG
  const defs = clone.querySelector("defs") ?? clone.insertBefore(
    document.createElementNS("http://www.w3.org/2000/svg", "defs"),
    clone.firstChild,
  );

  const style = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "style",
  );
  style.textContent = `
    text {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }
    .node-label {
      font-size: 14px; font-weight: 500;
      text-anchor: middle; dominant-baseline: central;
    }
    .node-description {
      font-size: 11px; text-anchor: middle; dominant-baseline: central;
      opacity: 0.7;
    }
    .group-label {
      font-size: 14px; font-weight: 700;
    }
    .edge path { fill: none; }
    .edge-label text {
      font-size: 13px; font-weight: 500;
      text-anchor: middle; dominant-baseline: central;
    }
  `;
  defs.appendChild(style);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
}
