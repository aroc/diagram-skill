import { describe, it } from "node:test";
import assert from "node:assert";

import { textWidth, nodeSize, collectPositions, collectEdgeRoutes } from "../elk-layout.js";
import type { ElkResult } from "../elk-layout.js";
import { polylineMidpoint, escapeXml } from "../svg-renderer.js";
import { getTheme } from "../themes.js";

// ─── T1: textWidth and nodeSize ──────────────────────────────────────

describe("textWidth", () => {
  it("returns length * fontSize * 1.3", () => {
    // "Hello" has 5 chars, fontSize 20 => 5 * 20 * 1.3 = 130
    assert.strictEqual(textWidth("Hello", 20), 130);
  });

  it("returns 0 for empty string", () => {
    assert.strictEqual(textWidth("", 20), 0);
  });
});

describe("nodeSize", () => {
  it("hits MIN_NODE_W for short labels", () => {
    // "Hi" => textWidth = 2 * 20 * 1.3 = 52, plus NODE_PAD_X=70 => 122 < 170
    const result = nodeSize("Hi");
    assert.deepStrictEqual(result, { width: 170, height: 52 });
  });

  it("returns width > 170 for long labels", () => {
    // "This is a long label" => 20 chars * 20 * 1.3 = 520, + 70 = 590
    const result = nodeSize("This is a long label");
    assert.ok(result.width > 170, `Expected width > 170 but got ${result.width}`);
    assert.strictEqual(result.width, 20 * 20 * 1.3 + 70); // 590
    assert.strictEqual(result.height, 52);
  });
});

// ─── T2: polylineMidpoint ────────────────────────────────────────────

describe("polylineMidpoint", () => {
  it("returns [0, 0] for empty array", () => {
    assert.deepStrictEqual(polylineMidpoint([]), [0, 0]);
  });

  it("returns the single point for a one-element array", () => {
    assert.deepStrictEqual(polylineMidpoint([[7, 3]]), [7, 3]);
  });

  it("returns the midpoint of two points", () => {
    // [[0,0],[10,0]] => midpoint at [5,0]
    assert.deepStrictEqual(polylineMidpoint([[0, 0], [10, 0]]), [5, 0]);
  });

  it("handles L-shape: midpoint falls exactly at the bend", () => {
    // [[0,0],[10,0],[10,10]] — segment lengths: 10, 10; total 20; half = 10
    // Walk: first segment length 10, half (10) <= 10, so t = 10/10 = 1
    // point = [0 + 1*(10-0), 0 + 1*(0-0)] = [10, 0]
    assert.deepStrictEqual(
      polylineMidpoint([[0, 0], [10, 0], [10, 10]]),
      [10, 0],
    );
  });

  it("handles zero-length segment (duplicate points) without dividing by zero", () => {
    // [[5,5],[5,5],[15,5]] — segment lengths: 0, 10; total 10; half = 5
    // Walk: first segment length 0, half (5) > 0 so skip (half stays 5)
    // second segment length 10, half (5) <= 10, t = 5/10 = 0.5
    // point = [5 + 0.5*(15-5), 5 + 0.5*(5-5)] = [10, 5]
    assert.deepStrictEqual(
      polylineMidpoint([[5, 5], [5, 5], [15, 5]]),
      [10, 5],
    );
  });
});

// ─── T3: escapeXml ──────────────────────────────────────────────────

describe("escapeXml", () => {
  it("escapes & < > and double quote", () => {
    assert.strictEqual(escapeXml("&"), "&amp;");
    assert.strictEqual(escapeXml("<"), "&lt;");
    assert.strictEqual(escapeXml(">"), "&gt;");
    assert.strictEqual(escapeXml('"'), "&quot;");
  });

  it("leaves normal text unchanged", () => {
    assert.strictEqual(escapeXml("Hello World"), "Hello World");
  });

  it("handles a string with all special chars", () => {
    assert.strictEqual(
      escapeXml('A & B < C > D "E"'),
      "A &amp; B &lt; C &gt; D &quot;E&quot;",
    );
  });
});

// ─── T4: collectPositions ───────────────────────────────────────────

