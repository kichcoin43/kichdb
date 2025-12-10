import { pgTable, text, timestamp, boolean, uuid, jsonb, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const machines = pgTable("machines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id"),
  accountId: text("account_id").notNull().default('acc_1974'),
  name: text("name").notNull(),
  created: timestamp("created").defaultNow().notNull(),
  url: text("url"),
  status: text("status").default("active").notNull(),
  anonKey: text("anon_key").notNull(),
  serviceKey: text("service_key").notNull(),
});

export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  columns: jsonb("columns").notNull().$type<Array<{ name: string; type: string; primary?: boolean }>>(),
  rows: jsonb("rows").notNull().$type<Array<Record<string, unknown>>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authUsers = pgTable("auth_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buckets = pgTable("buckets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  public: boolean("public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucketId: uuid("bucket_id").notNull().references(() => buckets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const machinesRelations = relations(machines, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  machine: one(machines, {
    fields: [projects.machineId],
    references: [machines.id],
  }),
  tables: many(tables),
  authUsers: many(authUsers),
  buckets: many(buckets),
}));

export const tablesRelations = relations(tables, ({ one }) => ({
  project: one(projects, {
    fields: [tables.projectId],
    references: [projects.id],
  }),
}));

export const authUsersRelations = relations(authUsers, ({ one }) => ({
  project: one(projects, {
    fields: [authUsers.projectId],
    references: [projects.id],
  }),
}));

export const bucketsRelations = relations(buckets, ({ one, many }) => ({
  project: one(projects, {
    fields: [buckets.projectId],
    references: [projects.id],
  }),
  files: many(files),
}));

export const filesRelations = relations(files, ({ one }) => ({
  bucket: one(buckets, {
    fields: [files.bucketId],
    references: [buckets.id],
  }),
}));

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;
export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = typeof authUsers.$inferInsert;
export type Bucket = typeof buckets.$inferSelect;
export type InsertBucket = typeof buckets.$inferInsert;
export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
