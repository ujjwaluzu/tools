import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import {
  assertHashFileSize, expectedDigestLength, hashFile, hashText, isDigestCurrent,
  isVerificationCurrent, MAX_HASH_FILE_BYTES, normalizeExpectedChecksum, verifyChecksum,
  type DigestRecord, type HashAlgorithm, type VerificationRecord,
} from "../src/lib/tools/hash.ts";

const vectors: Record<HashAlgorithm, { empty: string; abc: string }> = {
  "SHA-256": {
    empty: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    abc: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  },
  "SHA-384": {
    empty: "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b",
    abc: "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
  },
  "SHA-512": {
    empty: "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    abc: "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
  },
};

test("matches independent empty-input and abc digest vectors for all algorithms", async () => {
  for (const algorithm of ["SHA-256", "SHA-384", "SHA-512"] as const) {
    assert.equal(await hashText("", algorithm, webcrypto.subtle), vectors[algorithm].empty);
    assert.equal(await hashText("abc", algorithm, webcrypto.subtle), vectors[algorithm].abc);
  }
});

test("hashes a small deterministic file fixture", async () => {
  const fixture = new File(["abc"], "fixture.txt", { type: "text/plain" });
  assert.equal(await hashFile(fixture, "SHA-256", webcrypto.subtle), vectors["SHA-256"].abc);
});

test("enforces the file limit before reading file data", async () => {
  assert.equal(MAX_HASH_FILE_BYTES, 25 * 1024 * 1024);
  assert.doesNotThrow(() => assertHashFileSize(MAX_HASH_FILE_BYTES));
  let read = false;
  const oversized = { name: "large.bin", size: MAX_HASH_FILE_BYTES + 1, arrayBuffer: async () => { read = true; throw new Error("must not read"); } };
  await assert.rejects(hashFile(oversized, "SHA-256", webcrypto.subtle), /25 MiB/);
  assert.equal(read, false);
});

test("surfaces file read, unavailable Web Crypto, and digest failures", async () => {
  const unreadable = { name: "bad.bin", size: 3, arrayBuffer: async () => { throw new Error("local read issue"); } };
  await assert.rejects(hashFile(unreadable, "SHA-256", webcrypto.subtle), /could not be read/);
  await assert.rejects(hashText("abc", "SHA-256", null), /Web Crypto is unavailable/);
  const failedCrypto = { digest: async () => { throw new Error("operation failed"); } } as unknown as SubtleCrypto;
  await assert.rejects(hashText("abc", "SHA-256", failedCrypto), /operation failed/);
});

test("normalizes checksum case and whitespace and verifies match or mismatch", () => {
  const expected = vectors["SHA-256"].abc;
  assert.equal(normalizeExpectedChecksum(`  ${expected.toUpperCase()} \n`, "SHA-256"), expected);
  assert.equal(verifyChecksum(expected, ` ${expected.toUpperCase()} `, "SHA-256"), true);
  assert.equal(verifyChecksum(expected, `${expected.slice(0, -1)}0`, "SHA-256"), false);
});

test("validates empty, non-hex, and algorithm-specific checksum lengths", () => {
  assert.deepEqual([expectedDigestLength("SHA-256"), expectedDigestLength("SHA-384"), expectedDigestLength("SHA-512")], [64, 96, 128]);
  assert.throws(() => normalizeExpectedChecksum("  ", "SHA-256"), /Enter an expected checksum/);
  assert.throws(() => normalizeExpectedChecksum("g".repeat(64), "SHA-256"), /hexadecimal/);
  assert.throws(() => normalizeExpectedChecksum("a".repeat(63), "SHA-256"), /exactly 64/);
  assert.throws(() => normalizeExpectedChecksum("a".repeat(64), "SHA-384"), /exactly 96/);
});

test("marks digests stale when algorithm, source, or file/text revision changes", () => {
  const record: DigestRecord = { algorithm: "SHA-256", source: "file", sourceId: 4, sourceLabel: "sample.bin", value: vectors["SHA-256"].abc };
  assert.equal(isDigestCurrent(record, "SHA-256", "file", 4), true);
  assert.equal(isDigestCurrent(record, "SHA-384", "file", 4), false);
  assert.equal(isDigestCurrent(record, "SHA-256", "file", 5), false);
  assert.equal(isDigestCurrent(record, "SHA-256", "text", 4), false);
  assert.equal(isDigestCurrent(null, "SHA-256", "file", 4), false);
  const textRecord: DigestRecord = { ...record, source: "text", sourceId: 2 };
  assert.equal(isDigestCurrent(textRecord, "SHA-256", "text", 2), true);
  assert.equal(isDigestCurrent(textRecord, "SHA-256", "text", 3), false);
});

test("invalidates verification when checksum, algorithm, file, or digest changes", () => {
  const verification: VerificationRecord = { algorithm: "SHA-256", sourceId: 4, expectedInput: vectors["SHA-256"].abc, calculated: vectors["SHA-256"].abc, matches: true };
  assert.equal(isVerificationCurrent(verification, "SHA-256", 4, vectors["SHA-256"].abc, vectors["SHA-256"].abc), true);
  assert.equal(isVerificationCurrent(verification, "SHA-384", 4, vectors["SHA-256"].abc, vectors["SHA-256"].abc), false);
  assert.equal(isVerificationCurrent(verification, "SHA-256", 5, vectors["SHA-256"].abc, vectors["SHA-256"].abc), false);
  assert.equal(isVerificationCurrent(verification, "SHA-256", 4, vectors["SHA-256"].abc.toUpperCase(), vectors["SHA-256"].abc), false);
  assert.equal(isVerificationCurrent(verification, "SHA-256", 4, vectors["SHA-256"].abc, "different digest"), false);
  assert.equal(isVerificationCurrent(null, "SHA-256", 4, "", ""), false);
});
