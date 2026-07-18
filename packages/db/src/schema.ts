import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const exampleJobs = sqliteTable("example_jobs", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  status: text("status", {
    enum: ["queued", "processing", "completed", "failed"],
  })
    .notNull()
    .default("queued"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
