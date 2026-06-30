#!/usr/bin/env node
import { GROUPS } from "./test-personas.mjs";
const ids = [];
for (const list of Object.values(GROUPS)) {
  for (const p of list) ids.push(p.id);
}
ids.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
console.log(JSON.stringify(ids));
