export const HASH_ALGORITHMS = ["SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];
export const MAX_HASH_FILE_BYTES = 25 * 1024 * 1024;
export type DigestCrypto = { digest(algorithm: HashAlgorithm, data: BufferSource): Promise<ArrayBuffer> };

export type DigestRecord = {
  algorithm: HashAlgorithm;
  source: "text" | "file";
  sourceId: number;
  sourceLabel: string;
  value: string;
};

export type VerificationRecord = {
  algorithm: HashAlgorithm;
  sourceId: number;
  expectedInput: string;
  calculated: string;
  matches: boolean;
};

export async function digestHex(bytes: BufferSource, algorithm: HashAlgorithm, subtle?: DigestCrypto | null): Promise<string> {
  const cryptoSubtle = getSubtle(subtle);
  const result = await cryptoSubtle.digest(algorithm, bytes);
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hashText(text: string, algorithm: HashAlgorithm, subtle?: DigestCrypto | null): Promise<string> {
  return digestHex(new TextEncoder().encode(text), algorithm, subtle);
}

export async function hashFile(
  file: Pick<File, "name" | "size" | "arrayBuffer">,
  algorithm: HashAlgorithm,
  subtle?: DigestCrypto | null,
): Promise<string> {
  assertHashFileSize(file.size);
  getSubtle(subtle);
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error("The selected file could not be read. Choose it again and retry.");
  }
  if (buffer.byteLength !== file.size) throw new Error("The selected file could not be read completely. Choose it again and retry.");
  return digestHex(buffer, algorithm, subtle);
}

export function assertHashFileSize(size: number): void {
  if (!Number.isFinite(size) || size < 0) throw new Error("The selected file size could not be determined.");
  if (size > MAX_HASH_FILE_BYTES) throw new Error("Files must be 25 MiB or smaller. Choose a smaller file to limit browser memory use.");
}

export function expectedDigestLength(algorithm: HashAlgorithm): number {
  return algorithm === "SHA-256" ? 64 : algorithm === "SHA-384" ? 96 : 128;
}

export function normalizeExpectedChecksum(value: string, algorithm: HashAlgorithm): string {
  const checksum = value.trim();
  if (!checksum) throw new Error("Enter an expected checksum to verify.");
  if (!/^[\da-f]+$/i.test(checksum)) throw new Error("Checksums must contain hexadecimal characters only (0–9 and A–F).");
  const requiredLength = expectedDigestLength(algorithm);
  if (checksum.length !== requiredLength) throw new Error(`${algorithm} checksums must contain exactly ${requiredLength} hexadecimal characters.`);
  return checksum.toLowerCase();
}

export function verifyChecksum(calculated: string, expected: string, algorithm: HashAlgorithm): boolean {
  return calculated.toLowerCase() === normalizeExpectedChecksum(expected, algorithm);
}

export function isDigestCurrent(
  result: DigestRecord | null,
  algorithm: HashAlgorithm,
  source: "text" | "file",
  sourceId: number,
): result is DigestRecord {
  return Boolean(result && result.algorithm === algorithm && result.source === source && result.sourceId === sourceId);
}

export function isVerificationCurrent(
  verification: VerificationRecord | null,
  algorithm: HashAlgorithm,
  sourceId: number,
  expectedInput: string,
  calculated: string,
): verification is VerificationRecord {
  return Boolean(verification
    && verification.algorithm === algorithm
    && verification.sourceId === sourceId
    && verification.expectedInput === expectedInput
    && verification.calculated === calculated);
}

function getSubtle(subtle?: DigestCrypto | null): DigestCrypto {
  const available = subtle === undefined ? globalThis.crypto?.subtle : subtle;
  if (!available) throw new Error("Web Crypto is unavailable in this browser. Use a current browser in a secure context.");
  return available;
}
