# Security & Encoding Tools

## Current Hash Generator

The existing Hash Generator supports text and local file inputs using SHA-256, SHA-384, and SHA-512. File hashing is limited to 25 MiB. Browser Web Crypto hashes a complete file buffer and does not stream, so larger files are rejected to limit memory use. Inputs are processed in the browser and are not uploaded or stored by the tool.

File mode can compare the calculated digest with a pasted expected hexadecimal checksum. Input whitespace is trimmed, letter case is ignored, and the value must have the exact length for the chosen algorithm. A match means only that the calculated digest equals the supplied value; it does not prove the file is safe, identify who supplied the checksum, or authenticate the file. It is not a signature verification mechanism.

- Password generator
- Random string generator
- UUID generator
- Hash generator
- SHA-256
- SHA-512
- MD5
- HMAC generator
- JWT decoder
- Base64 encoder/decoder
- URL encoder/decoder

Be precise: encoding ≠ encryption, hashing ≠ encryption, decoding ≠ decryption. JWT decoding alone does not verify a token signature. Prefer local processing for sensitive values.
