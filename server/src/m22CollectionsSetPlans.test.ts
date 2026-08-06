import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { M22Error, M22Store } from "./m22CollectionsSetPlans";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m22-"));
  const file = path.join(root, "store.json");
  return { root, file, store: new M22Store(file) };
}
const track = (sourceId = "track-abc", sourceType = "brmedia-library") => ({ sourceType, sourceId, catalogueRevision: "rev-1", snapshot: { title: `Title ${sourceId}`, artist: "Artist", duration: 180, bpm: 170, key: "1A", artworkAvailable: true } });

test("Collections create, rename, add, deduplicate, reorder, remove and delete references only", () => {
  const { store } = fixture(); let collection = store.createCollection({ name: "Peak Time", description: "Hard finishers" });
  collection = store.updateCollection(collection.id, { revision: collection.revision, name: "Peak Time Anthems" });
  let result = store.addCollectionTracks(collection.id, { revision: collection.revision, tracks: [track(), track(), track("track-def", "mixxx-catalogue")] });
  assert.equal(result.added, 2); assert.equal(result.duplicatesSkipped, 1); collection = result.collection;
  collection = store.reorderCollection(collection.id, { revision: collection.revision, entryIds: collection.entries.map(x=>x.id).reverse() });
  assert.equal(collection.entries[0].track.sourceId, "track-def");
  collection = store.removeCollectionTrack(collection.id, collection.entries[0].id, { revision: collection.revision });
  assert.equal(collection.entries.length, 1);
  assert.deepEqual(store.deleteCollection(collection.id, collection.revision), { deleted: true, audioDeleted: false });
});

test("Collection source identities remain separate and restart recovery is stable", () => {
  const { file, store } = fixture(); let c = store.createCollection({ name: "Sources" });
  c = store.addCollectionTracks(c.id, { revision: c.revision, tracks: [track("42"), track("42", "mixxx-catalogue"), { ...track("guest_1", "guest-track"), unavailable: true }] }).collection;
  assert.equal(c.entries.length, 3); assert.equal(c.entries[2].track.unavailable, true);
  const recovered = new M22Store(file).snapshot(); assert.equal(recovered.collections[0].entries.length, 3);
  assert.equal(JSON.stringify(recovered).includes("H:\\Music"), false);
});

test("Collections duplicate references without copying audio and Set Plans retain DJ metadata", () => {
  const { store } = fixture(); let source=store.createCollection({name:"Warm Up",description:"Doors"});
  source=store.addCollectionTracks(source.id,{revision:source.revision,tracks:[track("A"),track("B")]}).collection;
  const copy=store.duplicateCollection(source.id,{name:"Warm Up copy"});
  assert.notEqual(copy.id,source.id); assert.deepEqual(copy.entries.map(x=>x.track.sourceId),["A","B"]); assert.notEqual(copy.entries[0].id,source.entries[0].id);
  let plan=store.createSetPlan({name:"Saturday",djName:"DJ NJ",scheduledAt:1234});
  assert.equal(plan.djName,"DJ NJ"); plan=store.updateSetPlan(plan.id,{revision:plan.revision,djName:"Rhys"}); assert.equal(plan.djName,"Rhys");
});

test("Set Plan occurrences retain original order while actual order diverges", () => {
  const { store } = fixture(); let p = store.createSetPlan({ name: "Friday mix", venue: "BR HQ" });
  p = store.addSetPlanTracks(p.id, { revision: p.revision, tracks: [track("A"), track("B"), track("C"), track("D")] });
  const [a,b,c] = p.entries;
  p = store.transition(p.id, a.id, { revision: p.revision, status: "playing", source: "BRMedia Native", generation: 2 });
  p = store.transition(p.id, a.id, { revision: p.revision, status: "played", source: "BRMedia Native", generation: 3 });
  p = store.transition(p.id, c.id, { revision: p.revision, status: "played", source: "user", generation: 2 });
  p = store.transition(p.id, b.id, { revision: p.revision, status: "played", source: "user", generation: 2 });
  assert.deepEqual(p.entries.filter(x=>x.locked).sort((x,y)=>(x.actualPlayedPosition||0)-(y.actualPlayedPosition||0)).map(x=>x.track.sourceId), ["A","C","B"]);
  assert.deepEqual(p.entries.slice().sort((x,y)=>x.originalPlannedPosition-y.originalPlannedPosition).map(x=>x.track.sourceId), ["A","B","C","D"]);
  assert.throws(() => store.transition(p.id, a.id, { revision: p.revision, status: "selected" }), (e:any)=>e.code === "OCCURRENCE_LOCKED");
});

test("Add Again makes a distinct selectable occurrence and final snapshot repeats it", () => {
  const { store } = fixture(); let p = store.createSetPlan({ name: "Repeat set" });
  p = store.addSetPlanTracks(p.id, { revision: p.revision, tracks: [track("A")] }); const first = p.entries[0];
  p = store.transition(p.id, first.id, { revision: p.revision, status: "played", source: "user", generation: 2 });
  p = store.addAgain(p.id, first.id, { revision: p.revision }); const second = p.entries[1];
  assert.notEqual(first.id, second.id); assert.equal(second.repeated, true); assert.equal(second.locked, false);
  p = store.transition(p.id, second.id, { revision: p.revision, status: "played", source: "user", generation: 2 });
  p = store.finalise(p.id, { revision: p.revision });
  assert.deepEqual(p.finalTracklist?.entries.map((x:any)=>x.track.sourceId), ["A","A"]);
  assert.equal(p.finalTracklist?.originalPlannedOrder.length, 2);
  assert.throws(() => store.addSetPlanTracks(p.id, { revision: p.revision, tracks: [track("B")] }), /immutable/);
  assert.match(store.export(p.id, "txt") as string, /01\. Artist - Title A\n02\. Artist - Title A/);
  assert.equal((store.export(p.id, "json") as any).entries.length, 2);
});

