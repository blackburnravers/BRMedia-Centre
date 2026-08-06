import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { updateM22ArchiveLink } from "./m22ArchiveLink";

test("archive link is bidirectional, idempotent and writes final TXT/JSON sidecars", () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"brmedia-m22-archive-")), archive=path.join(root,"archive"), manifest=path.join(root,"rec_1.json");
  fs.mkdirSync(archive); fs.writeFileSync(manifest,JSON.stringify({id:"rec_1",setPlan:{},sidecarFiles:[]}));
  const link={setPlanId:"set_1",finalTracklistId:"tracklist_1",completionTimestamp:123,tracks:[{position:1,occurrenceId:"entry_1",track:{snapshot:{artist:"Artist",title:"Track"}}},{position:2,occurrenceId:"entry_2",track:{snapshot:{artist:"Artist",title:"Track"}}}],unmatched:[{id:"unmatched_1"}]};
  assert.equal(updateM22ArchiveLink({recordingId:"rec_1",manifestPath:manifest,archiveDirectory:archive},link).changed,true);
  assert.equal(updateM22ArchiveLink({recordingId:"rec_1",manifestPath:manifest,archiveDirectory:archive},link).changed,false);
  const json=JSON.parse(fs.readFileSync(path.join(archive,"set-plan.json"),"utf8"));
  assert.equal(json.setPlanId,"set_1"); assert.equal(json.tracks.length,2); assert.equal(json.unmatched.length,1);
  assert.match(fs.readFileSync(path.join(archive,"tracklist.txt"),"utf8"),/01\. Artist - Track\n02\. Artist - Track/);
  assert.equal(JSON.parse(fs.readFileSync(manifest,"utf8")).setPlan.setPlanId,"set_1");
  assert.equal(updateM22ArchiveLink({recordingId:"rec_1",manifestPath:manifest,archiveDirectory:archive},null).changed,true);
  assert.equal(updateM22ArchiveLink({recordingId:"rec_1",manifestPath:manifest,archiveDirectory:archive},null).changed,false);
  assert.deepEqual(JSON.parse(fs.readFileSync(manifest,"utf8")).setPlan,{}); assert.equal(fs.existsSync(path.join(archive,"set-plan.json")),false);
});

test("archive link rejects unrelated recording and conflicting Set Plan without mutation", () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"brmedia-m22-archive-")), archive=path.join(root,"archive"), manifest=path.join(root,"rec.json"); fs.mkdirSync(archive);
  fs.writeFileSync(manifest,JSON.stringify({id:"rec_1",setPlan:{setPlanId:"set_existing"},sidecarFiles:[]})); const before=fs.readFileSync(manifest,"utf8");
  assert.throws(()=>updateM22ArchiveLink({recordingId:"wrong",manifestPath:manifest,archiveDirectory:archive},{setPlanId:"set_2",finalTracklistId:"f",completionTimestamp:1,tracks:[],unmatched:[]}),/identity mismatch/);
  assert.throws(()=>updateM22ArchiveLink({recordingId:"rec_1",manifestPath:manifest,archiveDirectory:archive},{setPlanId:"set_2",finalTracklistId:"f",completionTimestamp:1,tracks:[],unmatched:[]}),/another Set Plan/);
  assert.equal(fs.readFileSync(manifest,"utf8"),before);
});
