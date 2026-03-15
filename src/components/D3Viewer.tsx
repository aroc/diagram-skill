import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { D3Data, D3Group, D3Node, D3Edge } from "../lib/d3-converter";
import type { DiagramTheme } from "../lib/themes";
import { exportSvg } from "../lib/d3-svg-export";
import "../d3-diagram.css";

interface D3ViewerProps {
  data: D3Data;
  theme: DiagramTheme;
}

export function D3Viewer({ data, theme }: D3ViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLayerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Zoom-to-fit
  const zoomToFit = useCallback(() => {
    const svg = svgRef.current;
    const zoomLayer = zoomLayerRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoomLayer || !zoom) return;

    const bounds = zoomLayer.getBBox();
    if (bounds.width === 0 || bounds.height === 0) return;

    const { width, height } = svg.getBoundingClientRect();
    const padding = 40;

    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
    );
    const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
    const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    d3.select(svg).call(zoom.transform, transform);
  }, []);

  // Initialize d3-zoom (once on mount)
  useEffect(() => {
    const svg = svgRef.current;
    const zoomLayer = zoomLayerRef.current;
    if (!svg || !zoomLayer) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        d3.select(zoomLayer).attr("transform", event.transform);
      });

    d3.select(svg).call(zoom);
    zoomRef.current = zoom;
  }, []);

  // Render diagram with d3 data joins
  useEffect(() => {
    const svg = svgRef.current;
    const zoomLayer = zoomLayerRef.current;
    if (!svg || !zoomLayer) return;

    const root = d3.select(zoomLayer);
    const defs = d3.select(svg).select<SVGDefsElement>("defs");

    // ─── Arrowhead marker ───────────────────────────────────────────
    defs.selectAll("#arrowhead").remove();
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 10)
      .attr("refY", 5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", theme.edge.strokeColor);

    // ─── Groups ─────────────────────────────────────────────────────
    const groupSel = root
      .select<SVGGElement>(".groups-layer")
      .selectAll<SVGGElement, D3Group>(".group")
      .data(data.groups, (d) => d.id);

    const groupEnter = groupSel.enter().append("g").attr("class", "group");
    groupEnter.append("rect");
    groupEnter.append("text").attr("class", "group-label");

    const groupMerge = groupEnter.merge(groupSel);
    groupMerge
      .select("rect")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("rx", theme.group.borderRadius)
      .attr(
        "fill",
        (d) => theme.groupColors[d.colorIndex % theme.groupColors.length],
      )
      .attr("fill-opacity", theme.group.opacity)
      .attr("stroke", theme.group.strokeColor)
      .attr("stroke-width", theme.group.strokeWidth);

    groupMerge
      .select(".group-label")
      .attr("x", (d) => d.x + 16)
      .attr("y", (d) => d.y + 24)
      .attr("fill", theme.group.labelColor)
      .text((d) => d.label);

    groupSel.exit().remove();

    // ─── Edges ──────────────────────────────────────────────────────
    const lineGen = d3
      .line()
      .x((d) => d[0])
      .y((d) => d[1]);

    const edgeSel = root
      .select<SVGGElement>(".edges-layer")
      .selectAll<SVGGElement, D3Edge>(".edge")
      .data(data.edges, (d) => d.id);

    const edgeEnter = edgeSel.enter().append("g").attr("class", "edge");
    edgeEnter.append("path");

    const edgeMerge = edgeEnter.merge(edgeSel);
    edgeMerge
      .select("path")
      .attr("d", (d) => lineGen(d.points))
      .attr("stroke", theme.edge.strokeColor)
      .attr("stroke-width", theme.edge.strokeWidth)
      .attr("marker-end", "url(#arrowhead)");

    // Edge labels
    edgeMerge.selectAll(".edge-label").remove();
    edgeMerge.each(function (d) {
      if (!d.label) return;
      const g = d3.select(this);
      const mid = edgeMidpoint(d.points);

      const labelGroup = g.append("g").attr("class", "edge-label");

      const text = labelGroup
        .append("text")
        .attr("x", mid[0])
        .attr("y", mid[1])
        .attr("fill", theme.edge.labelColor)
        .text(d.label);

      // Measure text and add background rect
      const bbox = (text.node() as SVGTextElement).getBBox();
      const padX = 6;
      const padY = 4;
      labelGroup
        .insert("rect", "text")
        .attr("x", bbox.x - padX)
        .attr("y", bbox.y - padY)
        .attr("width", bbox.width + padX * 2)
        .attr("height", bbox.height + padY * 2)
        .attr("rx", 4)
        .attr("fill", theme.edge.labelBgColor);
    });

    edgeSel.exit().remove();

    // ─── Nodes ──────────────────────────────────────────────────────
    const nodeSel = root
      .select<SVGGElement>(".nodes-layer")
      .selectAll<SVGGElement, D3Node>(".node")
      .data(data.nodes, (d) => d.id);

    const nodeEnter = nodeSel.enter().append("g").attr("class", "node");
    nodeEnter.append("rect");
    nodeEnter.append("text").attr("class", "node-label");

    const nodeMerge = nodeEnter.merge(nodeSel);
    nodeMerge
      .select("rect")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("rx", theme.node.borderRadius)
      .attr("fill", theme.node.bgColor)
      .attr("stroke", theme.node.strokeColor)
      .attr("stroke-width", theme.node.strokeWidth);

    nodeMerge
      .select(".node-label")
      .attr("x", (d) => d.x + d.width / 2)
      .attr("y", (d) =>
        d.description ? d.y + d.height / 2 - 8 : d.y + d.height / 2,
      )
      .attr("fill", theme.node.strokeColor)
      .text((d) => d.label);

    // Description text
    nodeMerge.selectAll(".node-description").remove();
    nodeMerge.each(function (d) {
      if (!d.description) return;
      d3.select(this)
        .append("text")
        .attr("class", "node-description")
        .attr("x", d.x + d.width / 2)
        .attr("y", d.y + d.height / 2 + 10)
        .attr("fill", theme.edge.labelColor)
        .text(d.description);
    });

    nodeSel.exit().transition().duration(200).attr("opacity", 0).remove();

    // Fit to view after rendering
    requestAnimationFrame(() => zoomToFit());
  }, [data, theme, zoomToFit]);

  const handleZoomIn = () => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    d3.select(svg).transition().duration(200).call(zoom.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    d3.select(svg).transition().duration(200).call(zoom.scaleBy, 0.7);
  };

  const handleExportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgString = exportSvg(svg, { padding: 40 });
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="diagram-container d3-container">
      <svg ref={svgRef} className="d3-diagram">
        <defs />
        <g ref={zoomLayerRef} className="zoom-layer">
          <g className="groups-layer" />
          <g className="edges-layer" />
          <g className="nodes-layer" />
        </g>
      </svg>
      <div className="d3-controls">
        <button className="d3-control-btn" title="Zoom in" onClick={handleZoomIn}>
          +
        </button>
        <button className="d3-control-btn" title="Zoom out" onClick={handleZoomOut}>
          &minus;
        </button>
        <button className="d3-control-btn" title="Fit view" onClick={zoomToFit}>
          &#x229E;
        </button>
        <button
          className="d3-control-btn"
          title="Export SVG"
          onClick={handleExportSvg}
        >
          &#x2193;
        </button>
      </div>
    </div>
  );
}

function edgeMidpoint(points: [number, number][]): [number, number] {
  if (points.length === 0) return [0, 0];
  let x = 0,
    y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}
