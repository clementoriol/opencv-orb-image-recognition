import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, "./references-source");
const OUT_DIR = path.join(__dirname, "./../public/references");
const JSON_OUT = path.join(__dirname, "./../src/references/references.json");

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.(jpe?g|png|bmp|webp)$/i.test(f));

  const index = [];

  for (const file of files) {
    const inputPath = path.join(SRC_DIR, file);
    const outputPath = path.join(OUT_DIR, file);

    await sharp(inputPath).resize({ width: 600 }).toFile(outputPath);

    index.push({
      name: file,
      url: `./references/${file}`, // relative to public directory
    });
  }

  fs.writeFileSync(JSON_OUT, JSON.stringify(index, null, 2), "utf8");

  console.log(`✅ Processed ${files.length} images`);
  console.log(`→ Resized images in ${OUT_DIR}`);
  console.log(`→ Index written to ${JSON_OUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
