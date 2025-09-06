import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function signSession(payload, maxAgeSec = 60 * 60 * 8) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret);
}

export async function verifySession(token) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
