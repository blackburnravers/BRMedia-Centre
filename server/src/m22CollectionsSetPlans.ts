import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "./utils/json";
import { updateDjRecordingM22Link } from "./djRecording";

export const M22_SCHEMA_VERSION = 1;
const MAX_BODY = 256 * 1024;
const MAX_ITEMS = 5000;
const SOURCES = new Set(["brmedia-library", "mixxx-catalogue", "guest-track", "future-import"]);
const STATUSES = new Set(["ready", "selected", "loaded", "playing", "played", "skipped", "unavailable"]);

export type TrackReference = {
  sourceType: "brmedia-library" | "mixxx-catalogue" | "guest-track" | "future-import";
  sourceId: string;
  catalogueRevision: string | null;
  snapshot: { title: string; artist: string; duration: number | null; bpm: number | null; key: string | null; artworkAvailable: boolean };
  unavailable: boolean;
  addedAt: number;
};

export type CollectionEntry = { id: string; track: TrackReference; addedAt: number };
export type Collection = { id: string; name: string; description: string; artwork: string | null; archived: boolean; entries: CollectionEntry[]; revision: number; createdAt: number; updatedAt: number };
export type SetPlanEntry = {
  id: string; setPlanId: string; track: TrackReference; plannedPosition: number; originalPlannedPosition: number;
  actualPlayedPosition: number | null; status: string; repeated: boolean; plannedNotes: string; liveNotes: string;
  addedAt: number; selectedAt: number | null; loadedAt: number | null; playStartedAt: number | null; completedAt: number | null;
  statusSource: string; generation: number; locked: boolean;
};
export type FinalTracklist = { id: string; setPlanId: string; revision: number; completedAt: number; totalDuration: number | null; entries: any[]; unmatched: any[]; originalPlannedOrder: any[] };
export type SetPlan = {
  id: string; name: string; event: string; venue: string; djName: string; scheduledAt: number | null; notes: string;
  status: "draft" | "ready" | "live" | "completed" | "archived"; createdAt: number; updatedAt: number;
  plannedDuration: number | null; actualDuration: number | null; recordingId: string | null; recordingLinkAudit: any[];
  revision: number; entries: SetPlanEntry[]; unmatched: any[]; finalTracklist: FinalTracklist | null;
};
type State = { schemaVersion: number; revision: number; collections: Collection[]; setPlans: SetPlan[] };

export class M22Error extends Error { constructor(message: string, readonly status = 400, readonly code = "M22_INVALID") { super(message); } }
const clean = (v: unknown, max = 160) => String(v ?? "").normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const finite = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : null;
function reference(value: any): TrackReference {
  if (!SOURCES.has(value?.sourceType)) throw new M22Error("Unsupported track source", 400, "TRACK_SOURCE_INVALID");
  const sourceId = clean(value.sourceId, 180);
  if (!sourceId || /[\\/]/.test(sourceId)) throw new M22Error("Invalid opaque track identity", 400, "TRACK_ID_INVALID");
  return { sourceType: value.sourceType, sourceId, catalogueRevision: clean(value.catalogueRevision, 80) || null,
    snapshot: { title: clean(value.snapshot?.title || "Untitled track"), artist: clean(value.snapshot?.artist || "Unknown artist"),
      duration: finite(value.snapshot?.duration), bpm: finite(value.snapshot?.bpm), key: clean(value.snapshot?.key, 32) || null,
      artworkAvailable: value.snapshot?.artworkAvailable === true }, unavailable: value.unavailable === true, addedAt: Date.now() };
}
function expected(body: any, current: number) {
  if (!Number.isSafeInteger(body?.revision) || body.revision !== current) throw new M22Error("State changed on another device", 409, "REVISION_CONFLICT");
}

