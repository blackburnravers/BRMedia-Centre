import fs from "node:fs";
import path from "node:path";

export type MixxxWorkflowTarget = "favourites" | "preparation" | "set-plan" | "collection";
type WorkflowState = { version: 1; updatedAt: string | null; targets: Record<string, string[]> };

export class MixxxWorkflowStore {
  constructor(readonly filePath = path.resolve(__dirname, "..", "..", "data", "mixxx-workflow.json")) {}

  private read(): WorkflowState {
    try {
      const value = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      return { version: 1, updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
        targets: value.targets && typeof value.targets === "object" ? value.targets : {} };
    } catch { return { version: 1, updatedAt: null, targets: {} }; }
  }

  add(identity: string, target: MixxxWorkflowTarget, collectionName = "") {
    if (!/^mixxx:\d+$/.test(identity)) throw new Error("Invalid stable Mixxx identity");
    if (!["favourites", "preparation", "set-plan", "collection"].includes(target)) throw new Error("Invalid workflow target");
    const name = target === "collection" ? String(collectionName || "").normalize("NFKC").trim().slice(0, 80) : target;
    if (!name) throw new Error("Collection name is required");
    const key = target === "collection" ? `collection:${name}` : target;
    const state = this.read();
    const identities = Array.isArray(state.targets[key]) ? state.targets[key].filter((value) => /^mixxx:\d+$/.test(value)) : [];
    const added = !identities.includes(identity);
    if (added) identities.push(identity);
    state.targets[key] = identities; state.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(temporary, this.filePath);
    return { target: key, identity, added, count: identities.length, updatedAt: state.updatedAt };
  }

  snapshot() { return this.read(); }
}
