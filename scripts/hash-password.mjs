// Usage: npm run hash-password -- 'your-password'
// Prints an argon2id hash for the ADMIN_PASSWORD_HASH env var.
import argon2 from "argon2";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- '<password>'");
  process.exit(1);
}

const hash = await argon2.hash(password, { type: argon2.argon2id });
console.log(hash);
