export interface ErdDefinition {
  type: "erd";
  entities: EntityDef[];
  relationships: RelationshipDef[];
}

export interface EntityDef {
  id: string;
  label: string;
  fields: FieldDef[];
}

export interface FieldDef {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
}

export type Cardinality = "1" | "N" | "0..1" | "0..N" | "1..N";

export interface RelationshipDef {
  from: string;
  to: string;
  label?: string;
  fromCardinality?: Cardinality;
  toCardinality?: Cardinality;
}
