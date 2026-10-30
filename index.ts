import readline from "node:readline/promises";
import { styleText } from "node:util";
import { banner } from "ascii.rest/terminal";
import { arrayContains, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { bands } from "./drizzle/schema";

const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const db = drizzle({ client });
const prompt = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Title
process.stdout.write("\n\n\n");
await banner("Noise Against Hate", {
  color: ["#B266FF", "#36C1F7"],
  shadow: "single",
  effect: "glint",
  tagline: "A CLI to find the next band to listen to.",
});
process.stdout.write("\n");

// Prompt
const input = await prompt.question("Enter a tag, or tags comma separated: ");

prompt.close();

if (input === "exit") process.exit();

const tag = String(input ?? "")
  .toLowerCase()
  .split(",")
  .map(s => s.trim());

process.stdout.write("Searching...\n\n");

try {
  // Query
  const [band] = await db
    .select({
      name: bands.name,
      bandcamp: bands.bandcamp,
      tags: bands.genres,
    })
    .from(bands)
    .where(arrayContains(bands.tags, [...tag]))
    .orderBy(sql`random()`)
    .limit(1);

  // Results
  if (!band) {
    process.stdout.write(styleText(["red"], `Brutal. No bands were found with "${tag}".\n`));
    process.exitCode = 1;
  } else {
    process.stdout.write(
      [
        styleText(["yellow"], "-".repeat(band.name.length)),
        styleText(["yellow"], band.name),
        styleText(["yellow"], "-".repeat(band.name.length)),
        styleText(["blue", "bold"], `https://${band.bandcamp}.bandcamp.com`),
        styleText(["magenta"], band.tags.join(" / ")),
        "",
        "",
      ].join("\n"),
    );
  }
} catch (e) {
  throw new Error(`Something happened: ${e}`);
} finally {
  await client.end();
  process.exit();
}
