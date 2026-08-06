import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MixxxWorkflowStore } from "./mixxxWorkflow";

test("workflow targets retain stable Mixxx identities without duplicates", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-mixxx-workflow-"));
  const store = new MixxxWorkflowStore(path.join(root, "workflow.json"));
  assert.equal(store.add("mixxx:42", "favourites").added, true);
  assert.equal(store.add("mixxx:42", "favourites").added, false);
  assert.deepEqual(store.snapshot().targets.favourites, ["mixxx:42"]);
  assert.equal(store.add("mixxx:42", "collection", "Warm Up").target, "collection:Warm Up");
});

test("workflow rejects indexes, missing collection names and unknown targets", () => {
  const store = new MixxxWorkflowStore(path.join(os.tmpdir(), `missing-${Date.now()}.json`));
  assert.throws(() => store.add("42", "favourites"));
  assert.throws(() => store.add("mixxx:42", "collection", ""));
  assert.throws(() => store.add("mixxx:42", "other" as any));
});
