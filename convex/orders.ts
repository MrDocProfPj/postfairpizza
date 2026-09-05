import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const all = query({
  args: {},
  handler: async (ctx) => {
    const [pizzas, extras, people, settings] = await Promise.all([
      ctx.db.query("pizzas").collect(),
      ctx.db.query("extras").collect(),
      ctx.db.query("people").collect(),
      ctx.db.query("settings").first(),
    ]);
    return { pizzas, extras, people, locked: settings?.locked ?? false };
  },
});

async function assertUnlocked(ctx: any) {
  const s = await ctx.db.query("settings").first();
  if (s?.locked) throw new Error("Order is locked");
}

export const addPizza = mutation({
  args: {
    person: v.string(),
    crust: v.string(),
    sauce: v.string(),
    cheese: v.string(),
    toppings: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await assertUnlocked(ctx);
    if (args.toppings.length > 3) throw new Error("Max 3 toppings");
    await ctx.db.insert("pizzas", args);
  },
});

export const removePizza = mutation({
  args: { id: v.id("pizzas") },
  handler: async (ctx, { id }) => {
    await assertUnlocked(ctx);
    await ctx.db.delete(id);
  },
});

export const setExtra = mutation({
  args: { person: v.string(), item: v.string(), qty: v.number() },
  handler: async (ctx, { person, item, qty }) => {
    await assertUnlocked(ctx);
    const existing = await ctx.db
      .query("extras")
      .withIndex("by_person", (q) => q.eq("person", person))
      .filter((q) => q.eq(q.field("item"), item))
      .first();
    if (qty <= 0) {
      if (existing) await ctx.db.delete(existing._id);
      return;
    }
    if (existing) await ctx.db.patch(existing._id, { qty });
    else await ctx.db.insert("extras", { person, item, qty });
  },
});

export const setDone = mutation({
  args: { name: v.string(), done: v.boolean() },
  handler: async (ctx, { name, done }) => {
    const existing = await ctx.db
      .query("people")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existing) await ctx.db.patch(existing._id, { done });
    else await ctx.db.insert("people", { name, done });
  },
});

export const setLocked = mutation({
  args: { locked: v.boolean() },
  handler: async (ctx, { locked }) => {
    const s = await ctx.db.query("settings").first();
    if (s) await ctx.db.patch(s._id, { locked });
    else await ctx.db.insert("settings", { locked });
  },
});

export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["pizzas", "extras", "people", "settings"] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
  },
});
