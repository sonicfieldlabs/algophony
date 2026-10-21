import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authorizeWorkspaceRequest, isLoopbackHost } from "./request-policy";
import { proxy } from "@/proxy";
import { getCurrentProfile, getCurrentUser, getUserEntitlements } from "./current-user";

const context = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => context.headers }));
afterEach(() => vi.unstubAllEnvs());
const local = { ALGOPHONY_STUDIO_ACCESS_MODE: "local" };
const token = "a-test-only-workspace-token-32-characters";
const remote = { ALGOPHONY_STUDIO_ACCESS_MODE: "remote", ALGOPHONY_STUDIO_ACCESS_TOKEN: token, ALGOPHONY_STUDIO_ORIGIN: "https://studio.example" };

describe("workspace request access", () => {
  it.each(["127.0.0.1:3001", "localhost:3001", "[::1]:3001"])("allows a configured local CLI request at %s", (host) => {
    expect(authorizeWorkspaceRequest(new Headers({ host }), local)).toEqual({ allowed: true });
  });
  it.each(["[::1]evil.example", "localhost,evil.example", "localhost.evil.example", "user@localhost", "localhost:0", "127.1", "2130706433", "localhost:99999", "sub.localhost", "localhost/"])("rejects deceptive host %s", (host) => {
    expect(isLoopbackHost(host)).toBe(false);
  });
  it("rejects spoofed forwarding, missing hosts and browser origins", () => {
    for (const value of [{}, { host: "remote.example", "x-forwarded-host": "localhost" }, { host: "localhost", "x-forwarded-host": "remote.example" }, { host: "localhost", forwarded: "host=localhost" }, { host: "localhost", origin: "https://evil.example" }, { host: "localhost", origin: "null" }]) {
      expect(authorizeWorkspaceRequest(new Headers(value as Record<string, string>), local).allowed).toBe(false);
    }
    expect(authorizeWorkspaceRequest(new Headers({ host: "localhost:3001", origin: "http://localhost:3001" }), local).allowed).toBe(true);
  });
  it("does not infer a trusted session when access mode is absent", () => {
    expect(authorizeWorkspaceRequest(new Headers({ host: "localhost" }), {}).allowed).toBe(false);
  });
  it("requires the configured token and origin even when a remote caller spoofs localhost", () => {
    expect(authorizeWorkspaceRequest(new Headers({ host: "localhost" }), remote).allowed).toBe(false);
    expect(authorizeWorkspaceRequest(new Headers({ host: "studio.example" }), remote).allowed).toBe(false);
    expect(authorizeWorkspaceRequest(new Headers({ host: "studio.example", authorization: `Bearer ${token}` }), remote).allowed).toBe(true);
    expect(authorizeWorkspaceRequest(new Headers({ host: "studio.example", authorization: `Bearer ${token}`, origin: "https://evil.example" }), remote).allowed).toBe(false);
    expect(authorizeWorkspaceRequest(new Headers({ host: "studio.example", authorization: `Bearer ${token}` }), { ...remote, ALGOPHONY_STUDIO_ACCESS_TOKEN: "short" }).allowed).toBe(false);
  });
  it.each(["/dashboard", "/api/local/settings", "/api/elevenlabs/generate-sfx", "/api/supervisor/chat", "/api/projects"])("guards %s before route execution", (path) => {
    vi.stubEnv("ALGOPHONY_STUDIO_ACCESS_MODE", "local");
    const response = proxy(new NextRequest(`http://remote.example${path}`, { headers: { host: "remote.example", "x-forwarded-host": "localhost" } }));
    expect(response.status).toBe(403);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
  it("profile helpers independently reject a bypass of the proxy", async () => {
    vi.stubEnv("ALGOPHONY_STUDIO_ACCESS_MODE", "local");
    context.headers = new Headers({ host: "remote.example", "x-forwarded-host": "localhost" });
    await expect(getCurrentProfile()).rejects.toMatchObject({ name: "AuthError", status: 403 });
    await expect(getCurrentUser()).rejects.toMatchObject({ name: "AuthError", status: 403 });
    context.headers = new Headers({ host: "localhost:3001" });
    await expect(getCurrentProfile()).resolves.toMatchObject({ id: "local-workspace" });
    await expect(getUserEntitlements("unknown-workspace")).rejects.toMatchObject({ status: 403 });
  });
});