export class M22Store {
  private state: State;
  constructor(readonly filePath = path.resolve("server/data/m22-collections-setplans.json")) { this.state = this.load(); }
  private load(): State {
    if (!fs.existsSync(this.filePath)) return { schemaVersion: M22_SCHEMA_VERSION, revision: 0, collections: [], setPlans: [] };
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      if (parsed.schemaVersion !== M22_SCHEMA_VERSION || !Array.isArray(parsed.collections) || !Array.isArray(parsed.setPlans)) throw new Error();
      return parsed;
    } catch { throw new M22Error("M22 store is unreadable or uses an unsupported schema", 503, "STORE_INVALID"); }
  }
  private save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(this.state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporary, this.filePath);
  }
  private changed(item?: { revision: number; updatedAt: number }) { this.state.revision++; if (item) { item.revision++; item.updatedAt = Date.now(); } this.save(); }
  snapshot() { return structuredClone(this.state); }
  createCollection(body: any) {
    const name = clean(body?.name); if (!name) throw new M22Error("Collection name is required");
    const now = Date.now(); const item: Collection = { id: id("col"), name, description: clean(body.description, 1000), artwork: clean(body.artwork, 300) || null, archived: false, entries: [], revision: 1, createdAt: now, updatedAt: now };
    this.state.collections.push(item); this.changed(); return structuredClone(item);
  }
  updateCollection(collectionId: string, body: any) {
    const item = this.collection(collectionId); expected(body, item.revision);
    if (body.name !== undefined) { const name = clean(body.name); if (!name) throw new M22Error("Collection name is required"); item.name = name; }
    if (body.description !== undefined) item.description = clean(body.description, 1000);
    if (body.artwork !== undefined) item.artwork = clean(body.artwork, 300) || null;
    if (body.archived !== undefined) item.archived = body.archived === true;
    this.changed(item); return structuredClone(item);
  }
  deleteCollection(collectionId: string, revision: number) { const item = this.collection(collectionId); expected({ revision }, item.revision); this.state.collections = this.state.collections.filter(x => x.id !== collectionId); this.changed(); return { deleted: true, audioDeleted: false }; }
  duplicateCollection(collectionId: string, body: any) { const source=this.collection(collectionId); const copy=this.createCollection({name:clean(body?.name)||`${source.name} copy`,description:source.description,artwork:source.artwork}); const target=this.collection(copy.id); target.entries=source.entries.map(e=>({...structuredClone(e),id:id("centry"),addedAt:Date.now()})); this.changed(target); return structuredClone(target); }
  addCollectionTracks(collectionId: string, body: any) {
    const item = this.collection(collectionId); expected(body, item.revision); const refs = (Array.isArray(body.tracks) ? body.tracks : []).map(reference);
    if (!refs.length || item.entries.length + refs.length > MAX_ITEMS) throw new M22Error("Track list is empty or too large");
    const existing = new Set(item.entries.map(x => `${x.track.sourceType}:${x.track.sourceId}`)); let added = 0;
    for (const track of refs) { const key = `${track.sourceType}:${track.sourceId}`; if (existing.has(key)) continue; existing.add(key); item.entries.push({ id: id("centry"), track, addedAt: Date.now() }); added++; }
    this.changed(item); return { collection: structuredClone(item), added, duplicatesSkipped: refs.length - added };
  }
  removeCollectionTrack(collectionId: string, entryId: string, body: any) { const item = this.collection(collectionId); expected(body, item.revision); const before = item.entries.length; item.entries = item.entries.filter(x => x.id !== entryId); if (before === item.entries.length) throw new M22Error("Collection entry not found", 404); this.changed(item); return structuredClone(item); }
  reorderCollection(collectionId: string, body: any) { const item = this.collection(collectionId); expected(body, item.revision); item.entries = reorder(item.entries, body.entryIds); this.changed(item); return structuredClone(item); }
  createSetPlan(body: any) {
    const name = clean(body?.name); if (!name) throw new M22Error("Set Plan name is required"); const now = Date.now();
    const plan: SetPlan = { id: id("set"), name, event: clean(body.event), venue: clean(body.venue), djName: clean(body.djName), scheduledAt: finite(body.scheduledAt), notes: clean(body.notes, 4000), status: "draft", createdAt: now, updatedAt: now, plannedDuration: null, actualDuration: null, recordingId: null, recordingLinkAudit: [], revision: 1, entries: [], unmatched: [], finalTracklist: null };
    this.state.setPlans.push(plan); this.changed(); return structuredClone(plan);
  }
  updateSetPlan(planId: string, body: any) { const p = this.plan(planId); expected(body, p.revision); if (p.finalTracklist) { const keys = Object.keys(body).filter(key => key !== "revision"); if (keys.length !== 1 || !["archived","completed"].includes(body.status)) throw new M22Error("Finalised Set Plan is immutable", 409, "SET_FINALISED"); p.status = body.status; this.changed(p); return structuredClone(p); } for (const field of ["name","event","venue","djName","notes"] as const) if (body[field] !== undefined) (p as any)[field] = clean(body[field], field === "notes" ? 4000 : 160); if (body.scheduledAt !== undefined) p.scheduledAt=finite(body.scheduledAt); if (body.status && ["draft","ready","live","archived"].includes(body.status)) p.status = body.status; this.changed(p); return structuredClone(p); }
  deleteSetPlan(planId: string, revision: number) { const p = this.plan(planId); expected({ revision }, p.revision); if (p.status === "live") throw new M22Error("Close the live Set Plan before deleting it", 409); this.state.setPlans = this.state.setPlans.filter(x => x.id !== planId); this.changed(); return { deleted: true }; }
  duplicateSetPlan(planId: string, body: any) { const source = this.plan(planId); const copy = this.createSetPlan({ name: clean(body?.name) || `${source.name} copy`, event: source.event, venue: source.venue, djName: source.djName, scheduledAt: source.scheduledAt, notes: source.notes }); const target = this.plan(copy.id); target.entries = source.entries.map((e, i) => ({ ...structuredClone(e), id: id("entry"), setPlanId: target.id, plannedPosition: i + 1, originalPlannedPosition: i + 1, actualPlayedPosition: null, status: "ready", repeated: false, selectedAt: null, loadedAt: null, playStartedAt: null, completedAt: null, locked: false, generation: 1 })); this.changed(target); return structuredClone(target); }
  addSetPlanTracks(planId: string, body: any) { const p = this.mutablePlan(planId, body); const refs = (Array.isArray(body.tracks) ? body.tracks : []).map(reference); if (!refs.length || p.entries.length + refs.length > MAX_ITEMS) throw new M22Error("Track list is empty or too large"); for (const track of refs) { const position = p.entries.length + 1; p.entries.push({ id: id("entry"), setPlanId: p.id, track, plannedPosition: position, originalPlannedPosition: position, actualPlayedPosition: null, status: track.unavailable ? "unavailable" : "ready", repeated: false, plannedNotes: "", liveNotes: "", addedAt: Date.now(), selectedAt: null, loadedAt: null, playStartedAt: null, completedAt: null, statusSource: "user", generation: 1, locked: false }); } this.recalculate(p); this.changed(p); return structuredClone(p); }
  removeSetPlanEntry(planId: string, entryId: string, body: any) { const p = this.mutablePlan(planId, body); const e = p.entries.find(x => x.id === entryId); if (!e) throw new M22Error("Occurrence not found", 404); if (e.locked) throw new M22Error("Played occurrence is locked", 409, "OCCURRENCE_LOCKED"); p.entries = p.entries.filter(x => x.id !== entryId); p.entries.filter(x => !x.locked).forEach((x,i)=>x.plannedPosition=i+1); this.recalculate(p); this.changed(p); return structuredClone(p); }
  updateSetPlanEntry(planId:string, entryId:string, body:any) { const p=this.mutablePlan(planId,body); const e=p.entries.find(x=>x.id===entryId); if(!e) throw new M22Error("Occurrence not found",404); if(body.plannedNotes!==undefined)e.plannedNotes=clean(body.plannedNotes,1000); if(body.liveNotes!==undefined)e.liveNotes=clean(body.liveNotes,1000); this.changed(p); return structuredClone(p); }
  duplicateOccurrence(planId:string, entryId:string, body:any) { const p=this.mutablePlan(planId,body); const e=p.entries.find(x=>x.id===entryId); if(!e) throw new M22Error("Occurrence not found",404); const position=p.entries.length+1; p.entries.push({...structuredClone(e),id:id("entry"),plannedPosition:position,originalPlannedPosition:position,actualPlayedPosition:null,status:"ready",repeated:true,addedAt:Date.now(),selectedAt:null,loadedAt:null,playStartedAt:null,completedAt:null,statusSource:"user-duplicate",generation:1,locked:false}); this.recalculate(p); this.changed(p); return structuredClone(p); }
  reorderSetPlan(planId: string, body: any) { const p = this.mutablePlan(planId, body); const played = p.entries.filter(e => e.locked); const remaining = p.entries.filter(e => !e.locked); const ordered = reorder(remaining, body.entryIds); p.entries = [...played, ...ordered]; ordered.forEach((e, i) => e.plannedPosition = i + 1); this.changed(p); return structuredClone(p); }
  transition(planId: string, entryId: string, body: any) {
    const p = this.mutablePlan(planId, body); const e = p.entries.find(x => x.id === entryId); if (!e) throw new M22Error("Set Plan occurrence not found", 404);
    const status = clean(body.status, 30); if (!STATUSES.has(status)) throw new M22Error("Invalid occurrence status"); if (e.locked) throw new M22Error("Played occurrence is locked", 409, "OCCURRENCE_LOCKED");
    if (Number.isSafeInteger(body.generation) && body.generation <= e.generation) throw new M22Error("Duplicate or stale playback event", 409, "EVENT_STALE");
    const now = Date.now(); e.status = status; e.statusSource = clean(body.source, 40) || "user"; e.generation = Number.isSafeInteger(body.generation) ? body.generation : e.generation + 1;
    if (status === "selected") e.selectedAt = now; if (status === "loaded") e.loadedAt = now; if (status === "playing") e.playStartedAt ||= now;
    if (status === "played") { e.actualPlayedPosition = Math.max(0, ...p.entries.map(x => x.actualPlayedPosition || 0)) + 1; e.completedAt = now; e.locked = true; }
    this.changed(p); return structuredClone(p);
  }
  correct(planId: string, entryId: string, body: any) { const p = this.plan(planId); expected(body, p.revision); if (p.finalTracklist) throw new M22Error("Finalised Set Plan is immutable", 409); const e = p.entries.find(x => x.id === entryId); if (!e) throw new M22Error("Occurrence not found", 404); e.status = "ready"; e.actualPlayedPosition = null; e.completedAt = null; e.locked = false; e.statusSource = "user-correction"; e.generation++; const played = p.entries.filter(x => x.locked).sort((a,b)=>(a.actualPlayedPosition||0)-(b.actualPlayedPosition||0)); played.forEach((x,i)=>x.actualPlayedPosition=i+1); this.changed(p); return structuredClone(p); }
  addAgain(planId: string, entryId: string, body: any) { const p = this.mutablePlan(planId, body); const source = p.entries.find(x => x.id === entryId); if (!source) throw new M22Error("Occurrence not found", 404); const position = p.entries.filter(x => !x.locked).length + 1; p.entries.push({ ...structuredClone(source), id: id("entry"), plannedPosition: position, originalPlannedPosition: p.entries.length + 1, actualPlayedPosition: null, status: "ready", repeated: true, addedAt: Date.now(), selectedAt: null, loadedAt: null, playStartedAt: null, completedAt: null, statusSource: "user", generation: 1, locked: false }); this.changed(p); return structuredClone(p); }
  addUnmatched(planId: string, body: any) { const p = this.mutablePlan(planId, body); const key = `${clean(body.source,40)}:${clean(body.deck,12)}:${clean(body.sessionId,80)}:${clean(body.generation,30)}`; const duplicate = p.unmatched.find(x => x.eventKey === key && !x.ignored && !x.matchedEntryId); if (duplicate) return structuredClone(p); const record = { id: id("unmatched"), eventKey: key, label: clean(body.label) || "Unmatched Live Track", source: clean(body.source, 40) || "Mixxx feedback", deck: clean(body.deck, 12) || null, sessionId: clean(body.sessionId,80)||null, generation: finite(body.generation), observedAt: Date.now(), matchedEntryId: null, ignored: false, audit: [{ action:"observed", at:Date.now(), source:clean(body.source,40)||"playback" }] }; p.unmatched.push(record); this.changed(p); return structuredClone(p); }
  matchUnmatched(planId: string, unmatchedId: string, body: any) { const p = this.mutablePlan(planId, body); const u = p.unmatched.find(x => x.id === unmatchedId); const e = p.entries.find(x => x.id === body.entryId && !x.locked); if (!u || !e) throw new M22Error("Unmatched record or selectable occurrence not found", 404); u.matchedEntryId = e.id; u.audit.push({ action:"matched", entryId:e.id, at:Date.now(), source:clean(body.source,40)||"user" }); if (body.markPlayed === true) { e.status="played"; e.actualPlayedPosition=Math.max(0,...p.entries.map(x=>x.actualPlayedPosition||0))+1; e.completedAt=Date.now(); e.playStartedAt ||= u.observedAt; e.locked=true; e.statusSource="user-unmatched-association"; e.generation++; } this.changed(p); return structuredClone(p); }
  ignoreUnmatched(planId: string, unmatchedId: string, body: any) { const p=this.mutablePlan(planId,body); const u=p.unmatched.find(x=>x.id===unmatchedId); if(!u) throw new M22Error("Unmatched record not found",404); u.ignored=true; u.audit.push({action:"ignored",at:Date.now(),source:"user"}); this.changed(p); return structuredClone(p); }
  addUnmatchedOccurrence(planId:string, unmatchedId:string, body:any) { const p=this.mutablePlan(planId,body); const u=p.unmatched.find(x=>x.id===unmatchedId); if(!u) throw new M22Error("Unmatched record not found",404); const track=reference(body.track); const position=p.entries.length+1; const entry:SetPlanEntry={id:id("entry"),setPlanId:p.id,track,plannedPosition:position,originalPlannedPosition:position,actualPlayedPosition:null,status:"ready",repeated:false,plannedNotes:"",liveNotes:"",addedAt:Date.now(),selectedAt:null,loadedAt:null,playStartedAt:null,completedAt:null,statusSource:"user-unmatched-add",generation:1,locked:false}; p.entries.push(entry); u.matchedEntryId=entry.id; u.audit.push({action:"new-occurrence",entryId:entry.id,at:Date.now(),source:"user"}); this.recalculate(p); this.changed(p); return structuredClone(p); }
  finalise(planId: string, body: any) { const p = this.mutablePlan(planId, body); const played = p.entries.filter(e => e.locked).sort((a,b)=>(a.actualPlayedPosition||0)-(b.actualPlayedPosition||0)); const now = Date.now(); p.finalTracklist = { id: id("tracklist"), setPlanId: p.id, revision: 1, completedAt: now, totalDuration: played.reduce((n,e)=>n+(e.track.snapshot.duration||0),0) || null, entries: played.map(e => ({ position: e.actualPlayedPosition, occurrenceId: e.id, track: structuredClone(e.track), playStartedAt: e.playStartedAt, completedAt: e.completedAt, notes: e.liveNotes })), unmatched: structuredClone(p.unmatched), originalPlannedOrder: p.entries.slice().sort((a,b)=>a.originalPlannedPosition-b.originalPlannedPosition).map(e=>({ occurrenceId:e.id, position:e.originalPlannedPosition, track:structuredClone(e.track) })) }; p.status = "completed"; p.actualDuration = p.finalTracklist.totalDuration; this.changed(p); return structuredClone(p); }
  linkRecording(planId: string, body: any) { const p = this.plan(planId); expected(body, p.revision); if (!p.finalTracklist) throw new M22Error("Finalise the Set Plan before linking a recording", 409); const recordingId = clean(body.recordingId, 180); if (!recordingId) throw new M22Error("Recording identity is required"); if (p.recordingId && p.recordingId !== recordingId) throw new M22Error("Set Plan is already linked to another recording", 409); p.recordingId = recordingId; p.recordingLinkAudit.push({ recordingId, linkedAt: Date.now(), source: "user" }); this.changed(p); return structuredClone(p); }
  unlinkRecording(planId:string, body:any) { const p=this.plan(planId); expected(body,p.revision); if(!p.recordingId) return structuredClone(p); p.recordingLinkAudit.push({recordingId:p.recordingId,detachedAt:Date.now(),source:"user"}); p.recordingId=null; this.changed(p); return structuredClone(p); }
  recordingLinkPayload(planId:string, body:any) { const p=this.plan(planId); expected(body,p.revision); if(!p.finalTracklist) throw new M22Error("Finalise the Set Plan before linking a recording",409); return { recordingId:p.recordingId, link:{setPlanId:p.id,finalTracklistId:p.finalTracklist.id,completionTimestamp:p.finalTracklist.completedAt,tracks:structuredClone(p.finalTracklist.entries),unmatched:structuredClone(p.finalTracklist.unmatched)} }; }
  downloadUrl(planId:string, entryId:string) { const p=this.plan(planId); const live=p.entries.find(x=>x.id===entryId); const final=(p.finalTracklist?.entries||[]).find((x:any)=>x.occurrenceId===entryId); const track=live?.track||final?.track; if(!track||track.unavailable) throw new M22Error("Original source is unavailable",404,"SOURCE_UNAVAILABLE"); if(track.sourceType==="brmedia-library") return `/download/${encodeURIComponent(track.sourceId)}`; if(track.sourceType==="mixxx-catalogue") return `/api/dj/mixxx/catalogue/${encodeURIComponent(track.sourceId)}/download`; throw new M22Error("Original download is unavailable for this source type",409,"DOWNLOAD_UNSUPPORTED"); }
  export(planId: string, format: string) { const p = this.plan(planId); if (!p.finalTracklist) throw new M22Error("Set Plan has no final tracklist", 409); if (format === "txt") return p.finalTracklist.entries.map((e:any)=>`${String(e.position).padStart(2,"0")}. ${e.track.snapshot.artist} - ${e.track.snapshot.title}`).join("\n") + "\n"; if (format === "json") return structuredClone(p.finalTracklist); throw new M22Error("Unsupported export format"); }
  private collection(value: string) { const item = this.state.collections.find(x => x.id === value); if (!item) throw new M22Error("Collection not found", 404); return item; }
  private plan(value: string) { const item = this.state.setPlans.find(x => x.id === value); if (!item) throw new M22Error("Set Plan not found", 404); return item; }
  private mutablePlan(value: string, body: any) { const p = this.plan(value); expected(body, p.revision); if (p.finalTracklist) throw new M22Error("Finalised Set Plan is immutable", 409, "SET_FINALISED"); return p; }
  private recalculate(p: SetPlan) { p.plannedDuration = p.entries.reduce((n,e)=>n+(e.track.snapshot.duration||0),0) || null; }
}

