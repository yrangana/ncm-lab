import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, decode, diffWords, mentions, sample, splitLevels } from "../site/stories/stories-core.js";

// ids 2..257 are single bytes, as in tinystories/vocab.json
const bytes = [[60], [60], ...Array.from({ length: 256 }, (_, b) => [b]), [0x68, 0x69]];
const id = (s) => [...new TextEncoder().encode(s)].map((b) => b + 2);

test("levels add up to the graph output", () => {
  assert.equal(LEVELS.reduce((a, b) => a + b, 0), 641);
  const parts = splitLevels([...Array(641).keys()]);
  assert.deepEqual(parts.map((p) => p.length), LEVELS);
  assert.equal(parts[11][127], 640);
});

test("decode joins bytes, skips pad, stops at eos", () => {
  assert.equal(decode([...id("\nOnce "), 1, 258, 0, ...id("never")], bytes), "Once hi");
  assert.equal(decode(id("café"), bytes), "café");
});

test("sample follows the distribution", () => {
  assert.equal(sample([1, 0, 3], 0), 0);
  assert.equal(sample([1, 0, 3], 0.3), 2);
  assert.equal(sample([1, 0, 3], 0.999), 2);
});

test("diffWords marks only new words", () => {
  const out = diffWords("the cat saw the dog", "the dog");
  assert.deepEqual(out.filter((p) => p.fresh).map((p) => p.w), ["cat", "saw", "the"]);
  assert.equal(out.map((p) => p.w).join(""), "the cat saw the dog");
});

test("mentions matches whole words and plurals", () => {
  assert.ok(mentions("The Dog ran.", "dog"));
  assert.ok(mentions("two dogs", "dog"));
  assert.ok(!mentions("a hotdog stand", "dog"));
  assert.ok(!mentions("dogma", "dog"));
});
