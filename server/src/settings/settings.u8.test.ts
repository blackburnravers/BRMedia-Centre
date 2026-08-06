import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { SettingsStore } from "./store";
import { SettingsService } from "./service";
import { SettingsManagementService, SETTINGS_EXPORT_FORMAT, SETTINGS_IMPORT_MAX_BYTES } from "./settingsManagement";

async function fixture(){const root=await mkdtemp(path.join(os.tmpdir(),"brmedia-u8-"));const store=new SettingsStore({settingsPath:path.join(root,"settings","brmedia-settings.json")});const service=new SettingsService(store);return{root,store,service,management:new SettingsManagementService(service)}}

test("full and module exports are valid, deterministic and read-only",async()=>{const f=await fixture();const before=f.store.read().health.mainExists;const a=f.management.serializeExport(),b=f.management.serializeExport();assert.doesNotThrow(()=>JSON.parse(a));assert.equal(JSON.parse(a).format,SETTINGS_EXPORT_FORMAT);assert.equal(JSON.parse(a).redacted,true);assert.equal(f.management.export("server").includedModules.length,1);assert.equal(a.replace(/exportedAt[^\n]+/,""),b.replace(/exportedAt[^\n]+/,""));assert.equal(f.store.read().health.mainExists,before)});

test("preview rejects malformed, oversized, polluted and newer-schema imports without writing",async()=>{const f=await fixture();assert.equal(f.management.preview("{").valid,false);assert.equal(f.management.preview("x".repeat(SETTINGS_IMPORT_MAX_BYTES+1)).valid,false);assert.equal(f.management.preview('{"format":"brmedia-settings-export","exportFormatVersion":1,"settingsSchemaVersion":1,"includedModules":[],"settings":{"__proto__":{}}}').valid,false);const x=f.management.export();x.settingsSchemaVersion=99;assert.equal(f.management.preview(x).valid,false);assert.equal(f.store.read().health.mainExists,false)});

test("invalid enum is reported and valid import is atomic with a backup",async()=>{const f=await fixture();await f.service.updateModule("universal",{theme:"dark"});const x=f.management.export();(x.settings.universal as Record<string,unknown>).theme="invalid";assert.equal(f.management.preview(x).valid,false);assert.equal(f.service.readModule("universal").data.theme,"dark");(x.settings.universal as Record<string,unknown>).theme="system";const applied=await f.management.apply(x);assert.equal(applied.ok,true);assert.equal(f.service.readModule("universal").data.theme,"system");assert.ok(f.management.listBackups().length>=1);assert.equal(fs.existsSync(f.store.backupPath),true)});

test("selected-module import changes only that module",async()=>{const f=await fixture();const x=f.management.export();(x.settings.server as Record<string,unknown>).port=9999;(x.settings.universal as Record<string,unknown>).theme="dark";await f.management.apply(x,["server"]);assert.equal(f.service.readModule("server").data.port,9999);assert.equal(f.service.readModule("universal").data.theme,"dark")});

test("backup identifiers reject traversal and restore creates a safety backup",async()=>{const f=await fixture();await f.service.updateModule("server",{port:9000});await f.management.reset("server.port");const id=f.management.listBackups()[0].id;assert.throws(()=>f.management.previewBackup("../"+id));await f.management.restore(id);assert.ok(f.management.listBackups().length>=1)});

test("field, module and reset-all preserve unrelated and unknown settings",async()=>{const f=await fixture();await f.store.update(s=>{(s as unknown as Record<string,unknown>).future={kept:true};s.server.port=9999;s.universal.theme="dark";return s});await f.management.reset("server.port");assert.equal(f.service.readModule("server").data.port,8787);assert.equal(f.service.readModule("universal").data.theme,"dark");await f.management.resetAll(true);assert.deepEqual((f.store.read().settings as unknown as Record<string,unknown>).future,{kept:true})});

test("corrupt primary is preserved until explicit recovery",async()=>{const f=await fixture();await f.service.updateModule("server",{port:9000});await writeFile(f.store.settingsPath,"{corrupt","utf8");const before=await readFile(f.store.settingsPath,"utf8");assert.equal(f.management.recoveryStatus().actionRequired,true);assert.equal(await readFile(f.store.settingsPath,"utf8"),before);await f.management.recover("last-known-good");assert.equal(f.store.read().health.state,"healthy");assert.ok(fs.readdirSync(path.dirname(f.store.settingsPath)).some(x=>x.includes(".corrupt-")))});