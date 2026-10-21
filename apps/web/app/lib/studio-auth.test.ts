import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { requirePlaygroundAccess } from "./studio-auth.ts";

const prior = { ...process.env };
afterEach(() => {
  for (const key of ["ALGOPHONY_ENABLE_PLAYGROUND", "ALGOPHONY_STUDIO_ACCESS_MODE", "ALGOPHONY_PLAYGROUND_TOKEN"]) {
    if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
  }
});
const request = (headers: Record<string, string>) => new Request("http://localhost/api/playground/generate", { headers });
test("disabled Playground refuses all callers", () => {
  delete process.env.ALGOPHONY_ENABLE_PLAYGROUND;
  assert.equal(requirePlaygroundAccess(request({ host: "localhost" })).ok, false);
});
test("only an explicit loopback launch may use token-free Playground", () => {
  process.env.ALGOPHONY_ENABLE_PLAYGROUND = "true";
  delete process.env.ALGOPHONY_PLAYGROUND_TOKEN;
  delete process.env.ALGOPHONY_STUDIO_ACCESS_MODE;
  assert.equal(requirePlaygroundAccess(request({ host: "localhost" })).ok, false);
  process.env.ALGOPHONY_STUDIO_ACCESS_MODE = "local";
  assert.equal(requirePlaygroundAccess(request({ host: "localhost:3001", origin: "http://localhost:3001" })).ok, true);
  const rejected: Record<string, string>[] = [{ host: "remote.example", "x-forwarded-host": "localhost" }, { host: "[::1]evil.example" }, { host: "localhost", origin: "https://evil.example" }, { host: "localhost", forwarded: "host=localhost" }];
  for (const headers of rejected) {
    assert.equal(requirePlaygroundAccess(request(headers)).ok, false);
  }
});
test("a configured token is required even when Host says localhost", () => {
  process.env.ALGOPHONY_ENABLE_PLAYGROUND = "true";
  process.env.ALGOPHONY_STUDIO_ACCESS_MODE = "local";
  const token = "a-test-only-playground-token-32-characters";
  process.env.ALGOPHONY_PLAYGROUND_TOKEN = token;
  assert.equal(requirePlaygroundAccess(request({ host: "localhost" })).ok, false);
  assert.equal(requirePlaygroundAccess(request({ host: "remote.example", "x-playground-token": token })).ok, true);
  assert.equal(requirePlaygroundAccess(request({ host: "remote.example", "x-playground-token": "wrong" })).ok, false);
});
