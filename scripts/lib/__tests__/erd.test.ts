import { describe, it } from "node:test";
import assert from "node:assert";

import { layoutErd, entitySize } from "../erd-layout.js";
import { renderErdSvg } from "../erd-renderer.js";
import { getTheme } from "../themes.js";
import { buildSvg } from "../diagram.js";

// ─── Entity sizing ──────────────────────────────────────────────────

describe("entitySize", () => {
  it("respects minimum width", () => {
    const size = entitySize({
      id: "t",
      label: "T",
      fields: [{ name: "id", type: "INT", pk: true }],
    });
    assert.ok(size.width >= 180, `Expected width >= 180 but got ${size.width}`);
  });

  it("grows width with long field names", () => {
    const small = entitySize({
      id: "t",
      label: "T",
      fields: [{ name: "id", type: "INT" }],
    });
    const large = entitySize({
      id: "t",
      label: "T",
      fields: [{ name: "very_long_field_name_here", type: "VARCHAR(255)" }],
    });
    assert.ok(large.width > small.width, "Wider fields should produce wider entity");
  });

  it("height grows with field count", () => {
    const few = entitySize({
      id: "t",
      label: "T",
      fields: [{ name: "id", type: "INT" }],
    });
    const many = entitySize({
      id: "t",
      label: "T",
      fields: [
        { name: "a", type: "INT" },
        { name: "b", type: "INT" },
        { name: "c", type: "INT" },
        { name: "d", type: "INT" },
      ],
    });
    assert.ok(many.height > few.height, "More fields should produce taller entity");
  });

  it("accounts for PK/FK prefix width", () => {
    const noPk = entitySize({
      id: "t",
      label: "T",
      fields: [{ name: "some_long_name", type: "VARCHAR(255)" }],
    });
    const withPk = entitySize({
      id: "t",
      label: "T",
      fields: [{ name: "some_long_name", type: "VARCHAR(255)", pk: true }],
    });
    assert.ok(
      withPk.width >= noPk.width,
      "PK prefix should not shrink entity width",
    );
  });
});

// ─── Validation ─────────────────────────────────────────────────────

describe("layoutErd validation", () => {
  it("rejects empty entities", async () => {
    await assert.rejects(
      () => layoutErd(JSON.stringify({ type: "erd", entities: [], relationships: [] })),
      (err: Error) => err.message.includes("at least one entity"),
    );
  });

  it("rejects entity with no fields", async () => {
    await assert.rejects(
      () =>
        layoutErd(
          JSON.stringify({
            type: "erd",
            entities: [{ id: "t", label: "T", fields: [] }],
            relationships: [],
          }),
        ),
      (err: Error) => err.message.includes("at least one field"),
    );
  });

  it("rejects duplicate entity IDs", async () => {
    await assert.rejects(
      () =>
        layoutErd(
          JSON.stringify({
            type: "erd",
            entities: [
              { id: "t", label: "T", fields: [{ name: "id", type: "INT" }] },
              { id: "t", label: "T2", fields: [{ name: "id", type: "INT" }] },
            ],
            relationships: [],
          }),
        ),
      (err: Error) => err.message.includes('Duplicate entity ID "t"'),
    );
  });

  it("rejects relationship referencing unknown entity", async () => {
    await assert.rejects(
      () =>
        layoutErd(
          JSON.stringify({
            type: "erd",
            entities: [
              { id: "a", label: "A", fields: [{ name: "id", type: "INT" }] },
            ],
            relationships: [{ from: "a", to: "missing" }],
          }),
        ),
      (err: Error) => err.message.includes('unknown entity "missing"'),
    );
  });

  it("rejects invalid cardinality", async () => {
    await assert.rejects(
      () =>
        layoutErd(
          JSON.stringify({
            type: "erd",
            entities: [
              { id: "a", label: "A", fields: [{ name: "id", type: "INT" }] },
              { id: "b", label: "B", fields: [{ name: "id", type: "INT" }] },
            ],
            relationships: [{ from: "a", to: "b", fromCardinality: "MANY" }],
          }),
        ),
      (err: Error) => err.message.includes('Invalid fromCardinality "MANY"'),
    );
  });
});

