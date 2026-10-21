import assert from "node:assert/strict";
import test from "node:test";
import { assertHttpUrl } from "../src/lib/tools/web.ts";

test("allows absolute public HTTP(S) URLs and keeps URL normalization", () => {
  assert.equal(assertHttpUrl("https://example.com/a b").href, "https://example.com/a%20b");
  assert.equal(assertHttpUrl("http://8.8.8.8/").hostname, "8.8.8.8");
  assert.equal(assertHttpUrl("https://[2606:4700:4700::1111]/").hostname, "[2606:4700:4700::1111]");
});

test("blocks private, loopback, unspecified, shared, and link-local IPv4 literals", () => {
  for (const host of ["127.0.0.1", "10.2.3.4", "172.16.0.1", "172.31.255.254", "192.168.1.1", "169.254.1.2", "0.0.0.0", "100.64.0.1"]) {
    assert.throws(() => assertHttpUrl(`http://${host}/`), /Local and private network URLs/);
  }
});

test("blocks IPv6 loopback, unspecified, link-local, unique-local, and mapped private literals", () => {
  for (const host of ["[::]", "[::1]", "[fe80::1]", "[febf::1]", "[fc00::1]", "[fdff::1]", "[::ffff:127.0.0.1]", "[::ffff:7f00:1]"]) {
    assert.throws(() => assertHttpUrl(`http://${host}/`), /Local and private network URLs/);
  }
});

test("blocks localhost and local hostname variants", () => {
  for (const host of ["localhost", "LOCALHOST.", "api.localhost", "localhost.localdomain", "dev.local", "printer.local"]) {
    assert.throws(() => assertHttpUrl(`https://${host}/`), /Local and private network URLs/);
  }
});

test("URL parsing normalizes unusual IPv4 spellings before policy checks", () => {
  for (const host of ["2130706433", "0x7f000001", "0177.0.0.1", "127.1"]) {
    assert.throws(() => assertHttpUrl(`http://${host}/`), /Local and private network URLs/);
  }
});

test("rejects malformed and non-HTTP URLs with the established validation error", () => {
  for (const value of ["", "example.com", "http://[::1", "ftp://example.com/", "javascript:alert(1)"]) {
    assert.throws(() => assertHttpUrl(value), /Use an absolute HTTP or HTTPS URL/);
  }
});
