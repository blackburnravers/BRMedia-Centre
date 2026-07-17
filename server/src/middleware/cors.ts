import type { IncomingMessage, ServerResponse } from "node:http";

export function applyCors(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Range");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true; // handled
  }

  return false;
}