// ─── Rendering ──────────────────────────────────────────────────────

describe("renderErdSvg", () => {
  it("renders entity header and field rows", async () => {
    const layout = await layoutErd(
      JSON.stringify({
        type: "erd",
        entities: [
          {
            id: "users",
            label: "Users",
            fields: [
              { name: "id", type: "SERIAL", pk: true },
              { name: "email", type: "VARCHAR(255)" },
            ],
          },
        ],
        relationships: [],
      }),
    );

    const svg = renderErdSvg(layout, getTheme("slate"), "white");
    assert.ok(svg.includes("Users"), "Expected entity header label");
    assert.ok(svg.includes("email"), "Expected field name");
    assert.ok(svg.includes("VARCHAR(255)"), "Expected field type");
    assert.ok(svg.includes("PK"), "Expected PK indicator");
  });

  it("renders FK indicators", async () => {
    const layout = await layoutErd(
      JSON.stringify({
        type: "erd",
        entities: [
          {
            id: "orders",
            label: "Orders",
            fields: [
              { name: "id", type: "INT", pk: true },
              { name: "user_id", type: "INT", fk: true },
            ],
          },
        ],
        relationships: [],
      }),
    );

    const svg = renderErdSvg(layout, getTheme("slate"), "white");
    assert.ok(svg.includes("FK"), "Expected FK indicator");
  });

  it("renders cardinality labels", async () => {
    const layout = await layoutErd(
      JSON.stringify({
        type: "erd",
        entities: [
          {
            id: "a",
            label: "A",
            fields: [{ name: "id", type: "INT", pk: true }],
          },
          {
            id: "b",
            label: "B",
            fields: [
              { name: "id", type: "INT", pk: true },
              { name: "a_id", type: "INT", fk: true },
            ],
          },
        ],
        relationships: [
          { from: "a", to: "b", fromCardinality: "1", toCardinality: "N" },
        ],
      }),
    );

    const svg = renderErdSvg(layout, getTheme("slate"), "white");
    // Cardinality labels should appear in the SVG
    assert.ok(svg.includes(">1<"), "Expected '1' cardinality label");
    assert.ok(svg.includes(">N<"), "Expected 'N' cardinality label");
  });

  it("renders relationship labels", async () => {
    const layout = await layoutErd(
      JSON.stringify({
        type: "erd",
        entities: [
          { id: "a", label: "A", fields: [{ name: "id", type: "INT" }] },
          { id: "b", label: "B", fields: [{ name: "id", type: "INT" }] },
        ],
        relationships: [{ from: "a", to: "b", label: "has many" }],
      }),
    );

    const svg = renderErdSvg(layout, getTheme("slate"), "white");
    assert.ok(svg.includes("has many"), "Expected relationship label");
  });

  it("renders with figjam theme (per-entity colors)", async () => {
    const layout = await layoutErd(
      JSON.stringify({
        type: "erd",
        entities: [
          { id: "a", label: "A", fields: [{ name: "id", type: "INT" }] },
          { id: "b", label: "B", fields: [{ name: "id", type: "INT" }] },
        ],
        relationships: [{ from: "a", to: "b" }],
      }),
    );

    const svg = renderErdSvg(layout, getTheme("figjam"), "white");
    assert.ok(svg.includes("<svg"), "Expected SVG output");
    // Figjam uses nodeColors cycling — different entities should have different header fills
    assert.ok(svg.includes("#FFC943"), "Expected figjam yellow color");
  });
});

// ─── Dispatcher integration ─────────────────────────────────────────

describe("ERD via buildSvg", () => {
  it("dispatches to ERD renderer when type is erd", async () => {
    const svg = await buildSvg(
      JSON.stringify({
        type: "erd",
        entities: [
          {
            id: "users",
            label: "Users",
            fields: [
              { name: "id", type: "INT", pk: true },
              { name: "name", type: "VARCHAR(100)" },
            ],
          },
        ],
        relationships: [],
      }),
      getTheme("slate"),
      "white",
    );

    assert.ok(svg.includes("<svg"), "Expected SVG output");
    assert.ok(svg.includes("Users"), "Expected entity label");
    assert.ok(svg.includes("PK"), "Expected PK indicator");
  });
});
