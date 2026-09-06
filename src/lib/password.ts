import argon2 from "argon2";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error(
      "ADMIN_PASSWORD_HASH is not set — generate one with: npm run hash-password -- '<password>'"
    );
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
