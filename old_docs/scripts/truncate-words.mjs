import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

async function truncate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  
  await db.execute(sql`TRUNCATE TABLE words`);
  console.log("Words table truncated");
  
  process.exit(0);
}

truncate();