test("stale clients, duplicate events, played reorder and invalid identities are rejected", () => {
  const { store } = fixture(); let p = store.createSetPlan({ name: "Concurrency" }); const stale = p.revision;
  p = store.addSetPlanTracks(p.id, { revision: p.revision, tracks: [track("A"), track("B")] });
  assert.throws(() => store.updateSetPlan(p.id, { revision: stale, name: "Lost update" }), (e:any)=>e.status === 409);
  p = store.transition(p.id, p.entries[0].id, { revision: p.revision, status: "played", generation: 2 });
  assert.throws(() => store.transition(p.id, p.entries[1].id, { revision: p.revision, status: "playing", generation: 1 }), (e:any)=>e.code === "EVENT_STALE");
  assert.throws(() => store.reorderSetPlan(p.id, { revision: p.revision, entryIds: p.entries.map(x=>x.id) }), /Ordering/);
  assert.throws(() => store.addSetPlanTracks(p.id, { revision: p.revision, tracks: [{ ...track("bad/path") }] }), /opaque/);
});

test("unmatched tracks can be manually associated and corrections are guarded", () => {
  const { store } = fixture(); let p = store.createSetPlan({ name: "Live" }); p = store.addSetPlanTracks(p.id, { revision: p.revision, tracks: [track()] });
  p = store.addUnmatched(p.id, { revision: p.revision, label: "Externally loaded Mixxx track", source: "Mixxx feedback" });
  assert.equal(p.unmatched[0].matchedEntryId, null);
  p = store.matchUnmatched(p.id, p.unmatched[0].id, { revision: p.revision, entryId: p.entries[0].id });
  assert.equal(p.unmatched[0].matchedEntryId, p.entries[0].id);
  p = store.transition(p.id, p.entries[0].id, { revision: p.revision, status: "played", source: "user", generation: 2 });
  p = store.correct(p.id, p.entries[0].id, { revision: p.revision }); assert.equal(p.entries[0].status, "ready"); assert.equal(p.entries[0].locked, false);
});

test("recording linkage requires finalisation and retains an audit", () => {
  const { store } = fixture(); let p = store.createSetPlan({ name: "Archive hook" });
  assert.throws(() => store.linkRecording(p.id, { revision: p.revision, recordingId: "rec_1" }), /Finalise/);
  p = store.finalise(p.id, { revision: p.revision }); p = store.linkRecording(p.id, { revision: p.revision, recordingId: "rec_1" });
  assert.equal(p.recordingId, "rec_1"); assert.equal(p.recordingLinkAudit.length, 1);
  assert.throws(() => store.linkRecording(p.id, { revision: p.revision, recordingId: "rec_2" }), /another recording/);
  p = store.unlinkRecording(p.id, { revision: p.revision }); assert.equal(p.recordingId, null); assert.equal(p.recordingLinkAudit.length, 2);
  p = store.updateSetPlan(p.id, { revision: p.revision, status: "archived" }); assert.equal(p.status, "archived");
  p = store.updateSetPlan(p.id, { revision: p.revision, status: "completed" }); assert.equal(p.status, "completed");
  assert.throws(() => store.updateSetPlan(p.id, { revision: p.revision, name: "Mutated snapshot" }), /immutable/);
});

test("safe Download Original hooks expose opaque routes only", () => {
  const { store }=fixture(); let p=store.createSetPlan({name:"Downloads"}); p=store.addSetPlanTracks(p.id,{revision:p.revision,tracks:[track("lib_1"),track("mixxx:42","mixxx-catalogue"),{...track("guest_1","guest-track"),unavailable:true}]});
  assert.equal(store.downloadUrl(p.id,p.entries[0].id),"/download/lib_1");
  assert.equal(store.downloadUrl(p.id,p.entries[1].id),"/api/dj/mixxx/catalogue/mixxx%3A42/download");
  assert.throws(()=>store.downloadUrl(p.id,p.entries[2].id),(e:any)=>e.code==="SOURCE_UNAVAILABLE");
});

test("unmatched events deduplicate and support ignore, match, or new occurrence audit", () => {
  const { store }=fixture(); let p=store.createSetPlan({name:"Unknowns"}); p=store.addSetPlanTracks(p.id,{revision:p.revision,tracks:[track("A")]});
  p=store.addUnmatched(p.id,{revision:p.revision,label:"Deck unknown",source:"Mixxx feedback",deck:"d1",sessionId:"s1",generation:2}); const rev=p.revision;
  p=store.addUnmatched(p.id,{revision:p.revision,label:"Deck unknown",source:"Mixxx feedback",deck:"d1",sessionId:"s1",generation:2}); assert.equal(p.revision,rev); assert.equal(p.unmatched.length,1);
  p=store.ignoreUnmatched(p.id,p.unmatched[0].id,{revision:p.revision}); assert.equal(p.unmatched[0].ignored,true);
  p=store.addUnmatched(p.id,{revision:p.revision,label:"Another",source:"Mixxx feedback",deck:"d2",sessionId:"s1",generation:3});
  p=store.addUnmatchedOccurrence(p.id,p.unmatched[1].id,{revision:p.revision,track:track("B")}); assert.equal(p.entries.length,2); assert.equal(p.unmatched[1].audit[p.unmatched[1].audit.length-1].action,"new-occurrence");
});

test("store schema failure is explicit and never silently overwrites data", () => {
  const { file } = fixture(); fs.writeFileSync(file, "{broken", "utf8");
  assert.throws(() => new M22Store(file), (e:any)=>e instanceof M22Error && e.code === "STORE_INVALID");
});
