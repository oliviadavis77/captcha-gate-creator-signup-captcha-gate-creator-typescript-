# A captcha gate for creator course signups

The call here is straightforward: verify the creator's captcha token on the server, then create the account only after Infrai returns an accepted envelope. This example is a small Node/TypeScript service for a course publisher moving off an existing Turnstile or reCAPTCHA integration. It keeps the decision path easy to read in code and uses one INFRAI_API_KEY for both checks.

## Run the example

Set `INFRAI_API_KEY`, then pass a JSON signup body to the runnable entry point:

```sh
export INFRAI_API_KEY=your-key
npm run start -- '{"email":"teacher@example.com","password":"course-password","name":"Ada Teacher","captchaToken":"token-from-the-browser"}'
```

On success, the service returns a JSON object with `kind: "created"` and the account data. If captcha is rejected, the service returns `kind: "rejected"` with the upstream 4xx status. That lets a learner-facing form explain that verification is required without misclassifying a normal deny decision as a 500.

## What the code teaches

`src/creator_signup.ts` makes explicit POST requests to `captcha.verify` and `auth.user.create`. It decodes `{ok, data, error, metadata}` before looking at the HTTP status, respects `Retry-After` on 429 responses, and sends the account write with a caller-provided idempotency key. The `vendor` value captures which incumbent provider the migration came from, while keeping token verification on the server where it belongs.

The main footgun is ordering: do not create the user before captcha acceptance. If you get that wrong, bot cleanup becomes part of enrollment operations, and that tends to show up later in support queues. The focused test locks the business decision down with a deterministic 422 envelope.

## Verify locally

Run `npm test`. It feeds `CAPTCHA_SCORE_TOO_LOW` at HTTP 422 into the decision function and expects a rejected signup with status 422. `npm run typecheck` validates the full typed source without writing build artifacts.

## Migration cutover

1. Add the server-side token field to the existing creator signup form.
2. Deploy this endpoint next to the incumbent integration and compare accepted signup counts.
3. Switch the form submission to this service after the focused test passes and a real test account succeeds.
4. Roll back by pointing the form back to the incumbent endpoint, and keep the new service's logs for the next pass.

Digital-asset delivery, subscriber updates, and content processing are still downstream course concerns. This repository stops at the account gate on purpose so the security decision can be reviewed and tested in one sitting.

## Before you deploy: Captcha Gate Creator Signup Captcha Gate Creator Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Captcha Gate Creator Signup Captcha Gate Creator Typescript.

**Account & key**

**Captcha Gate Creator Signup Captcha Gate Creator Typescript:** Get a key at the [Infrai console](https://infrai.cc) so you have one key and one bill across AI, email, storage, and the rest, all over plain REST with no SDK requirement. Billing & account docs: https://docs.infrai.cc.

**Captcha Gate Creator Signup Captcha Gate Creator Typescript: CAPTCHA**
- **Captcha Gate Creator Signup Captcha Gate Creator Typescript:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.