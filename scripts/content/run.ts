import { parseArgs } from "./lib/args";

type Stage = () => Promise<void>;

async function runFetch() {
  const mod = await import("./fetch-sources");
  if ("default" in mod) {
    // no-op: fetch-sources has its own `main` via require.main.
  }
  await import("./fetch-sources");
}

async function runChunk() {
  await import("./clean-and-chunk");
}

async function runGenerate() {
  await import("./generate-lessons");
}

async function runValidate() {
  await import("./validate-lessons");
}

async function runPublish() {
  await import("./publish-lessons");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("pipeline.start", { args });

  const stages: [string, Stage][] = [
    ["fetch", runFetch],
    ["chunk", runChunk],
    ["generate", runGenerate],
    ["validate", runValidate],
    ["publish", runPublish],
  ];

  for (const [name, stage] of stages) {
    console.log(`→ stage: ${name}`);
    try {
      await stage();
    } catch (err) {
      console.error(`stage failed: ${name}`, err);
      if (!args.resume) throw err;
    }
  }

  console.log("pipeline.done");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
