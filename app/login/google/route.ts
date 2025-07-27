import { cookies } from "next/headers";
import {
  GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME,
  GOOGLE_OAUTH_NONCE_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/constants";
import {
  generateCodeVerifier,
  generateNonce,
  generateState,
  google,
} from "@/lib/oauth";
import { globalGETRateLimit } from "@/lib/requests";
import { getCurrentSession } from "@/app/actions";

export async function GET(request: Request): Promise<Response> {
  const { session } = await getCurrentSession();
  if (session !== null) {
    return Response.redirect(new URL("/", request.url));
  }

  if (!(await globalGETRateLimit())) {
    return new Response("Too many requests", { status: 429 });
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const nonce = generateNonce();

  const url = await google.createAuthorizationURL(state, codeVerifier, nonce, [
    "openid",
    "profile",
    "email",
  ]);

  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
  };

  const c = await cookies();
  c.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, state, cookieOptions);
  c.set(GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME, codeVerifier, cookieOptions);
  c.set(GOOGLE_OAUTH_NONCE_COOKIE_NAME, nonce, cookieOptions);

  return Response.redirect(url);
}
