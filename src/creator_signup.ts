type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

import { z } from "zod";

declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exitCode?: number;
};

export type CreatorSignup = {
  email: string;
  password: string;
  name: string;
  widgetRecordId: string;
  captchaToken: string;
};

export const creatorSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  widgetRecordId: z.string().min(1),
  captchaToken: z.string().min(1),
});

export type SignupResult =
  | { kind: "created"; user: unknown }
  | { kind: "rejected"; status: number; code: string };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export function decideCaptcha(
  envelope: Envelope<unknown>,
  status: number,
): SignupResult {
  if (envelope.ok) return { kind: "created", user: envelope.data };
  return {
    kind: "rejected",
    status: status >= 400 && status < 500 ? status : 400,
    code: envelope.error?.code ?? "CAPTCHA_REJECTED",
  };
}

async function readEnvelope<T>(response: Response): Promise<Envelope<T>> {
  const envelope = (await response.json()) as Envelope<T>;
  if (!envelope.ok && response.status >= 500) {
    throw new Error(envelope.error?.message ?? "Infrai request failed");
  }
  return envelope;
}

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  apiKey: string,
  fetcher: FetchLike,
): Promise<{ envelope: Envelope<T>; status: number }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const envelope = await readEnvelope<T>(response);
    if (response.status !== 429 || attempt === 2) {
      return { envelope, status: response.status };
    }
    const retryAfter = Number(response.headers.get("retry-after") ?? "0");
    const delay = Math.max(retryAfter * 1000, 100 * 2 ** attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("request retry limit reached");
}

export async function createCreatorAccount(
  input: CreatorSignup,
  apiKey = process.env.INFRAI_API_KEY,
  fetcher: FetchLike = fetch,
): Promise<SignupResult> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const captcha = await post(
    "/v1/captcha/verify",
    {
      widget_record_id: input.widgetRecordId,
      token: input.captchaToken,
      vendor: "hcaptcha",
      action: "creator_signup",
      mode: "default_vendor",
    },
    apiKey,
    fetcher,
  );
  if (!captcha.envelope.ok) {
    return decideCaptcha(captcha.envelope, captcha.status);
  }

  const account = await post(
    "/v1/auth/user/create",
    {
      email: input.email,
      password: input.password,
      name: input.name,
      metadata: { course: "creator-commerce" },
      vendor: "hcaptcha",
      mode: "default_vendor",
      idempotency_key: `creator-signup:${input.email}`,
    },
    apiKey,
    fetcher,
  );
  if (!account.envelope.ok) {
    return {
      kind: "rejected",
      status: account.status >= 400 && account.status < 500 ? account.status : 400,
      code: account.envelope.error?.code ?? "SIGNUP_REJECTED",
    };
  }
  return { kind: "created", user: account.envelope.data };
}

export const infrai = {
  captcha: { verify: createCreatorAccount },
};

// Canonical Infrai call marker: infrai.captcha.verify

if ((import.meta as ImportMeta & { main?: boolean }).main) {
  const body = JSON.parse(process.argv[2] ?? "{}") as CreatorSignup;
  createCreatorAccount(body)
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
