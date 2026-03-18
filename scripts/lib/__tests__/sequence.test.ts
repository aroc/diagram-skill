import { describe, it } from "node:test";
import assert from "node:assert";

import { layoutSequence } from "../sequence-layout.js";
import { renderSequenceSvg } from "../sequence-renderer.js";
import { getTheme } from "../themes.js";
import { buildSvg } from "../diagram.js";

// ─── Validation ─────────────────────────────────────────────────────

describe("layoutSequence validation", () => {
  it("rejects empty participants", () => {
    assert.throws(
      () => layoutSequence(JSON.stringify({ type: "sequence", participants: [], messages: [] })),
      (err: Error) => err.message.includes("at least one participant"),
    );
  });

  it("rejects missing participants array", () => {
    assert.throws(
      () => layoutSequence(JSON.stringify({ type: "sequence" })),
      (err: Error) => err.message.includes("at least one participant"),
    );
  });

  it("rejects duplicate participant IDs", () => {
    assert.throws(
      () =>
        layoutSequence(
          JSON.stringify({
            type: "sequence",
            participants: [
              { id: "a", label: "A" },
              { id: "a", label: "B" },
            ],
            messages: [],
          }),
        ),
      (err: Error) => err.message.includes('Duplicate participant ID "a"'),
    );
  });

  it("rejects message referencing unknown participant", () => {
    assert.throws(
      () =>
        layoutSequence(
          JSON.stringify({
            type: "sequence",
            participants: [{ id: "a", label: "A" }],
            messages: [{ from: "a", to: "unknown", label: "msg" }],
          }),
        ),
      (err: Error) => err.message.includes('unknown participant "unknown"'),
    );
  });

  it("rejects invalid JSON", () => {
    assert.throws(
      () => layoutSequence("not json"),
      (err: Error) => err.message.includes("Failed to parse"),
    );
  });
});

// ─── Layout ─────────────────────────────────────────────────────────

describe("layoutSequence positioning", () => {
  it("positions participants left-to-right", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
        ],
        messages: [],
      }),
    );

    const boxA = layout.participantBoxes.get("a")!;
    const boxB = layout.participantBoxes.get("b")!;
    const boxC = layout.participantBoxes.get("c")!;

    assert.ok(boxA.x < boxB.x, "A should be left of B");
    assert.ok(boxB.x < boxC.x, "B should be left of C");
  });

  it("lifeline X matches participant center", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [{ id: "a", label: "Test" }],
        messages: [],
      }),
    );

    const box = layout.participantBoxes.get("a")!;
    const ll = layout.lifelines.get("a")!;
    assert.strictEqual(ll.x, box.x + box.width / 2);
  });

  it("messages stack vertically", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        messages: [
          { from: "a", to: "b", label: "msg1" },
          { from: "b", to: "a", label: "msg2" },
          { from: "a", to: "b", label: "msg3" },
        ],
      }),
    );

    assert.strictEqual(layout.messagePositions.length, 3);
    assert.ok(
      layout.messagePositions[0].y < layout.messagePositions[1].y,
      "msg1 should be above msg2",
    );
    assert.ok(
      layout.messagePositions[1].y < layout.messagePositions[2].y,
      "msg2 should be above msg3",
    );
  });

  it("detects self-messages", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [{ id: "a", label: "A" }],
        messages: [{ from: "a", to: "a", label: "self" }],
      }),
    );

    assert.strictEqual(layout.messagePositions[0].isSelf, true);
  });

  it("self-messages take more vertical space", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        messages: [
          { from: "a", to: "b", label: "msg1" },
          { from: "a", to: "a", label: "self" },
          { from: "a", to: "b", label: "msg3" },
        ],
      }),
    );

    const gap1 = layout.messagePositions[1].y - layout.messagePositions[0].y;
    const gap2 = layout.messagePositions[2].y - layout.messagePositions[1].y;

    // Self-message takes more space
    assert.ok(gap2 > gap1, "Gap after self-message should be larger");
  });

  it("defaults message type to solid", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        messages: [{ from: "a", to: "b" }],
      }),
    );

    assert.strictEqual(layout.messagePositions[0].type, "solid");
  });
});

// ─── Rendering ──────────────────────────────────────────────────────

describe("renderSequenceSvg", () => {
  it("renders lifelines with stroke-dasharray", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        messages: [{ from: "a", to: "b", label: "test" }],
      }),
    );

    const svg = renderSequenceSvg(layout, getTheme("slate"), "white");
    assert.ok(svg.includes("stroke-dasharray"), "Expected lifeline dashes");
  });

  it("renders participant rects", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [{ id: "a", label: "TestBox" }],
        messages: [],
      }),
    );

    const svg = renderSequenceSvg(layout, getTheme("slate"), "white");
    assert.ok(svg.includes("TestBox"), "Expected participant label");
    assert.ok(svg.includes("<rect"), "Expected rect elements");
  });

  it("renders dashed messages differently from solid", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        messages: [
          { from: "a", to: "b", label: "req" },
          { from: "b", to: "a", label: "resp", type: "dashed" },
        ],
      }),
    );

    const svg = renderSequenceSvg(layout, getTheme("slate"), "white");
    assert.ok(svg.includes('stroke-dasharray="8,4"'), "Expected dashed line for response");
  });

  it("renders self-message as a path", () => {
    const layout = layoutSequence(
      JSON.stringify({
        type: "sequence",
        participants: [{ id: "a", label: "A" }],
        messages: [{ from: "a", to: "a", label: "self-call" }],
      }),
    );

    const svg = renderSequenceSvg(layout, getTheme("slate"), "white");
    assert.ok(svg.includes("<path"), "Expected path element for self-message");
    assert.ok(svg.includes("self-call"), "Expected self-message label");
  });
});

// ─── Dispatcher integration ─────────────────────────────────────────

describe("sequence via buildSvg", () => {
  it("dispatches to sequence renderer when type is sequence", async () => {
    const svg = await buildSvg(
      JSON.stringify({
        type: "sequence",
        participants: [
          { id: "a", label: "Client" },
          { id: "b", label: "Server" },
        ],
        messages: [{ from: "a", to: "b", label: "request" }],
      }),
      getTheme("slate"),
      "white",
    );

    assert.ok(svg.includes("<svg"), "Expected SVG output");
    assert.ok(svg.includes("Client"), "Expected participant label");
    assert.ok(svg.includes("request"), "Expected message label");
  });
});
