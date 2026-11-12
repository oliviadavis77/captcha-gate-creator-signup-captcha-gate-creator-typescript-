import { decideCaptcha } from "../src/creator_signup.ts";

const result = decideCaptcha(
  { ok: false, error: { code: "CAPTCHA_SCORE_TOO_LOW" } },
  422,
);

if (result.kind !== "rejected" || result.status !== 422) {
  throw new Error("a low captcha score must reject creator signup with HTTP 422");
}

console.log("captcha decision test passed");
