import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SKILL_DIR = path.resolve(import.meta.dirname, "..");
const SAMPLES_DIR = path.join(SKILL_DIR, "samples");

const samples: { name: string; graph: object }[] = [
  {
    name: "01-minimal",
    graph: {
      direction: "DOWN",
      nodes: [
        { id: "a", label: "Client" },
        { id: "b", label: "Server" },
      ],
      edges: [{ from: "a", to: "b", label: "request" }],
    },
  },
  {
    name: "02-linear-chain",
    graph: {
      direction: "DOWN",
      nodes: [
        { id: "input", label: "Input" },
        { id: "validate", label: "Validate" },
        { id: "process", label: "Process" },
        { id: "store", label: "Store" },
        { id: "respond", label: "Respond" },
      ],
      edges: [
        { from: "input", to: "validate" },
        { from: "validate", to: "process" },
        { from: "process", to: "store" },
        { from: "store", to: "respond" },
      ],
    },
  },
  {
    name: "03-fan-out",
    graph: {
      direction: "DOWN",
      nodes: [
        { id: "lb", label: "Load Balancer" },
        { id: "s1", label: "Worker 1" },
        { id: "s2", label: "Worker 2" },
        { id: "s3", label: "Worker 3" },
        { id: "s4", label: "Worker 4" },
      ],
      edges: [
        { from: "lb", to: "s1" },
        { from: "lb", to: "s2" },
        { from: "lb", to: "s3" },
        { from: "lb", to: "s4" },
      ],
    },
  },
  {
    name: "04-single-group",
    graph: {
      direction: "DOWN",
      groups: [{ id: "backend", label: "Backend", children: ["api", "db", "cache"] }],
      nodes: [
        { id: "client", label: "Client" },
        { id: "api", label: "API" },
        { id: "db", label: "Database" },
        { id: "cache", label: "Cache" },
      ],
      edges: [
        { from: "client", to: "api", label: "HTTP" },
        { from: "api", to: "db", label: "query" },
        { from: "api", to: "cache", label: "get/set" },
      ],
    },
  },
  {
    name: "05-two-groups-cross-edges",
    graph: {
      direction: "DOWN",
      groups: [
        { id: "frontend", label: "Frontend", children: ["ui", "state", "router"] },
        { id: "backend", label: "Backend", children: ["api", "auth", "db"] },
      ],
      nodes: [
        { id: "ui", label: "React UI" },
        { id: "state", label: "Redux" },
        { id: "router", label: "Router" },
        { id: "api", label: "REST API" },
        { id: "auth", label: "Auth" },
        { id: "db", label: "Postgres" },
      ],
      edges: [
        { from: "ui", to: "state" },
        { from: "router", to: "ui" },
        { from: "state", to: "api", label: "fetch" },
        { from: "api", to: "auth" },
        { from: "api", to: "db", label: "SQL" },
      ],
    },
  },
  {
    name: "06-long-labels",
    graph: {
      direction: "DOWN",
      nodes: [
        { id: "a", label: "Authentication Service" },
        { id: "b", label: "User Management Module" },
        { id: "c", label: "Notification Handler" },
        { id: "d", label: "Payment Processing Engine" },
      ],
      edges: [
        { from: "a", to: "b", label: "validates credentials" },
        { from: "b", to: "c", label: "triggers notification" },
        { from: "b", to: "d", label: "initiates payment" },
      ],
    },
  },
  {
    name: "07-descriptions",
    graph: {
      direction: "DOWN",
      nodes: [
        { id: "gw", label: "API Gateway", description: "Rate limiting, auth, routing" },
        { id: "users", label: "Users Service", description: "CRUD operations for user accounts" },
        { id: "orders", label: "Orders Service", description: "Order lifecycle management" },
        { id: "notify", label: "Notifications", description: "Email, SMS, push notifications" },
      ],
      edges: [
        { from: "gw", to: "users" },
        { from: "gw", to: "orders" },
        { from: "orders", to: "notify", label: "events" },
      ],
    },
  },
  {
    name: "08-right-direction",
    graph: {
      direction: "RIGHT",
      nodes: [
        { id: "src", label: "Source" },
        { id: "parse", label: "Parse" },
        { id: "transform", label: "Transform" },
        { id: "optimize", label: "Optimize" },
        { id: "codegen", label: "Codegen" },
        { id: "output", label: "Output" },
      ],
      edges: [
        { from: "src", to: "parse" },
        { from: "parse", to: "transform" },
        { from: "transform", to: "optimize" },
        { from: "optimize", to: "codegen" },
        { from: "codegen", to: "output" },
      ],
    },
  },
  {
    name: "09-complex",
    graph: {
      direction: "DOWN",
      groups: [
        { id: "ingestion", label: "Ingestion", children: ["kafka", "validator", "parser"] },
        { id: "processing", label: "Processing", children: ["spark", "flink", "ml"] },
        { id: "storage", label: "Storage", children: ["s3", "redshift", "elastic", "redis"] },
      ],
      nodes: [
        { id: "kafka", label: "Kafka" },
        { id: "validator", label: "Validator" },
        { id: "parser", label: "Parser" },
        { id: "spark", label: "Spark" },
        { id: "flink", label: "Flink" },
        { id: "ml", label: "ML Pipeline" },
        { id: "s3", label: "S3" },
        { id: "redshift", label: "Redshift" },
        { id: "elastic", label: "Elasticsearch" },
        { id: "redis", label: "Redis" },
      ],
      edges: [
        { from: "kafka", to: "validator" },
        { from: "validator", to: "parser" },
        { from: "parser", to: "spark" },
        { from: "parser", to: "flink" },
        { from: "spark", to: "ml", label: "features" },
        { from: "spark", to: "s3" },
        { from: "flink", to: "elastic" },
        { from: "flink", to: "redis", label: "cache" },
        { from: "ml", to: "redshift" },
        { from: "ml", to: "s3" },
        { from: "s3", to: "redshift" },
        { from: "redis", to: "elastic" },
      ],
    },
  },
  {
    name: "10-deep-chain-with-group",
    graph: {
      direction: "DOWN",
      groups: [{ id: "core", label: "Core Pipeline", children: ["step3", "step4", "step5"] }],
      nodes: [
        { id: "step1", label: "Ingest" },
        { id: "step2", label: "Validate" },
        { id: "step3", label: "Enrich" },
        { id: "step4", label: "Transform" },
        { id: "step5", label: "Aggregate" },
        { id: "step6", label: "Publish" },
        { id: "step7", label: "Archive" },
      ],
      edges: [
        { from: "step1", to: "step2" },
        { from: "step2", to: "step3" },
        { from: "step3", to: "step4" },
        { from: "step4", to: "step5" },
        { from: "step5", to: "step6" },
        { from: "step6", to: "step7" },
      ],
    },
  },
];

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  if (fs.existsSync(SAMPLES_DIR)) {
    fs.rmSync(SAMPLES_DIR, { recursive: true });
  }
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });

  for (const sample of samples) {
    const sampleDir = path.join(SAMPLES_DIR, sample.name);
    const diagramPath = path.join(sampleDir, "diagram.json");

    fs.mkdirSync(sampleDir, { recursive: true });
    fs.writeFileSync(diagramPath, JSON.stringify(sample.graph, null, 2));

    console.log(`Building ${sample.name}...`);
    const result = spawnSync(
      "npx",
      ["tsx", path.join(SKILL_DIR, "scripts", "build-static.ts"), "--output", sampleDir, "--diagram", diagramPath],
      { cwd: SKILL_DIR, stdio: "inherit" },
    );

    if (result.status !== 0) {
      console.error(`Failed to build ${sample.name}`);
    }
  }

  console.log(`\nAll samples built in: ${SAMPLES_DIR}/`);
  console.log("Open any sample's index.html in a browser to review.");
}

main();
