import { initDb } from "./db";

export const handler = async () => {
  try {
    console.info("ℹ️ Starting to seed DB");
    await initDb();
    return { status: "SUCCESS" };
  } catch (err) {
    console.error("⚠️ Seeding failed:", err);
    throw err;
  }
};
