import ELK from "elkjs/lib/elk.bundled.js";
import type { ErdDefinition, EntityDef, RelationshipDef, Cardinality } from "./erd-types.js";
import { textWidth, collectPositions, collectEdgeRoutes } from "./elk-layout.js";
import type { Box, ElkResult } from "./elk-layout.js";

const elk = new ELK();

// ─── Constants ──────────────────────────────────────────────────────

const ENTITY_HEADER_HEIGHT = 40;
const FIELD_ROW_HEIGHT = 28;
const ENTITY_PAD_X = 24;
const ENTITY_MIN_W = 180;
const ENTITY_FONT_SIZE = 16;
const FIELD_FONT_SIZE = 13;
const FIELD_NAME_CHAR_W = 0.52;
const FIELD_TYPE_CHAR_W = 0.50;
const FIELD_GAP = 32;
const PK_FK_PREFIX_W = 32;

const VALID_CARDINALITIES: Cardinality[] = ["1", "N", "0..1", "0..N", "1..N"];

// ─── Layout output types ────────────────────────────────────────────

export interface ErdLayout {
  entities: EntityDef[];
  relationships: RelationshipDef[];
  positions: Map<string, Box>;
  edgeRoutes: Map<string, [number, number][]>;
}

// ─── Entity sizing ──────────────────────────────────────────────────

export function entitySize(entity: EntityDef): { width: number; height: number } {
  const headerW = textWidth(entity.label, ENTITY_FONT_SIZE) + ENTITY_PAD_X * 2;

  let maxFieldW = 0;
  for (const field of entity.fields) {
    const nameW = field.name.length * FIELD_FONT_SIZE * FIELD_NAME_CHAR_W;
    const typeW = field.type.length * FIELD_FONT_SIZE * FIELD_TYPE_CHAR_W;
    const prefixW = (field.pk || field.fk) ? PK_FK_PREFIX_W : 0;
    maxFieldW = Math.max(maxFieldW, prefixW + nameW + FIELD_GAP + typeW);
  }

  const width = Math.max(headerW, maxFieldW + ENTITY_PAD_X * 2, ENTITY_MIN_W);
  const height = ENTITY_HEADER_HEIGHT + entity.fields.length * FIELD_ROW_HEIGHT;
  return { width, height };
}

// ─── Layout function ────────────────────────────────────────────────

export async function layoutErd(source: string): Promise<ErdLayout> {
  let def: ErdDefinition;
  try {
    def = JSON.parse(source);
  } catch {
    throw new Error("Failed to parse ERD diagram JSON");
  }

  // Validation
  if (!def.entities || def.entities.length === 0) {
    throw new Error("ERD must have at least one entity");
  }

  const entityIds = new Set<string>();
  for (const entity of def.entities) {
    if (!entity.id || typeof entity.id !== "string") {
      throw new Error(`Invalid entity: missing or non-string "id". Got: ${JSON.stringify(entity)}`);
    }
    if (!entity.label || typeof entity.label !== "string") {
      throw new Error(`Invalid entity "${entity.id}": missing or non-string "label".`);
    }
    if (!entity.fields || entity.fields.length === 0) {
      throw new Error(`Entity "${entity.id}" must have at least one field.`);
    }
    if (entityIds.has(entity.id)) {
      throw new Error(`Duplicate entity ID "${entity.id}".`);
    }
    entityIds.add(entity.id);
  }

  const relationships = def.relationships ?? [];
  for (const rel of relationships) {
    if (!entityIds.has(rel.from)) {
      throw new Error(
        `Relationship references unknown entity "${rel.from}". Available: ${[...entityIds].join(", ")}`,
      );
    }
    if (!entityIds.has(rel.to)) {
      throw new Error(
        `Relationship references unknown entity "${rel.to}". Available: ${[...entityIds].join(", ")}`,
      );
    }
    if (rel.fromCardinality && !VALID_CARDINALITIES.includes(rel.fromCardinality)) {
      throw new Error(
        `Invalid fromCardinality "${rel.fromCardinality}". Valid: ${VALID_CARDINALITIES.join(", ")}`,
      );
    }
    if (rel.toCardinality && !VALID_CARDINALITIES.includes(rel.toCardinality)) {
      throw new Error(
        `Invalid toCardinality "${rel.toCardinality}". Valid: ${VALID_CARDINALITIES.join(", ")}`,
      );
    }
  }

  // Build ELK graph
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = def.entities.map((entity) => {
    const sz = entitySize(entity);
    return { id: entity.id, width: sz.width, height: sz.height };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edges: any[] = relationships.map((rel, i) => ({
    id: `rel-${i}`,
    sources: [rel.from],
    targets: [rel.to],
  }));

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "80",
      "elk.spacing.edgeEdge": "40",
      "elk.spacing.edgeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "30",
      "elk.layered.spacing.edgeNodeBetweenLayers": "40",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children,
    edges,
  };

  let layoutResult: ElkResult;
  try {
    layoutResult = (await elk.layout(elkGraph)) as ElkResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ELK layout failed for ERD: ${msg}`);
  }

  const positions = collectPositions(layoutResult);
  const edgeRoutes = collectEdgeRoutes(layoutResult, positions);

  return {
    entities: def.entities,
    relationships,
    positions,
    edgeRoutes,
  };
}

export {
  ENTITY_HEADER_HEIGHT,
  FIELD_ROW_HEIGHT,
  ENTITY_PAD_X,
  ENTITY_FONT_SIZE,
  FIELD_FONT_SIZE,
  PK_FK_PREFIX_W,
  FIELD_GAP,
};
