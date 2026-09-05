import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  pizzas: defineTable({
    person: v.string(),
    crust: v.string(),
    sauce: v.string(),
    cheese: v.string(),
    toppings: v.array(v.string()),
  }).index("by_person", ["person"]),
  extras: defineTable({
    person: v.string(),
    item: v.string(),
    qty: v.number(),
  }).index("by_person", ["person"]),
  people: defineTable({
    name: v.string(),
    done: v.boolean(),
  }).index("by_name", ["name"]),
  settings: defineTable({
    locked: v.boolean(),
  }),
});