describe("collectPositions", () => {
  it("returns absolute positions for two top-level children", () => {
    const elkResult: ElkResult = {
      id: "root",
      children: [
        { id: "A", x: 10, y: 20, width: 100, height: 50 },
        { id: "B", x: 200, y: 30, width: 120, height: 60 },
      ],
    };

    const positions = collectPositions(elkResult);
    assert.deepStrictEqual(positions.get("A"), { x: 10, y: 20, width: 100, height: 50 });
    assert.deepStrictEqual(positions.get("B"), { x: 200, y: 30, width: 120, height: 60 });
    assert.strictEqual(positions.size, 2);
  });

  it("accumulates coordinates for nested children", () => {
    const elkResult: ElkResult = {
      id: "root",
      children: [
        {
          id: "group1",
          x: 10,
          y: 20,
          width: 300,
          height: 200,
          children: [
            { id: "child1", x: 5, y: 10, width: 80, height: 40 },
          ],
        },
      ],
    };

    const positions = collectPositions(elkResult);
    // group1 is at (10, 20) absolute
    assert.deepStrictEqual(positions.get("group1"), { x: 10, y: 20, width: 300, height: 200 });
    // child1 is at (10+5, 20+10) = (15, 30) absolute
    assert.deepStrictEqual(positions.get("child1"), { x: 15, y: 30, width: 80, height: 40 });
  });
});

// ─── T5: collectEdgeRoutes ──────────────────────────────────────────

describe("collectEdgeRoutes", () => {
  it("builds a polyline from startPoint, bendPoints, and endPoint", () => {
    const elkResult: ElkResult = {
      id: "root",
      children: [
        { id: "A", x: 0, y: 0, width: 100, height: 50 },
        { id: "B", x: 200, y: 0, width: 100, height: 50 },
      ],
      edges: [
        {
          id: "edge-0",
          sections: [
            {
              startPoint: { x: 100, y: 25 },
              endPoint: { x: 200, y: 25 },
              bendPoints: [{ x: 150, y: 0 }],
            },
          ],
        },
      ],
    };

    const positions = collectPositions(elkResult);
    const routes = collectEdgeRoutes(elkResult, positions);
    const route = routes.get("edge-0");

    assert.ok(route, "edge-0 route should exist");
    assert.deepStrictEqual(route, [
      [100, 25],  // startPoint (offset 0,0 from root)
      [150, 0],   // bendPoint
      [200, 25],  // endPoint
    ]);
  });

  it("applies container offset when edge.container differs from the node", () => {
    // Edge is on root, but container is set to "group1" which is at (50, 60)
    const elkResult: ElkResult = {
      id: "root",
      children: [
        {
          id: "group1",
          x: 50,
          y: 60,
          width: 300,
          height: 200,
          children: [
            { id: "A", x: 10, y: 10, width: 80, height: 40 },
            { id: "B", x: 150, y: 10, width: 80, height: 40 },
          ],
        },
      ],
      edges: [
        {
          id: "edge-0",
          container: "group1",
          sections: [
            {
              startPoint: { x: 90, y: 30 },
              endPoint: { x: 150, y: 30 },
            },
          ],
        },
      ],
    };

    const positions = collectPositions(elkResult);
    const routes = collectEdgeRoutes(elkResult, positions);
    const route = routes.get("edge-0");

    // container "group1" is at absolute (50, 60), so offset applied is (50, 60)
    assert.ok(route, "edge-0 route should exist");
    assert.deepStrictEqual(route, [
      [50 + 90, 60 + 30],  // [140, 90]
      [50 + 150, 60 + 30], // [200, 90]
    ]);
  });
});

// ─── T6: getTheme ───────────────────────────────────────────────────

describe("getTheme", () => {
  it('"slate" returns a theme with id "slate"', () => {
    const theme = getTheme("slate");
    assert.strictEqual(theme.id, "slate");
  });

  it('"sandstone" returns a theme with id "sandstone"', () => {
    const theme = getTheme("sandstone");
    assert.strictEqual(theme.id, "sandstone");
  });

  it('"figjam" returns a theme with id "figjam" and has nodeColors', () => {
    const theme = getTheme("figjam");
    assert.strictEqual(theme.id, "figjam");
    assert.ok(theme.nodeColors, "figjam theme should have nodeColors");
    assert.ok(Array.isArray(theme.nodeColors), "nodeColors should be an array");
    assert.ok(theme.nodeColors.length > 0, "nodeColors should not be empty");
  });

  it('"invalid" throws an error containing "Unknown theme"', () => {
    assert.throws(
      () => getTheme("invalid"),
      (err: Error) => {
        assert.ok(
          err.message.includes("Unknown theme"),
          `Expected error message to contain "Unknown theme" but got: ${err.message}`,
        );
        return true;
      },
    );
  });
});
