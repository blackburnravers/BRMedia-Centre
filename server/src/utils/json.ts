import type { ServerResponse } from "node:http";

export function json(res: ServerResponse, status: number, body: unknown): boolean {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
  return true;
}