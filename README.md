# heleket-sdk

![GitHub top language](https://img.shields.io/github/languages/top/tsforge/heleket-sdk)
![GitHub Repo stars](https://img.shields.io/github/stars/tsforge/heleket-sdk)

![npm version](https://img.shields.io/npm/v/%40tsforge7%2Fheleket-sdk)
![GitHub Tag](https://img.shields.io/github/v/tag/tsforge/heleket-sdk)

![Build Status](https://img.shields.io/github/actions/workflow/status/tsforge/heleket-sdk/.github/workflows/ci.yml)
![License](https://img.shields.io/npm/l/%40tsforge7%2Fheleket-sdk)
![NPM Last Update](https://img.shields.io/npm/last-update/%40tsforge7%2Fheleket-sdk)

![Downloads per week](https://img.shields.io/npm/dw/%40tsforge7%2Fheleket-sdk?label=downloads%2Fweek)
![Downloads per month](https://img.shields.io/npm/dm/%40tsforge7%2Fheleket-sdk?label=downloads%2Fmonth)
![Downloads per year](https://img.shields.io/npm/dy/%40tsforge7%2Fheleket-sdk?label=downloads%2Fyear)
![Total downloads](https://img.shields.io/npm/dt/%40tsforge7%2Fheleket-sdk?label=total%20downloads)

![Known Vulnerabilities](https://snyk.io/test/github/tsforge/heleket-sdk/badge.svg)
![Coverage Status](https://img.shields.io/codecov/c/github/tsforge/heleket-sdk)

Type-safe Node.js / TypeScript SDK for the [Heleket](https://heleket.com) crypto payment API.

> **BETA — not production-ready yet.** This SDK is functional and 35/35 tests pass against a mock transport, but it has not been validated end-to-end against the real Heleket API at scale. The public API may still change before `1.0.0`. Pin an exact version in `package.json`, expect breaking changes between minors, and please report issues on GitHub.

Wire-compatible 1:1 with the official [`heleket/php-sdk`](https://github.com/Heleket/php-sdk) (same `https://api.heleket.com/v1` host, same MD5 signature, same headers, same `{state, result}` envelope) — and **dramatically more capable** on every other axis. See the [side-by-side comparison](#vs-heleketphp-sdk).

---

## Table of contents

- [Why this SDK](#why-this-sdk)
- [vs `heleket/php-sdk`](#vs-heleketphp-sdk)
- [Install](#install)
- [Get your credentials](#get-your-credentials)
- [Quick start](#quick-start)
- [Recipe: accept your first payment end-to-end](#recipe-accept-your-first-payment-end-to-end)
- [Payment & payout status reference](#payment--payout-status-reference)
- [Webhook payload reference](#webhook-payload-reference)
- [Idempotency & dedup](#idempotency--dedup)
- [Error handling cookbook](#error-handling-cookbook)
- [The `HeleketClient`](#the-heleketclient)
- [Configuration reference](#configuration-reference)
- [`ICommandResponse<T>` — the universal return shape](#icommandresponset--the-universal-return-shape)
- [Error catalog](#error-catalog)
- [Payment API](#payment-api)
- [Payout API](#payout-api)
- [Pagination & async iterators](#pagination--async-iterators)
- [Webhook verification](#webhook-verification)
- [Retries & timeouts](#retries--timeouts)
- [AbortSignal cancellation](#abortsignal-cancellation)
- [Typed enums (Currency / Network / Status / CourseSource / PayoutPriority)](#typed-enums)
- [Working with command namespaces directly](#working-with-command-namespaces-directly)
- [Dependency injection — replacing internals](#dependency-injection--replacing-internals)
- [Architecture](#architecture)
- [Public exports map](#public-exports-map)
- [TypeScript notes](#typescript-notes)
- [Scripts](#scripts)
- [License](#license)

---

## Why this SDK

- **Single client, two roles.** One `HeleketClient` exposes both payment (`PAYMENT_KEY`) and payout (`PAYOUT_KEY`) flows.
- **Never throws on API errors.** Every public method resolves to `ICommandResponse<T>` with `isSuccess`, `data`, `code`, `message`. Throws are reserved for misconfiguration (missing key, no fetch).
- **Strict input, lenient output.** Inputs validated by `zod` strictly; responses parsed with `.loose()` so new Heleket fields will not break the SDK.
- **camelCase API.** Snake_case ↔ camelCase conversion is done inside the SDK; you never see `order_id`, `is_payment_multiple` etc.
- **Built-in resilience.** Exponential backoff with jitter retries 5xx, 429 and network errors out of the box.
- **Async-iterator pagination.** `historyAll()` walks cursors transparently.
- **Constant-time webhook verification.** `paymentWebhook` / `payoutWebhook` verify the MD5 signature using `timingSafeEqual`.
- **Every internal piece is replaceable.** Swap HTTP client, retry policy, signer, case converter, envelope parser via constructor options.
- **Strict TS.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict` — all on.

## vs `heleket/php-sdk`

Same wire protocol, very different ergonomics. The PHP SDK is ~150 lines of cURL + `throw RequestBuilderException`. This SDK is a full client library with retries, validation, webhook verification, async iterators, DI, and types.

|                                    | `heleket/php-sdk` v1.0.0                                                                       | `heleket-sdk` (this package)                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wire compatibility**             | reference                                                                                      | identical (host, sign, headers, envelope)                                                                                                                     |
| **Endpoints exposed**              | 9 (7 payment + 2 payout)                                                                       | **11** (+ `payout.list`, `payout.services`)                                                                                                                   |
| **HTTP transport**                 | cURL                                                                                           | native `fetch` (Node 18+)                                                                                                                                     |
| **Pagination**                     | `history($page = 1)` — passes integer as cursor (broken past page 1; Heleket cursor is a hash) | `list({cursor: nextCursor})` — correct; plus `historyAll()` async iterator                                                                                    |
| **Webhook verification**           | not in SDK — DIY                                                                               | `paymentWebhook.verify()` / `payoutWebhook.verify()`, constant-time `timingSafeEqual`                                                                         |
| **Retries on 5xx / 429 / network** | none                                                                                           | exponential backoff with jitter, configurable                                                                                                                 |
| **Timeouts**                       | cURL default (often ∞)                                                                         | 30s default, configurable per client                                                                                                                          |
| **Cancellation**                   | none                                                                                           | `AbortSignal` per request, composed with internal timeout                                                                                                     |
| **Input validation**               | none                                                                                           | `zod` strict schema per endpoint                                                                                                                              |
| **Response parsing**               | raw associative array                                                                          | `zod` parsed (loose — forward-compatible with new Heleket fields)                                                                                             |
| **Naming convention**              | snake_case (Heleket wire) leaks into your code                                                 | camelCase outside, snake_case on the wire (auto-converted)                                                                                                    |
| **Error reporting**                | throws `RequestBuilderException` with `getMethod()` and `getErrors()`                          | returns `ICommandResponse<T>` with stable codes (`V001`/`A001`/`P001`/`N001`/`T001`/`W001`/`U001`), `message`, `errors`, and a suggested `httpCode` per error |
| **Types**                          | none (PHP 5.6 compat)                                                                          | full TypeScript, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`                                                                         |
| **Network/Currency autocomplete**  | plain `string`                                                                                 | `Network.Value` / `Currency.Value` namespaces — IDE suggests known values, any new string still accepted (`(string & {})` trick)                              |
| **Endpoint metadata**              | none                                                                                           | `REST_API.*` constants + `endpointDetails` per command (controller URL, method, description) for OpenAPI/codegen                                              |
| **Internals replaceable**          | `final` classes, hardcoded URL                                                                 | every collaborator behind an interface: `IHttpClient`, `IRetryPolicy`, `ICaseConverter`, `IEnvelopeParser`, `ISigner` — DI via constructor options            |
| **Test suite**                     | none in repo                                                                                   | 35 unit tests, mock fetch transport, no real network needed                                                                                                   |
| **Distribution**                   | n/a (Composer)                                                                                 | dual ESM + CJS bundle, matched `.d.ts` / `.d.cts`, zero non-zod runtime deps                                                                                  |
| **Lines of code**                  | ~150                                                                                           | ~1.7K incl. tests, schemas, types                                                                                                                             |

### Side-by-side: create a payment

PHP SDK:

```php
$payment = \Heleket\Api\Client::payment(PAYMENT_KEY, MERCHANT_UUID);
try {
    $res = $payment->create([
        'amount'       => '16',
        'currency'     => 'USD',
        'order_id'     => '555123',
        'url_callback' => 'https://example.com/cb',
        'lifetime'     => 7200,
        'to_currency'  => 'ETH',
    ]);
    echo $res['url'];
} catch (\Heleket\Api\RequestBuilderException $e) {
    error_log($e->getMethod() . ': ' . $e->getMessage());
}
```

This SDK:

```ts
const heleket = new HeleketClient({
  paymentKey: PAYMENT_KEY,
  merchantUuid: MERCHANT_UUID,
});

const res = await heleket.payment.create({
  amount: '16',
  currency: 'USD', // IDE autocompletes USDT/USDC/...
  orderId: '555123', // camelCase, validated
  urlCallback: 'https://example.com/cb',
  lifetime: 7200, // validated 300..43200
  toCurrency: 'ETH',
});

if (res.isSuccess && res.data) {
  console.log(res.data.url); // typed; autocompletes uuid/status/expiredAt/...
} else {
  console.error(res.code, res.message, res.errors);
}
```

## Install

```bash
npm install @tsforge7/heleket-sdk
# or
pnpm add @tsforge7/heleket-sdk
# or
yarn add @tsforge7/heleket-sdk
```

Requirements: **Node.js 18+** (uses native `fetch` and `AbortSignal.timeout`).

`zod ^4` is a runtime dependency.

## Get your credentials

You need three values from your [Heleket merchant dashboard](https://heleket.com):

- **`merchantUuid`** — your merchant identifier (UUID format, e.g. `8b03432e-385b-4670-8d06-064591096795`). Same for all flows.
- **`paymentKey`** (a.k.a. `PAYMENT_API_KEY`) — used to **create invoices and read payment data**, and to verify payment webhooks.
- **`payoutKey`** (a.k.a. `PAYOUT_API_KEY`) — used to **send payouts** and verify payout webhooks. This is a separate key from the payment one — guard it more carefully, it controls funds out.

Store them in environment variables. **Never check them into git**:

```bash
HELEKET_MERCHANT_UUID=8b03432e-385b-4670-8d06-064591096795
HELEKET_PAYMENT_KEY=...
HELEKET_PAYOUT_KEY=...
```

You only need to pass the keys you actually use. Read-only payment integration? Just `paymentKey`. Backend wallet sweeper? Just `payoutKey`. Full marketplace? Both.

## Quick start

### 1. Create a payment

```ts
import { HeleketClient } from '@tsforge7/heleket-sdk';

const heleket = new HeleketClient({
  paymentKey: process.env.HELEKET_PAYMENT_KEY!,
  merchantUuid: process.env.HELEKET_MERCHANT_UUID!,
});

const res = await heleket.payment.create({
  amount: '16',
  currency: 'USD',
  orderId: '555123',
  urlCallback: 'https://example.com/heleket/webhook',
  lifetime: 7200,
  toCurrency: 'ETH',
});

if (res.isSuccess && res.data) {
  console.log('Pay here:', res.data.url);
  console.log('Invoice uuid:', res.data.uuid);
} else {
  console.error(res.code, res.message);
}
```

### 2. Create a payout

```ts
const heleket = new HeleketClient({
  payoutKey: process.env.HELEKET_PAYOUT_KEY!,
  merchantUuid: process.env.HELEKET_MERCHANT_UUID!,
});

const res = await heleket.payout.create({
  amount: '15',
  currency: 'USDT',
  network: 'TRON',
  orderId: '555321',
  address: 'TXguLRFtrAFrEDA17WuPfrxB84jVzJcNNV',
  isSubtract: '1',
  urlCallback: 'https://example.com/heleket/payout-webhook',
});
```

### 3. Verify an incoming webhook

```ts
import express from 'express';
import { HeleketClient } from '@tsforge7/heleket-sdk';

const heleket = new HeleketClient({
  paymentKey: process.env.HELEKET_PAYMENT_KEY!,
  payoutKey: process.env.HELEKET_PAYOUT_KEY!,
  merchantUuid: process.env.HELEKET_MERCHANT_UUID!,
});

const app = express();
app.use(express.json());

app.post('/heleket/webhook', (req, res) => {
  if (!heleket.paymentWebhook.verify(req.body)) {
    return res.status(401).send('invalid signature');
  }
  // req.body is a verified Heleket payload
  res.sendStatus(200);
});
```

## Recipe: accept your first payment end-to-end

The full happy path for an online checkout: customer hits "Pay", you redirect to Heleket, they pay in crypto, Heleket calls your webhook, you mark the order as paid. Below is a self-contained Express example that does all of it.

```ts
import express from 'express';
import { HeleketClient } from '@tsforge7/heleket-sdk';

const heleket = new HeleketClient({
  merchantUuid: process.env.HELEKET_MERCHANT_UUID!,
  paymentKey: process.env.HELEKET_PAYMENT_KEY!,
});

const app = express();
app.use(express.json());

// 1. Create an invoice when the customer clicks "Pay".
//    Return the hosted Heleket pay URL — redirect the browser there.
app.post('/checkout', async (req, res) => {
  const { orderId, amountUsd } = req.body as {
    orderId: string;
    amountUsd: string;
  };

  const created = await heleket.payment.create({
    amount: amountUsd,
    currency: 'USD',
    orderId, // your own id — used everywhere below
    urlCallback: 'https://your.app/heleket/webhook',
    urlReturn: 'https://your.app/orders/' + orderId,
    lifetime: 3600, // invoice expires in 1 hour
  });

  if (!created.isSuccess || !created.data) {
    return res
      .status(500)
      .json({ code: created.code, message: created.message });
  }

  // Persist the invoice uuid alongside the order so you can correlate later.
  await db.orders.update(orderId, {
    invoiceUuid: created.data.uuid,
    status: 'awaiting_payment',
  });

  res.json({ payUrl: created.data.url });
});

// 2. Handle the webhook. Heleket POSTs here when the invoice changes state.
//    Verify the signature first — if it doesn't match, the request is forged.
app.post('/heleket/webhook', async (req, res) => {
  if (!heleket.paymentWebhook.verify(req.body)) {
    return res.sendStatus(401);
  }

  const w = req.body as {
    order_id: string;
    status: string;
    is_final: boolean;
    payment_amount: string;
    currency: string;
    txid: string | null;
  };

  // Idempotency: the same webhook may be delivered more than once.
  // Look up by your order_id and decide based on current DB state.
  const order = await db.orders.findByOrderId(w.order_id);
  if (!order || order.status === 'paid') {
    return res.sendStatus(200); // already processed — ack and move on
  }

  if (w.status === 'paid' || w.status === 'paid_over') {
    await db.orders.update(w.order_id, {
      status: 'paid',
      paidAmount: w.payment_amount,
      paidCurrency: w.currency,
      txid: w.txid,
    });
    // ... fulfil the order, notify the customer, etc.
  } else if (
    w.status === 'fail' ||
    w.status === 'cancel' ||
    w.status === 'system_fail'
  ) {
    await db.orders.update(w.order_id, { status: 'failed' });
  }

  // Always respond 2xx so Heleket stops retrying.
  res.sendStatus(200);
});

// 3. (Optional) If the customer returns via urlReturn before the webhook fires,
//    you can poll info() once to refresh state instead of waiting.
app.get('/orders/:orderId', async (req, res) => {
  const order = await db.orders.findByOrderId(req.params.orderId);
  if (!order) return res.sendStatus(404);

  if (order.status === 'awaiting_payment') {
    const info = await heleket.payment.info({ orderId: req.params.orderId });
    if (
      info.isSuccess &&
      info.data?.status === 'paid' &&
      order.status !== 'paid'
    ) {
      await db.orders.update(req.params.orderId, { status: 'paid' });
    }
  }
  res.json(order);
});

app.listen(3000);
```

Key things this recipe does right:

- **Uses your own `orderId`** as the correlation handle everywhere — Heleket invoice `uuid`, your DB, webhook payload — all bound by the same id.
- **Verifies the webhook signature** before trusting any field in `req.body`.
- **Is idempotent**: re-deliveries of the same webhook (which Heleket may do) don't double-fulfil.
- **Always replies 2xx** to webhooks — even when there's nothing to do — so Heleket stops retrying.
- **`is_final: true`** means the status will not change anymore (terminal state). Use it if you want to ignore intermediate updates.

## Payment & payout status reference

These are the statuses you'll see in `res.data.status` (and in webhook `status`). Verified against the official docs ([payment statuses](https://doc.heleket.com/ru/methods/payments/payment-statuses), [payout statuses](https://doc.heleket.com/ru/methods/payouts/payout-statuses)) and exposed as `PaymentStatus.KNOWN` / `PayoutStatus.KNOWN` with IDE autocomplete.

**Payment / invoice statuses (14):**

| Status                 | Meaning (from Heleket docs)                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `paid`                 | Payment succeeded; the customer paid exactly the required amount            |
| `paid_over`            | Payment succeeded; the customer paid **more** than required                 |
| `wrong_amount`         | The customer paid **less** than required                                    |
| `wrong_amount_waiting` | The customer paid less than required, **awaiting top-up**                   |
| `process`              | Payment is being processed                                                  |
| `confirm_check`        | Transaction seen on-chain, waiting for the required number of confirmations |
| `check`                | Awaiting the transaction to appear on-chain                                 |
| `fail`                 | Payment error                                                               |
| `cancel`               | Payment cancelled — the customer did not pay                                |
| `system_fail`          | A system error occurred                                                     |
| `refund_process`       | Refund is being processed                                                   |
| `refund_fail`          | An error occurred during the refund                                         |
| `refund_paid`          | Refund succeeded                                                            |
| `locked`               | Funds locked by the AML program                                             |

**Payout statuses (6):**

| Status        | Meaning (from Heleket docs) |
| ------------- | --------------------------- |
| `process`     | Payout in progress          |
| `check`       | Payout being verified       |
| `paid`        | Payout succeeded            |
| `fail`        | Payout failed               |
| `cancel`      | Payout cancelled            |
| `system_fail` | A system error occurred     |

> Always treat **`is_final: true`** as the only safe signal to commit to a state change. Anything else is in-flight and may still change.

```ts
import { PaymentStatus, PayoutStatus } from '@tsforge7/heleket-sdk';

// IDE autocompletes all 14 statuses when typing 'p'..., 'c'..., etc:
if (record.status === 'paid' || record.status === 'paid_over') {
  /* ... */
}

// Iterate over the full list if you need it at runtime:
for (const s of PaymentStatus.KNOWN) {
  /* ... */
}

// Strict-typed parameter:
function handlePaymentStatus(status: PaymentStatus.Value) {
  /* ... */
}
function handleKnownOnly(status: PaymentStatus.Known) {
  /* ... */
}
```

## Webhook payload reference

When Heleket POSTs your `url_callback`, the body is JSON with these fields (verified against `WebhookVerifier`):

**Payment webhook** (signed with **`paymentKey`**):

| Field                 | Type           | Notes                                                 |
| --------------------- | -------------- | ----------------------------------------------------- |
| `type`                | string         | `'payment'`                                           |
| `uuid`                | string         | Heleket invoice UUID                                  |
| `order_id`            | string         | Your id (the one you passed to `payment.create`)      |
| `amount`              | string         | Invoice amount in `currency`                          |
| `payment_amount`      | string         | Amount actually paid in `payer_currency`              |
| `payment_amount_usd`  | string         | USD equivalent of the payment                         |
| `merchant_amount`     | string         | What lands on your merchant balance after commission  |
| `commission`          | string         | Heleket commission                                    |
| `is_final`            | boolean        | If true, status will not change                       |
| `status`              | string         | See the status table above                            |
| `from`                | string \| null | Payer wallet address                                  |
| `wallet_address_uuid` | string \| null | Static wallet UUID if paid into one                   |
| `network`             | string         | Network the payment was made on                       |
| `currency`            | string         | Invoice currency                                      |
| `payer_currency`      | string         | Currency the payer actually used                      |
| `additional_data`     | string \| null | The value you passed in `additionalData`              |
| `convert`             | object \| null | Conversion details if `toCurrency` was used           |
| `txid`                | string \| null | On-chain transaction id once confirmed                |
| `sign`                | string         | MD5 signature — verified by `paymentWebhook.verify()` |

**Payout webhook** (signed with **`payoutKey`**):

| Field             | Type           | Notes                                                         |
| ----------------- | -------------- | ------------------------------------------------------------- |
| `type`            | string         | `'payout'`                                                    |
| `uuid`            | string         | Payout UUID                                                   |
| `order_id`        | string         | Your id                                                       |
| `amount`          | string         | Payout amount                                                 |
| `merchant_amount` | string         | Amount debited from your balance                              |
| `commission`      | string         | Heleket commission                                            |
| `is_final`        | boolean        |                                                               |
| `status`          | string         | See payout statuses above                                     |
| `txid`            | string \| null | On-chain transaction id                                       |
| `currency`        | string         |                                                               |
| `network`         | string         |                                                               |
| `payer_currency`  | string         |                                                               |
| `payer_amount`    | string         |                                                               |
| `sign`            | string         | Signed with `payoutKey` — verify via `payoutWebhook.verify()` |

> **The SDK does NOT parse webhooks into a zod schema** — `verify()` returns a boolean only. Cast `req.body` to whichever subset of the above you need; new Heleket fields will pass through untouched.

## Idempotency & dedup

Two retry vectors you must handle in production:

1. **Heleket re-delivers the same webhook.** Network blips, your 5xx, manual `payment.resend()` — Heleket may POST the same payload more than once. Make webhook handling idempotent: look up your record by `order_id`, check current state, no-op if already terminal.

2. **You may create the same invoice twice.** If your `/checkout` handler is retried (browser refresh, queue redrive), passing the **same `order_id`** is the safe move:

```ts
const a = await heleket.payment.create({
  amount: '10',
  currency: 'USD',
  orderId: 'order-42',
});
const b = await heleket.payment.create({
  amount: '10',
  currency: 'USD',
  orderId: 'order-42',
});
// a.data.uuid === b.data.uuid ?  Depends on Heleket behavior — at minimum, look it up first:
const existing = await heleket.payment.info({ orderId: 'order-42' });
if (existing.isSuccess) return existing.data!; // reuse
// else create
```

`order_id` is your idempotency key end-to-end: it's how you correlate `payment.info`, the webhook payload, and your DB.

## Error handling cookbook

Concrete recipes for each error code. All come back as `res.code` on `ICommandResponse<T>`.

```ts
import { type ErrorCode } from '@tsforge7/heleket-sdk';

// Tiny helper for exhaustive switch checks. If the SDK adds a new ErrorCode
// in the future and you forget to handle it, TS will flag the call below.
const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${String(value)}`);
};

const res = await heleket.payment.create({ ... });
if (res.isSuccess) {
  return res.data!;
}

// res.code is typed as `string` for forward-compat; cast to ErrorCode for
// an exhaustive switch where TS will flag any code you forgot to handle.
const code = res.code as ErrorCode;

switch (code) {
  case 'V001': // VALIDATION_ERROR — your input failed the SDK's zod schema
    // Programmer error. Don't retry. Fix the call site.
    log.error('Bad payload to Heleket', { message: res.message });
    throw new BadRequest(res.message);

  case 'A001': // API_ERROR — Heleket returned a non-success state
    // Inspect res.message and res.errors. If it's a 4xx, it won't help to retry.
    // 5xx already retried by the SDK; if you still see A001, treat it as terminal.
    log.warn('Heleket API rejected request', { message: res.message, errors: res.errors });
    throw new ServiceUnavailable(res.message);

  case 'P001': // PARSE_ERROR — response didn't fit the expected shape
    // Likely SDK is behind Heleket's API. Open an issue. Don't retry blindly.
    log.error('Heleket response unparseable', { message: res.message });
    throw new ServiceUnavailable('Upstream response invalid');

  case 'N001': // NETWORK_ERROR — fetch threw (DNS, conn refused, TLS, ...)
    // SDK already retried per the retry policy. If you got here, transport is dead.
    log.error('Heleket unreachable', { message: res.message });
    throw new ServiceUnavailable('Payment provider unreachable');

  case 'T001': // TIMEOUT_ERROR
    // Same story — already retried. Surface to the user.
    throw new GatewayTimeout('Heleket timed out');

  case 'W001': // WEBHOOK_INVALID_SIGN — only happens on .verify() failure
    // Drop the request silently or 401.
    return res.sendStatus(401);

  case 'U001': // UNKNOWN_ERROR — catch-all
    log.error('Unknown Heleket failure', { code: res.code, message: res.message });
    throw new InternalError();

  default:
    // Compile-time exhaustiveness: if the SDK adds a new ErrorCode and you
    // didn't handle it above, TS will error here at build time.
    return assertNever(code);
}
```

Tip: read `res.errors` too — when Heleket sends per-field validation errors, they're forwarded there in addition to `res.message`.

## The `HeleketClient`

`HeleketClient` is a **composition root**. It builds and holds:

- one `IHttpClient` (default `FetchHttpClient`),
- one `IRetryPolicy` (default `ExponentialBackoffRetryPolicy`),
- one `ICaseConverter` (default `SnakeCaseConverter`),
- one `IEnvelopeParser` (default `HeleketEnvelopeParser`),
- one `UrlBuilder`,
- a `signerFactory` (default `(key) => new Md5Signer(key)`).

Resources (`payment`, `payout`) are constructed **lazily** on first access, each with its own `CommandExecutor` and `ISigner` bound to the corresponding API key. Webhook verifiers (`paymentWebhook`, `payoutWebhook`) are also lazy and use the same per-key signer.

Accessing `.payment` / `.paymentWebhook` without a `paymentKey` in the constructor throws an `Error` — this is a programmer error, not a runtime one. Same for `.payout` / `.payoutWebhook`.

## Configuration reference

```ts
new HeleketClient({
  // identity (required)
  merchantUuid: string,
  paymentKey?:  string,   // required to use .payment / .paymentWebhook
  payoutKey?:   string,   // required to use .payout / .payoutWebhook

  // transport
  baseUrl?:   string,                       // default 'https://api.heleket.com/v1'
  timeoutMs?: number,                       // default 30_000
  fetch?:     FetchLike,                    // default globalThis.fetch

  // retry strategy
  retry?: {
    retries?:     number,                   // default 3
    baseDelayMs?: number,                   // default 250
    maxDelayMs?:  number,                   // default 4_000
    sleep?:       (ms: number) => Promise<void>, // override for tests
    random?:      () => number,             // override jitter source
  },

  // advanced DI — replace any collaborator
  httpClient?:     IHttpClient,
  retryPolicy?:    IRetryPolicy,
  caseConverter?:  ICaseConverter,
  envelopeParser?: IEnvelopeParser,
  signerFactory?:  (apiKey: string) => ISigner,
});
```

At least one of `paymentKey` / `payoutKey` is required; the constructor throws otherwise.

## `ICommandResponse<T>` — the universal return shape

Every resource method resolves to this:

```ts
interface ICommandResponse<T> {
  isSuccess: boolean;
  data?: T;
  code?: string; // from the ERRORS catalog (V001, A001, ...)
  message?: string; // human-readable explanation
  errors?: unknown; // server-side per-field validation errors, if Heleket sent any
}
```

Recommended pattern with type-narrowing:

```ts
const res = await heleket.payment.info({ uuid });
if (!res.isSuccess || !res.data) {
  return reportError(res.code, res.message, res.errors);
}
res.data.status; // fully typed
```

When Heleket returns per-field validation errors (`{state: 1, errors: {amount: ["must be positive"]}}`), they land in `res.errors` untouched, alongside the summary `res.message`. Matches PHP `RequestBuilderException::getErrors()`.

## Error catalog

Stable error codes, exported as `ERRORS`:

| Code   | Constant                      | When                             | `httpCode` |
| ------ | ----------------------------- | -------------------------------- | ---------- |
| `V001` | `ERRORS.VALIDATION_ERROR`     | Input failed zod schema          | 400        |
| `A001` | `ERRORS.API_ERROR`            | Heleket returned non-success     | 502        |
| `P001` | `ERRORS.PARSE_ERROR`          | Could not parse Heleket response | 502        |
| `N001` | `ERRORS.NETWORK_ERROR`        | `fetch` threw (network)          | 503        |
| `T001` | `ERRORS.TIMEOUT_ERROR`        | Request timed out                | 504        |
| `W001` | `ERRORS.WEBHOOK_INVALID_SIGN` | Webhook signature mismatch       | 401        |
| `U001` | `ERRORS.UNKNOWN_ERROR`        | Catch-all                        | 500        |

```ts
import { ERRORS } from '@tsforge7/heleket-sdk';

ERRORS.API_ERROR.code; // 'A001'
ERRORS.API_ERROR.message; // 'Heleket API returned an error'
ERRORS.API_ERROR.httpCode; // 502 — suggested HTTP code if you're forwarding to a web client
```

## Payment API

`heleket.payment` is a `PaymentResource`. Every method accepts an optional `AbortSignal` as the last argument.

| Method               | Description                                         |
| -------------------- | --------------------------------------------------- |
| `create(input)`      | Create a payment invoice                            |
| `info(input)`        | Get invoice by `uuid` or `orderId`                  |
| `services()`         | Networks/currencies/limits/commissions for payments |
| `list(input?)`       | Page of invoices (cursor pagination)                |
| `historyAll(input?)` | Async iterator over all invoices                    |
| `resend(input)`      | Force webhook re-delivery for an invoice            |
| `wallet(input)`      | Create a static deposit wallet                      |
| `balance()`          | Merchant + user balances                            |

### `payment.create(input)`

```ts
const res = await heleket.payment.create({
  amount: '16', // string | number, required
  currency: 'USD', // required, autocomplete from Currency.KNOWN
  orderId: '555123', // required, 1..128 chars
  network: 'ETH', // optional, autocomplete from Network.KNOWN
  toCurrency: 'ETH', // optional
  urlCallback: 'https://.../cb', // optional
  urlReturn: 'https://.../back', // optional
  urlSuccess: 'https://.../ok', // optional
  isPaymentMultiple: false, // optional
  lifetime: 7200, // optional, 300..43200 seconds (default 3600)
  subtract: 0, // optional, 0..100 % commission charged to payer
  accuracyPaymentPercent: 0, // optional, 0..5
  additionalData: 'some-tag', // optional, max 255 chars
  currencies: [{ currency: 'USDT', network: 'TRON' }], // optional whitelist
  exceptCurrencies: [{ currency: 'XMR' }], // optional blacklist
  courseSource: 'Binance', // optional: Binance | BinanceP2P | Exmo | Kucoin
  fromReferralCode: '...', // optional
  discountPercent: 10, // optional, -99..100
  isRefresh: false, // optional
  payerEmail: 'payer@example.com', // optional
});
```

### `payment.info(input)`

```ts
await heleket.payment.info({ uuid: '8b03432e-385b-4670-8d06-064591096795' });
// OR
await heleket.payment.info({ orderId: '555123' });
```

If both are passed, Heleket prefers `orderId`.

### `payment.services()`

```ts
const res = await heleket.payment.services();
if (res.isSuccess) {
  for (const s of res.data!) {
    console.log(
      s.network,
      s.currency,
      s.isAvailable,
      s.limit.minAmount,
      '-',
      s.limit.maxAmount,
    );
  }
}
```

### `payment.list(input?)`

```ts
const page1 = await heleket.payment.list({
  dateFrom: '2025-01-01 00:00:00', // optional, server format
  dateTo: '2025-12-31 23:59:59',
});

if (page1.isSuccess) {
  console.log(page1.data!.items);
  console.log('next cursor:', page1.data!.paginate.nextCursor);
}

// Subsequent page:
const page2 = await heleket.payment.list({
  cursor: page1.data!.paginate.nextCursor!,
});
```

### `payment.resend(input)`

```ts
await heleket.payment.resend({ uuid: '...' });
// OR
await heleket.payment.resend({ orderId: '555123' });
```

### `payment.wallet(input)`

```ts
const res = await heleket.payment.wallet({
  currency: 'USDT',
  network: 'TRON',
  orderId: '5535321',
  urlCallback: 'https://example.com/callback',
});

if (res.isSuccess) {
  console.log(res.data!.address); // deposit address
}
```

### `payment.balance()`

```ts
const res = await heleket.payment.balance();
if (res.isSuccess) {
  const merchantEntries = res.data![0]!.balance.merchant; // array of { uuid, balance, currencyCode }
  const userEntries = res.data![0]!.balance.user;
}
```

## Payout API

`heleket.payout` is a `PayoutResource`.

| Method               | Description                       |
| -------------------- | --------------------------------- |
| `create(input)`      | Send a payout                     |
| `info(input)`        | Get payout by `uuid` or `orderId` |
| `services()`         | Payout networks/currencies        |
| `list(input?)`       | Page of payouts                   |
| `historyAll(input?)` | Async iterator over all payouts   |

### `payout.create(input)`

```ts
const res = await heleket.payout.create({
  amount: '15', // string | number
  currency: 'USDT', // autocomplete from Currency.KNOWN
  network: 'TRON', // autocomplete from Network.KNOWN
  orderId: '555321', // 1..100 chars, alpha_dash
  address: 'TXguLRFtrAFrEDA17WuPfrxB84jVzJcNNV',
  isSubtract: true, // boolean per docs (also accepts '0'|'1'|0|1 for wire-compat)
  urlCallback: 'https://.../cb', // optional
  toCurrency: 'USDT', // optional, required if currency is a fiat
  fromCurrency: 'USDT', // optional — only 'USDT' is accepted, for auto-conversion
  memo: 'memo-or-tag', // optional, 1..30 chars (e.g. for TON / XRP)
  courseSource: 'Binance', // optional: Binance | BinanceP2P | Exmo | Kucoin
  priority: 'recommended', // optional, BTC/ETH/Polygon/BSC only:
  //   recommended | economy | high | highest
});
```

### `payout.info(input)`

Same shape as `payment.info`:

```ts
await heleket.payout.info({ uuid: '...' });
await heleket.payout.info({ orderId: '...' });
```

## Pagination & async iterators

`list()` returns a single page. `historyAll()` calls `list()` in a loop, following `paginate.nextCursor`:

```ts
for await (const tx of heleket.payment.historyAll({
  dateFrom: '2025-01-01 00:00:00',
})) {
  console.log(tx.uuid, tx.status, tx.amount);
}
```

Behavior: the iterator **stops silently on the first non-success page** to keep the loop simple. If you need granular error handling, call `list()` directly and walk the cursor yourself:

```ts
let cursor: string | undefined;
while (true) {
  const page = await heleket.payment.list({ cursor });
  if (!page.isSuccess || !page.data) {
    console.error('failed at cursor', cursor, page.message);
    break;
  }
  process(page.data.items);
  if (!page.data.paginate.hasPages || !page.data.paginate.nextCursor) break;
  cursor = page.data.paginate.nextCursor;
}
```

## Webhook verification

Heleket attaches `sign: <md5>` to every webhook body. `WebhookVerifier` strips it, re-computes `md5(base64(JSON.stringify(rest)) + apiKey)` and compares **in constant time** using `crypto.timingSafeEqual`.

Two verifiers, one per key:

```ts
heleket.paymentWebhook.verify(payload); // signed with paymentKey
heleket.payoutWebhook.verify(payload); // signed with payoutKey
```

`verify` accepts either a raw JSON string or a parsed object:

```ts
// Express (JSON already parsed):
app.post('/heleket/webhook', (req, res) => {
  if (!heleket.paymentWebhook.verify(req.body)) {
    return res.sendStatus(401);
  }
  // ... handle req.body
  res.sendStatus(200);
});

// Raw body (preferred — key order matches the server byte-for-byte):
const ok = heleket.paymentWebhook.verify(rawBodyString);
```

You can also create a `WebhookVerifier` directly:

```ts
import { Md5Signer, WebhookVerifier } from '@tsforge7/heleket-sdk';
const verifier = new WebhookVerifier(
  new Md5Signer(process.env.HELEKET_PAYMENT_KEY!),
);
verifier.verify(req.body);
```

## Retries & timeouts

Default policy retries up to **3 times** on:

- network error (fetch threw),
- timeout,
- HTTP 5xx,
- HTTP 429.

It does **not** retry on 4xx (except 429) — those are client errors.

Delay = `min(baseDelayMs * 2^attempt + random() * baseDelayMs, maxDelayMs)`.

Defaults are exported and can be inspected:

```ts
import { RETRY_DEFAULTS, HTTP_DEFAULTS } from '@tsforge7/heleket-sdk';

RETRY_DEFAULTS.RETRIES; // 3
RETRY_DEFAULTS.BASE_DELAY_MS; // 250
RETRY_DEFAULTS.MAX_DELAY_MS; // 4_000
HTTP_DEFAULTS.TIMEOUT_MS; // 30_000
```

Override per client:

```ts
new HeleketClient({
  ...,
  timeoutMs: 10_000,
  retry: { retries: 5, baseDelayMs: 100, maxDelayMs: 2_000 },
});

// Disable retries entirely:
new HeleketClient({
  ...,
  retry: { retries: 0, baseDelayMs: 1, maxDelayMs: 1 },
});
```

## AbortSignal cancellation

Every resource method takes an optional `AbortSignal` as the last argument:

```ts
const controller = new AbortController();
const promise = heleket.payment.info({ uuid }, controller.signal);

// Cancel from anywhere:
setTimeout(() => controller.abort(), 1_000);

const res = await promise;
// If aborted, res.code === 'N001' or 'T001' depending on what triggered first.
```

The user signal is composed with the internal timeout signal — whichever fires first wins.

## Typed enums

Every Heleket field that has a documented set of values is exposed as a namespace with the same shape — `KNOWN` (the readonly array), `Known` (strict union), `Value` (loose union with `(string & {})`), and `Schema` (zod schema used internally). All six give you **IDE autocomplete without locking you to a fixed set** — pass any string if Heleket adds a new value before the SDK is updated.

| Namespace        | Source                                                                                                                                                                | Values                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Currency`       | `/payment/services` examples                                                                                                                                          | 17 — USDT, USDC, BUSD, DAI, VERSE, CGPT, BTC, ETH, BNB, TRX, LTC, BCH, DASH, DOGE, MATIC, TON, XMR |
| `Network`        | `/payment/services` examples                                                                                                                                          | 11 — ETH, TRON, BSC, BTC, LTC, BCH, DASH, DOGE, POLYGON, TON, XMR                                  |
| `PaymentStatus`  | [`/payment-statuses`](https://doc.heleket.com/ru/methods/payments/payment-statuses)                                                                                   | 14 — see status table above                                                                        |
| `PayoutStatus`   | [`/payout-statuses`](https://doc.heleket.com/ru/methods/payouts/payout-statuses)                                                                                      | 6 — see status table above                                                                         |
| `CourseSource`   | [`/creating-invoice`](https://doc.heleket.com/ru/methods/payments/creating-invoice), [`/creating-payout`](https://doc.heleket.com/ru/methods/payouts/creating-payout) | 4 — `Binance`, `BinanceP2P`, `Exmo`, `Kucoin`                                                      |
| `PayoutPriority` | [`/creating-payout`](https://doc.heleket.com/ru/methods/payouts/creating-payout)                                                                                      | 4 — `recommended`, `economy`, `high`, `highest` (BTC, ETH, Polygon, BSC only)                      |

Usage is identical across all of them:

```ts
import {
  Currency,
  Network,
  PaymentStatus,
  PayoutStatus,
  CourseSource,
  PayoutPriority,
} from '@tsforge7/heleket-sdk';

// Runtime — schema is what the SDK applies to validate request fields:
Currency.Schema.parse('USDT');
Network.Schema.parse('TRON');
PaymentStatus.Schema.parse('paid');

// Types — autocomplete on known values, fallback to any string:
const c: Currency.Value = 'USDT'; // suggests USDT, USDC, BUSD, ...
const c2: Currency.Value = 'NEW_COIN'; // still accepted
const c3: Currency.Known = 'USDT'; // strict — only the known union
const s: PaymentStatus.Value = 'paid';
const p: PayoutPriority.Value = 'recommended';
const cs: CourseSource.Value = 'Binance';

// Snapshots (runtime arrays) — handy for UI dropdowns, validation, exhaustive checks:
Currency.KNOWN; // readonly ['USDT', 'USDC', ...]
PaymentStatus.KNOWN; // readonly ['paid', 'paid_over', ...]
CourseSource.KNOWN; // readonly ['Binance', 'BinanceP2P', 'Exmo', 'Kucoin']
PayoutPriority.KNOWN; // readonly ['recommended', 'economy', 'high', 'highest']
```

> **Live source of truth for Currency / Network:** call `heleket.payment.services()` or `heleket.payout.services()` — they return the current per-network limits and commission rates from Heleket directly.

## Working with command namespaces directly

Each endpoint is a **command namespace** with `url`, schemas, types and metadata. Useful for: generating OpenAPI specs, wiring up TanStack Query, building your own executor.

```ts
import {
  CreatePaymentCommand,
  CreatePaymentRequestBodySchema,
  type ICreatePaymentRequestBody,
  type ICreatePaymentResponse,
} from '@tsforge7/heleket-sdk';

// URL (relative path, no host):
CreatePaymentCommand.url; // 'payment'

// zod schemas:
CreatePaymentCommand.RequestBodySchema;
CreatePaymentCommand.ResponseSchema;

// Metadata:
CreatePaymentCommand.endpointDetails;
// {
//   CONTROLLER_URL: 'payment',
//   REQUEST_METHOD: 'post',
//   METHOD_DESCRIPTION: 'Create a new payment invoice',
//   METHOD_LONG_DESCRIPTION: '...',
// }

// Validate input yourself:
const parsed = CreatePaymentRequestBodySchema.safeParse({
  amount: '16',
  currency: 'USD',
  orderId: '1',
});
```

Every command exposes the same shape:

```ts
namespace XxxCommand {
  const url: string;
  const TSQ_url: string;            // alias for url — convenient for TanStack Query keys
  const RequestBodySchema: ZodType;
  type IRequestBody;
  const ResponseSchema: ZodType;
  type IResponse;
  const endpointDetails: IEndpointDetails;
  // List endpoints also expose:
  const RequestQuerySchema: ZodType;
  type IRequestQuery;
}
```

Available commands:

| Namespace                     | Path                    |
| ----------------------------- | ----------------------- |
| `CreatePaymentCommand`        | `POST payment`          |
| `GetPaymentInfoCommand`       | `POST payment/info`     |
| `ListPaymentsCommand`         | `POST payment/list`     |
| `GetPaymentServicesCommand`   | `POST payment/services` |
| `ResendPaymentWebhookCommand` | `POST payment/resend`   |
| `CreateStaticWalletCommand`   | `POST wallet`           |
| `GetBalanceCommand`           | `POST balance`          |
| `CreatePayoutCommand`         | `POST payout`           |
| `GetPayoutInfoCommand`        | `POST payout/info`      |
| `ListPayoutsCommand`          | `POST payout/list`      |
| `GetPayoutServicesCommand`    | `POST payout/services`  |

## Dependency injection — replacing internals

Every collaborator is behind an interface. Build a custom one and pass it in.

### Custom HTTP client (e.g. for logging or routing)

```ts
import { FetchHttpClient, HeleketClient, type IHttpClient } from '@tsforge7/heleket-sdk';

class LoggingHttpClient implements IHttpClient {
  constructor(private readonly inner: IHttpClient) {}

  async post(req: Parameters<IHttpClient['post']>[0]) {
    const start = Date.now();
    const res = await this.inner.post(req);
    console.log(req.url, res.status, `${Date.now() - start}ms`);
    return res;
  }
}

const heleket = new HeleketClient({
  ...,
  httpClient: new LoggingHttpClient(new FetchHttpClient(globalThis.fetch)),
});
```

### Custom retry policy

```ts
import { type IRetryPolicy, RetryOutcomeKind } from '@tsforge7/heleket-sdk';

class NoRetry implements IRetryPolicy {
  async execute<T>(op: () => Promise<T>): Promise<T> {
    return op();
  }
}

new HeleketClient({ ..., retryPolicy: new NoRetry() });
```

### Custom signer

```ts
import { type ISigner, HeleketClient } from '@tsforge7/heleket-sdk';

class HmacSigner implements ISigner {
  constructor(private readonly key: string) {}
  sign(body: string): string { /* your scheme */ return '...'; }
}

new HeleketClient({
  ...,
  signerFactory: (apiKey) => new HmacSigner(apiKey),
});
```

Same approach works for `ICaseConverter` and `IEnvelopeParser`.

## Architecture

```
HeleketClient (composition root)
   │
   ├── payment           → PaymentResource ─┐
   ├── payout            → PayoutResource   │   each gets its own CommandExecutor
   ├── paymentWebhook    → WebhookVerifier  │   (bound to its api key via the signer)
   └── payoutWebhook     → WebhookVerifier  │
                                            ▼
                                   CommandExecutor.execute()
                                   ├── 1. zod validate input
                                   ├── 2. camelCase → snake_case (ICaseConverter)
                                   ├── 3. JSON.stringify body
                                   ├── 4. md5 sign body            (ISigner)
                                   ├── 5. build URL                (UrlBuilder)
                                   ├── 6. POST with retries        (IHttpClient + IRetryPolicy)
                                   ├── 7. parse envelope           (IEnvelopeParser)
                                   ├── 8. snake_case → camelCase   (ICaseConverter)
                                   └── 9. zod validate response (loose)
                                       → ICommandResponse<T>
```

Each component is one class with one job, behind a one-method interface.

## Public exports map

```
src/
  client.ts                 → HeleketClient, HeleketClientOptions, SignerFactory
  webhook/                  → WebhookVerifier
  resources/                → Resource, PaymentResource, PayoutResource
  core/
    signer/                 → ISigner, Md5Signer
    http/                   → IHttpClient, IHttpRequest, IHttpResponse, FetchLike,
                              FetchHttpClient, TransportError, HTTP_DEFAULTS
    retry/                  → IRetryPolicy, RetryOptions, RetryOutcome, RetryPredicate,
                              RetryOutcomeKind, ExponentialBackoffRetryPolicy, RETRY_DEFAULTS
    case/                   → ICaseConverter, SnakeCaseConverter
    envelope/               → IEnvelopeParser, EnvelopeResult, EnvelopeResultKind,
                              HeleketEnvelopeParser
    url/                    → UrlBuilder
    command-executor/       → CommandExecutor, ICommandDescriptor, IExecuteOptions,
                              ICommandExecutorDeps
  commands/
    common/                 → AmountLike, ByUuidOrOrderId, Paginate, ServiceItem,
                              PaymentRecord, PayoutRecord, Network, Currency (all namespaces)
    payment/                → CreatePaymentCommand, GetPaymentInfoCommand, ListPaymentsCommand,
                              GetPaymentServicesCommand, ResendPaymentWebhookCommand,
                              CreateStaticWalletCommand, GetBalanceCommand
                              (+ Request/Response schemas and types at module level)
    payout/                 → CreatePayoutCommand, GetPayoutInfoCommand, ListPayoutsCommand,
                              GetPayoutServicesCommand
  shared/api/               → BASE_URL, REST_API, getEndpointDetails, HttpMethod,
                              IEndpointDetails, controllers (PAYMENT_ROUTES, PAYOUT_ROUTES, ...)
  constants/                → ERRORS, ErrorKey, ErrorEntry, HEADERS,
                              CONTENT_TYPE_JSON, ACCEPT_JSON
  common/                   → ICommandResponse, Json, sleep, tryParseJson
```

All of the above are re-exported from the package root.

## TypeScript notes

- Ships ESM (`./dist/index.js`) + CJS (`./dist/index.cjs`) with matching `.d.ts` / `.d.cts`.
- Built with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- `peerDependencies`: `zod ^4`.
- Module resolution: `Bundler`.

## Scripts

```bash
npm run build        # tsup ESM + CJS + .d.ts
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run test:watch   # vitest watch
npm run lint         # eslint .
npm run lint:fix     # eslint . --fix
npm run format       # prettier --write .
npm run format:check # prettier --check .
```

## License

MIT. See [LICENSE](./LICENSE).
