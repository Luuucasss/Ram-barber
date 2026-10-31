import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { seedIfEmpty } from "../src/lib/seed";

async function main() {
  await connectDB();
  const result = await seedIfEmpty();
  console.log(result.alreadyInitialized ? "La base ya tenía datos." : `Creado: ${result.created.join(", ")}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