function reorder<T extends { id: string }>(items: T[], raw: any): T[] { if (!Array.isArray(raw) || raw.length !== items.length || new Set(raw).size !== items.length) throw new M22Error("Ordering must contain every entry exactly once"); const map = new Map(items.map(x=>[x.id,x])); const result = raw.map((x:any)=>map.get(String(x))); if (result.some(x=>!x)) throw new M22Error("Ordering contains an unknown entry"); return result as T[]; }
async function body(req: IncomingMessage) { const chunks: Buffer[] = []; let length = 0; for await (const chunk of req) { const b = Buffer.from(chunk); length += b.length; if (length > MAX_BODY) throw new M22Error("Request body is too large", 413); chunks.push(b); } try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { throw new M22Error("Invalid JSON body"); } }

export function createM22RouteHandler(store = new M22Store(), recordingLink = updateDjRecordingM22Link) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL) => {
    if (!url.pathname.startsWith("/api/dj/m22")) return false;
    try {
      const parts = url.pathname.split("/").filter(Boolean).slice(3); const method = req.method || "GET";
      if (method === "GET" && !parts.length) return json(res, 200, store.snapshot());
      const b = method === "GET" ? {} : await body(req);
      if (method === "POST" && parts[0] === "collections" && parts.length === 1) return json(res, 201, store.createCollection(b));
      if (parts[0] === "collections" && parts[1]) {
        if (method === "PATCH" && parts.length === 2) return json(res, 200, store.updateCollection(parts[1], b));
        if (method === "DELETE" && parts.length === 2) return json(res, 200, store.deleteCollection(parts[1], Number(b.revision)));
        if (method === "POST" && parts[2] === "duplicate") return json(res, 201, store.duplicateCollection(parts[1], b));
        if (method === "POST" && parts[2] === "entries") return json(res, 200, store.addCollectionTracks(parts[1], b));
        if (method === "DELETE" && parts[2] === "entries" && parts[3]) return json(res, 200, store.removeCollectionTrack(parts[1], parts[3], b));
        if (method === "POST" && parts[2] === "reorder") return json(res, 200, store.reorderCollection(parts[1], b));
      }
      if (method === "POST" && parts[0] === "set-plans" && parts.length === 1) return json(res, 201, store.createSetPlan(b));
      if (parts[0] === "set-plans" && parts[1]) {
        const pid = parts[1]; if (method === "PATCH" && parts.length === 2) return json(res, 200, store.updateSetPlan(pid, b));
        if (method === "DELETE" && parts.length === 2) return json(res, 200, store.deleteSetPlan(pid, Number(b.revision)));
        if (method === "POST" && parts[2] === "duplicate") return json(res, 201, store.duplicateSetPlan(pid, b));
        if (method === "POST" && parts[2] === "entries" && parts.length === 3) return json(res, 200, store.addSetPlanTracks(pid, b));
        if (method === "POST" && parts[2] === "reorder") return json(res, 200, store.reorderSetPlan(pid, b));
        if (method === "POST" && parts[2] === "entries" && parts[3] && parts[4] === "status") return json(res, 200, store.transition(pid, parts[3], b));
        if (method === "PATCH" && parts[2] === "entries" && parts[3] && parts.length === 4) return json(res, 200, store.updateSetPlanEntry(pid, parts[3], b));
        if (method === "POST" && parts[2] === "entries" && parts[3] && parts[4] === "duplicate") return json(res, 201, store.duplicateOccurrence(pid, parts[3], b));
        if (method === "DELETE" && parts[2] === "entries" && parts[3] && parts.length === 4) return json(res, 200, store.removeSetPlanEntry(pid, parts[3], b));
        if (method === "POST" && parts[2] === "entries" && parts[3] && parts[4] === "correct") return json(res, 200, store.correct(pid, parts[3], b));
        if (method === "POST" && parts[2] === "entries" && parts[3] && parts[4] === "add-again") return json(res, 201, store.addAgain(pid, parts[3], b));
        if (method === "POST" && parts[2] === "unmatched" && parts.length === 3) return json(res, 201, store.addUnmatched(pid, b));
        if (method === "POST" && parts[2] === "unmatched" && parts[3] && parts[4] === "match") return json(res, 200, store.matchUnmatched(pid, parts[3], b));
        if (method === "POST" && parts[2] === "unmatched" && parts[3] && parts[4] === "ignore") return json(res, 200, store.ignoreUnmatched(pid, parts[3], b));
        if (method === "POST" && parts[2] === "unmatched" && parts[3] && parts[4] === "add-occurrence") return json(res, 201, store.addUnmatchedOccurrence(pid, parts[3], b));
        if (method === "POST" && parts[2] === "finalise") return json(res, 200, store.finalise(pid, b));
        if (method === "POST" && parts[2] === "recording-link") { const payload=store.recordingLinkPayload(pid,b), recordingId=clean(b.recordingId,180); if(!recordingId) throw new M22Error("Recording identity is required"); recordingLink(recordingId,payload.link); try { return json(res,200,store.linkRecording(pid,b)); } catch(error) { try { recordingLink(recordingId,null); } catch {} throw error; } }
        if (method === "DELETE" && parts[2] === "recording-link") { const payload=store.recordingLinkPayload(pid,b); if(!payload.recordingId) return json(res,200,store.unlinkRecording(pid,b)); recordingLink(payload.recordingId,null); try { return json(res,200,store.unlinkRecording(pid,b)); } catch(error) { try { recordingLink(payload.recordingId,payload.link); } catch {} throw error; } }
        if (method === "GET" && parts[2] === "entries" && parts[3] && parts[4] === "download") { res.statusCode=302; res.setHeader("Location",store.downloadUrl(pid,parts[3])); res.end(); return true; }
        if (method === "GET" && parts[2] === "export") { const format = url.searchParams.get("format") || "json"; const out = store.export(pid, format); if (format === "txt") { res.statusCode=200; res.setHeader("Content-Type","text/plain; charset=utf-8"); res.end(out as string); return true; } return json(res,200,out); }
      }
      return json(res, 404, { error: "M22 route not found", code: "M22_NOT_FOUND" });
    } catch (error) { const e = error instanceof M22Error ? error : new M22Error("M22 request failed", 500, "M22_INTERNAL"); return json(res, e.status, { error: e.message, code: e.code, state: e.status === 409 ? store.snapshot() : undefined }); }
  };
}
