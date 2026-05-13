# heleket-sdk

Типобезопасный Node.js / TypeScript SDK для крипто-платёжного API [Heleket](https://heleket.com).

> **BETA — пока не production-ready.** SDK функционален, 35/35 тестов проходят на мок-транспорте, но **не проверен end-to-end против реального Heleket API под нагрузкой**. Публичный API может меняться до `1.0.0`. Пиньте точную версию в `package.json`, ожидайте breaking changes между минорами, баги — в GitHub Issues.

Wire-совместимый 1:1 с официальным [`heleket/php-sdk`](https://github.com/Heleket/php-sdk) (тот же хост `https://api.heleket.com/v1`, та же MD5-подпись, те же заголовки, тот же envelope `{state, result}`) — и **радикально функциональнее** на любой другой оси. См. [подробное сравнение](#vs-heleketphp-sdk).

---

## Оглавление

- [Зачем этот SDK](#зачем-этот-sdk)
- [vs `heleket/php-sdk`](#vs-heleketphp-sdk)
- [Установка](#установка)
- [Получить ключи](#получить-ключи)
- [Быстрый старт](#быстрый-старт)
- [Рецепт: принять первый платёж end-to-end](#рецепт-принять-первый-платёж-end-to-end)
- [Статусы платежей и выплат](#статусы-платежей-и-выплат)
- [Поля webhook payload](#поля-webhook-payload)
- [Идемпотентность и дедуп](#идемпотентность-и-дедуп)
- [Кулинарная книга ошибок](#кулинарная-книга-ошибок)
- [Класс `HeleketClient`](#класс-heleketclient)
- [Полный список опций](#полный-список-опций)
- [`ICommandResponse<T>` — единая форма ответа](#icommandresponset--единая-форма-ответа)
- [Каталог ошибок](#каталог-ошибок)
- [API платежей](#api-платежей)
- [API выплат](#api-выплат)
- [Пагинация и async-итераторы](#пагинация-и-async-итераторы)
- [Верификация вебхуков](#верификация-вебхуков)
- [Ретраи и таймауты](#ретраи-и-таймауты)
- [AbortSignal: отмена запросов](#abortsignal-отмена-запросов)
- [Типизированные enum'ы (Currency / Network / Status / CourseSource / PayoutPriority)](#типизированные-enumы)
- [Работа с command-неймспейсами напрямую](#работа-с-command-неймспейсами-напрямую)
- [Dependency injection — подмена внутренностей](#dependency-injection--подмена-внутренностей)
- [Архитектура](#архитектура)
- [Карта публичных экспортов](#карта-публичных-экспортов)
- [TypeScript](#typescript)
- [Скрипты](#скрипты)
- [Лицензия](#лицензия)

---

## Зачем этот SDK

- **Один клиент, две роли.** Один `HeleketClient` обслуживает и платежи (`PAYMENT_KEY`), и выплаты (`PAYOUT_KEY`).
- **Не бросает на API-ошибках.** Любой публичный метод возвращает `ICommandResponse<T>` с `isSuccess`, `data`, `code`, `message`. Исключения только за программерскими ошибками (ключ не передан, fetch недоступен).
- **Строгая валидация входа, мягкая выхода.** Входы — zod strict, ответы — `.loose()`, новые поля Heleket не ломают SDK.
- **camelCase наружу.** Конверсия snake_case ↔ camelCase инкапсулирована — никаких `order_id`, `is_payment_multiple` в коде потребителя.
- **Встроенная устойчивость.** Экспоненциальные ретраи с джиттером на 5xx, 429 и сетевых ошибках из коробки.
- **Курсорная пагинация через async-итераторы.** `historyAll()` сам обходит страницы.
- **Constant-time верификация вебхуков.** `paymentWebhook` / `payoutWebhook` проверяют MD5-подпись через `timingSafeEqual`.
- **Любую часть можно подменить.** HTTP-клиент, retry-политика, signer, конвертер кейса, парсер envelope — через опции конструктора.
- **Строгий TS.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict` — всё включено.

## vs `heleket/php-sdk`

Тот же wire-протокол, принципиально другая эргономика. PHP SDK — ~150 строк cURL + `throw RequestBuilderException`. Этот SDK — полноценная клиентская библиотека с ретраями, валидацией, верификацией вебхуков, async-итераторами, DI и типами.

|                                   | `heleket/php-sdk` v1.0.0                                                                                                | `heleket-sdk` (этот пакет)                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Совместимость по проводу**      | референс                                                                                                                | идентично (хост, sign, headers, envelope)                                                                                                                                  |
| **Endpoints наружу**              | 9 (7 payment + 2 payout)                                                                                                | **11** (+ `payout.list`, `payout.services`)                                                                                                                                |
| **HTTP-транспорт**                | cURL                                                                                                                    | нативный `fetch` (Node 18+)                                                                                                                                                |
| **Пагинация**                     | `history($page = 1)` — передаёт integer как cursor (за пределами первой страницы не работает; cursor Heleket — это хэш) | `list({cursor: nextCursor})` корректно; плюс `historyAll()` async-итератор                                                                                                 |
| **Верификация вебхуков**          | нет в SDK — пишите сами                                                                                                 | `paymentWebhook.verify()` / `payoutWebhook.verify()`, constant-time `timingSafeEqual`                                                                                      |
| **Ретраи на 5xx / 429 / network** | нет                                                                                                                     | экспоненциальный backoff с джиттером, настраиваемый                                                                                                                        |
| **Таймауты**                      | дефолт cURL (часто ∞)                                                                                                   | 30с по умолчанию, настраиваемый                                                                                                                                            |
| **Отмена**                        | нет                                                                                                                     | `AbortSignal` на каждый запрос, в композиции с внутренним timeout                                                                                                          |
| **Валидация входа**               | нет                                                                                                                     | `zod` strict схема на каждый endpoint                                                                                                                                      |
| **Парсинг ответа**                | сырой associative array                                                                                                 | `zod` loose — forward-compatible с новыми полями Heleket                                                                                                                   |
| **Стиль именования**              | snake_case (Heleket wire) лезет в ваш код                                                                               | camelCase наружу, snake_case на проводе (авто-конверсия)                                                                                                                   |
| **Ошибки**                        | throw `RequestBuilderException` с `getMethod()` и `getErrors()`                                                         | возвращает `ICommandResponse<T>` со стабильными кодами (`V001`/`A001`/`P001`/`N001`/`T001`/`W001`/`U001`), `message`, `errors`, и рекомендованным `httpCode` на каждый код |
| **Типы**                          | нет (PHP 5.6 совместимость)                                                                                             | полный TypeScript, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`                                                                                    |
| **Автокомплит сетей/валют**       | просто `string`                                                                                                         | неймспейсы `Network.Value` / `Currency.Value` — IDE подсказывает известные, любая новая строка тоже принимается (трюк `(string & {})`)                                     |
| **Метаданные endpoint'ов**        | нет                                                                                                                     | константы `REST_API.*` + `endpointDetails` на команду (controller URL, метод, описание) — для OpenAPI/codegen                                                              |
| **Подменяемость внутренностей**   | `final` классы, хардкод URL                                                                                             | каждая зависимость за интерфейсом: `IHttpClient`, `IRetryPolicy`, `ICaseConverter`, `IEnvelopeParser`, `ISigner` — DI через опции конструктора                             |
| **Тесты**                         | нет в репо                                                                                                              | 35 unit-тестов с мок-транспортом, без реальной сети                                                                                                                        |
| **Дистрибуция**                   | n/a (Composer)                                                                                                          | dual ESM + CJS, парные `.d.ts` / `.d.cts`, ноль runtime-зависимостей кроме zod                                                                                             |
| **Строк кода**                    | ~150                                                                                                                    | ~1.7K включая тесты, схемы, типы                                                                                                                                           |

### Бок-о-бок: создать платёж

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

Этот SDK:

```ts
const heleket = new HeleketClient({
  paymentKey: PAYMENT_KEY,
  merchantUuid: MERCHANT_UUID,
});

const res = await heleket.payment.create({
  amount: '16',
  currency: 'USD', // IDE автокомплитит USDT/USDC/...
  orderId: '555123', // camelCase, валидируется
  urlCallback: 'https://example.com/cb',
  lifetime: 7200, // валидируется 300..43200
  toCurrency: 'ETH',
});

if (res.isSuccess && res.data) {
  console.log(res.data.url); // типизировано; автокомплит uuid/status/expiredAt/...
} else {
  console.error(res.code, res.message, res.errors);
}
```

## Установка

```bash
npm install heleket-sdk
# или
pnpm add heleket-sdk
# или
yarn add heleket-sdk
```

Требования: **Node.js 18+** (нативный `fetch` и `AbortSignal.timeout`).

`zod ^4` — runtime-зависимость.

## Получить ключи

Нужны три значения из [мерчантского кабинета Heleket](https://heleket.com):

- **`merchantUuid`** — идентификатор мерчанта (UUID, например `8b03432e-385b-4670-8d06-064591096795`). Одинаков для всех потоков.
- **`paymentKey`** (он же `PAYMENT_API_KEY`) — для **создания инвойсов и чтения платежей**, и для проверки webhook'ов платежей.
- **`payoutKey`** (он же `PAYOUT_API_KEY`) — для **отправки выплат** и проверки webhook'ов выплат. Это **отдельный ключ** от платёжного — храните его аккуратнее, он управляет уходом денег.

Положите их в переменные окружения. **Никогда не коммитьте в git**:

```bash
HELEKET_MERCHANT_UUID=8b03432e-385b-4670-8d06-064591096795
HELEKET_PAYMENT_KEY=...
HELEKET_PAYOUT_KEY=...
```

Передавайте только те ключи, которые реально используете. Только приём платежей? Достаточно `paymentKey`. Только выплаты? Только `payoutKey`. Полноценный маркетплейс? Оба.

## Быстрый старт

### 1. Создать платёж

```ts
import { HeleketClient } from 'heleket-sdk';

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
  console.log('Ссылка на оплату:', res.data.url);
  console.log('UUID инвойса:', res.data.uuid);
} else {
  console.error(res.code, res.message);
}
```

### 2. Создать выплату

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

### 3. Проверить входящий вебхук

```ts
import express from 'express';
import { HeleketClient } from 'heleket-sdk';

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
  // req.body — подтверждённый пейлоад от Heleket
  res.sendStatus(200);
});
```

## Рецепт: принять первый платёж end-to-end

Полный happy path для онлайн-чекаута: клиент жмёт «Оплатить», вы редиректите на Heleket, он платит криптой, Heleket дёргает ваш webhook, вы помечаете заказ оплаченным. Ниже — самодостаточный пример на Express, который покрывает весь поток.

```ts
import express from 'express';
import { HeleketClient } from 'heleket-sdk';

const heleket = new HeleketClient({
  merchantUuid: process.env.HELEKET_MERCHANT_UUID!,
  paymentKey: process.env.HELEKET_PAYMENT_KEY!,
});

const app = express();
app.use(express.json());

// 1. Создаём инвойс когда клиент нажал «Оплатить».
//    Возвращаем hosted Heleket pay URL — редиректим браузер туда.
app.post('/checkout', async (req, res) => {
  const { orderId, amountUsd } = req.body as {
    orderId: string;
    amountUsd: string;
  };

  const created = await heleket.payment.create({
    amount: amountUsd,
    currency: 'USD',
    orderId, // ваш id — используется везде ниже
    urlCallback: 'https://your.app/heleket/webhook',
    urlReturn: 'https://your.app/orders/' + orderId,
    lifetime: 3600, // инвойс живёт 1 час
  });

  if (!created.isSuccess || !created.data) {
    return res
      .status(500)
      .json({ code: created.code, message: created.message });
  }

  // Сохраняем uuid инвойса рядом с заказом — чтобы потом сопоставить.
  await db.orders.update(orderId, {
    invoiceUuid: created.data.uuid,
    status: 'awaiting_payment',
  });

  res.json({ payUrl: created.data.url });
});

// 2. Обработка webhook. Heleket POSTит сюда когда статус инвойса меняется.
//    ПЕРВОЕ дело — проверить подпись. Без неё ничему в req.body доверять нельзя.
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

  // Идемпотентность: один и тот же webhook может прилететь несколько раз.
  // Ищем по order_id, решаем на основе текущего состояния в БД.
  const order = await db.orders.findByOrderId(w.order_id);
  if (!order || order.status === 'paid') {
    return res.sendStatus(200); // уже обработано — ack и забыли
  }

  if (w.status === 'paid' || w.status === 'paid_over') {
    await db.orders.update(w.order_id, {
      status: 'paid',
      paidAmount: w.payment_amount,
      paidCurrency: w.currency,
      txid: w.txid,
    });
    // ... выполнить заказ, уведомить клиента и т.д.
  } else if (
    w.status === 'fail' ||
    w.status === 'cancel' ||
    w.status === 'system_fail'
  ) {
    await db.orders.update(w.order_id, { status: 'failed' });
  }

  // Всегда отвечаем 2xx — иначе Heleket будет ретраить.
  res.sendStatus(200);
});

// 3. (Опционально) Если клиент вернулся по urlReturn раньше чем прилетел webhook —
//    можно один раз дёрнуть info() и обновить состояние, не ожидая webhook.
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

Что этот рецепт делает правильно:

- **Использует ваш `orderId`** как ключ корреляции везде — uuid инвойса от Heleket, ваша БД, payload webhook'а — всё связано одним id.
- **Проверяет подпись webhook'а** до того как поверить хоть одному полю в `req.body`.
- **Идемпотентно**: повторные доставки одного и того же webhook (а Heleket может их слать) не приводят к двойному выполнению.
- **Всегда отвечает 2xx** на webhook — даже когда делать нечего — чтобы Heleket перестал ретраить.
- **`is_final: true`** означает что статус уже не изменится (терминальное состояние). Используйте его, если хотите игнорировать промежуточные апдейты.

## Статусы платежей и выплат

Эти значения вы увидите в `res.data.status` (и в `status` webhook'а). Верифицировано по официальной доке ([статусы платежей](https://doc.heleket.com/ru/methods/payments/payment-statuses), [статусы выплат](https://doc.heleket.com/ru/methods/payouts/payout-statuses)) и выставлено как `PaymentStatus.KNOWN` / `PayoutStatus.KNOWN` с IDE-автокомплитом.

**Статусы платежей / инвойсов (14):**

| Status                 | Что значит (из доки Heleket)                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| `paid`                 | Платёж прошёл успешно, клиент заплатил ровно столько, сколько требовалось |
| `paid_over`            | Платёж прошёл успешно, клиент заплатил **больше**, чем требовалось        |
| `wrong_amount`         | Клиент заплатил **меньше**, чем требовалось                               |
| `wrong_amount_waiting` | Клиент заплатил меньше, **с возможностью дополнительной оплаты**          |
| `process`              | Платёж в процессе обработки                                               |
| `confirm_check`        | Транзакция видна в блокчейне, ждём нужное число подтверждений             |
| `check`                | Ожидание появления транзакции в блокчейне                                 |
| `fail`                 | Ошибка при оплате                                                         |
| `cancel`               | Платёж отменён — клиент не оплатил                                        |
| `system_fail`          | Системная ошибка                                                          |
| `refund_process`       | Возврат средств обрабатывается                                            |
| `refund_fail`          | Во время возврата произошла ошибка                                        |
| `refund_paid`          | Возврат прошёл успешно                                                    |
| `locked`               | Средства заблокированы AML-программой                                     |

**Статусы выплат (6):**

| Status        | Что значит (из доки Heleket) |
| ------------- | ---------------------------- |
| `process`     | Выплата в процессе           |
| `check`       | Выплата проверяется          |
| `paid`        | Выплата прошла успешно       |
| `fail`        | Выплата не удалась           |
| `cancel`      | Выплата отменена             |
| `system_fail` | Системная ошибка             |

> Только **`is_final: true`** — единственный безопасный сигнал чтобы зафиксировать состояние. Всё остальное — in-flight и может ещё измениться.

```ts
import { PaymentStatus, PayoutStatus } from 'heleket-sdk';

// IDE автокомплитит все 14 статусов когда вводишь 'p'..., 'c'..., и т.д.:
if (record.status === 'paid' || record.status === 'paid_over') {
  /* ... */
}

// Итерация по полному списку в runtime:
for (const s of PaymentStatus.KNOWN) {
  /* ... */
}

// Строгий тип параметра:
function handlePaymentStatus(status: PaymentStatus.Value) {
  /* ... */
}
function handleKnownOnly(status: PaymentStatus.Known) {
  /* ... */
}
```

## Поля webhook payload

Когда Heleket POSTит ваш `url_callback`, тело — JSON со следующими полями (проверенные `WebhookVerifier`):

**Payment webhook** (подписан **`paymentKey`**):

| Поле                  | Тип            | Заметка                                             |
| --------------------- | -------------- | --------------------------------------------------- |
| `type`                | string         | `'payment'`                                         |
| `uuid`                | string         | UUID инвойса от Heleket                             |
| `order_id`            | string         | Ваш id (тот же, что передали в `payment.create`)    |
| `amount`              | string         | Сумма инвойса в `currency`                          |
| `payment_amount`      | string         | Сколько фактически заплачено в `payer_currency`     |
| `payment_amount_usd`  | string         | USD-эквивалент платежа                              |
| `merchant_amount`     | string         | Что упало на ваш мерчант-баланс после комиссии      |
| `commission`          | string         | Комиссия Heleket                                    |
| `is_final`            | boolean        | Если true — статус больше не изменится              |
| `status`              | string         | См. таблицу выше                                    |
| `from`                | string \| null | Адрес кошелька плательщика                          |
| `wallet_address_uuid` | string \| null | UUID статического кошелька, если платили в него     |
| `network`             | string         | Сеть, в которой пришёл платёж                       |
| `currency`            | string         | Валюта инвойса                                      |
| `payer_currency`      | string         | Валюта, которой реально заплатили                   |
| `additional_data`     | string \| null | Значение, переданное в `additionalData`             |
| `convert`             | object \| null | Детали конверсии, если использовался `toCurrency`   |
| `txid`                | string \| null | TXID on-chain транзакции после подтверждения        |
| `sign`                | string         | MD5-подпись — проверяется `paymentWebhook.verify()` |

**Payout webhook** (подписан **`payoutKey`**):

| Поле              | Тип            | Заметка                                                     |
| ----------------- | -------------- | ----------------------------------------------------------- |
| `type`            | string         | `'payout'`                                                  |
| `uuid`            | string         | UUID выплаты                                                |
| `order_id`        | string         | Ваш id                                                      |
| `amount`          | string         | Сумма выплаты                                               |
| `merchant_amount` | string         | Сколько списано с вашего баланса                            |
| `commission`      | string         | Комиссия Heleket                                            |
| `is_final`        | boolean        |                                                             |
| `status`          | string         | См. статусы выплат                                          |
| `txid`            | string \| null | TXID on-chain                                               |
| `currency`        | string         |                                                             |
| `network`         | string         |                                                             |
| `payer_currency`  | string         |                                                             |
| `payer_amount`    | string         |                                                             |
| `sign`            | string         | Подписан `payoutKey` — проверяется `payoutWebhook.verify()` |

> **SDK НЕ парсит webhook в zod-схему** — `verify()` возвращает только boolean. Кастуйте `req.body` к нужному вам подмножеству полей; новые поля Heleket пройдут без изменений.

## Идемпотентность и дедуп

Два вектора повторов, с которыми надо считаться в проде:

1. **Heleket повторно доставляет тот же webhook.** Сетевые сбои, ваш 5xx, ручной `payment.resend()` — Heleket может POSTить один и тот же payload несколько раз. Делайте обработчик идемпотентным: ищите запись по `order_id`, смотрите текущее состояние, no-op если уже терминал.

2. **Вы можете создать один и тот же инвойс дважды.** Если ваш `/checkout`-хендлер ретраится (refresh браузера, redrive очереди) — безопасный путь это передавать **тот же `order_id`**:

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
// a.data.uuid === b.data.uuid ?  Зависит от Heleket — по-хорошему ищите заранее:
const existing = await heleket.payment.info({ orderId: 'order-42' });
if (existing.isSuccess) return existing.data!; // переиспользуем
// иначе создаём
```

`order_id` — это ваш idempotency-ключ end-to-end: им вы связываете `payment.info`, payload webhook'а и свою БД.

## Кулинарная книга ошибок

Конкретные рецепты по каждому коду. Все приходят в `res.code` в `ICommandResponse<T>`.

```ts
import { type ErrorCode } from 'heleket-sdk';

// Маленький helper для exhaustive switch — определите его у себя в проекте.
// Если SDK добавит новый ErrorCode и вы забудете его обработать,
// TS подсветит вызов ниже на этапе сборки.
const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${String(value)}`);
};

const res = await heleket.payment.create({ ... });
if (res.isSuccess) {
  return res.data!;
}

// res.code типизирован как `string` для forward-compat; кастуем к ErrorCode
// чтобы получить exhaustive switch — TS подсветит любой код, который вы забыли.
const code = res.code as ErrorCode;

switch (code) {
  case 'V001': // VALIDATION_ERROR — ваш ввод не прошёл zod-схему SDK
    // Программерская ошибка. Не ретраить. Чинить место вызова.
    log.error('Невалидный payload в Heleket', { message: res.message });
    throw new BadRequest(res.message);

  case 'A001': // API_ERROR — Heleket вернул не-успех
    // Смотрите res.message и res.errors. Если это 4xx — ретрай не поможет.
    // 5xx уже ретраил сам SDK; если всё ещё A001 — терминально.
    log.warn('Heleket API отклонил запрос', { message: res.message, errors: res.errors });
    throw new ServiceUnavailable(res.message);

  case 'P001': // PARSE_ERROR — ответ не вписался в ожидаемую форму
    // Скорее всего SDK отстал от Heleket API. Заведите issue. Не ретраить вслепую.
    log.error('Невалидный ответ Heleket', { message: res.message });
    throw new ServiceUnavailable('Upstream response invalid');

  case 'N001': // NETWORK_ERROR — fetch бросил (DNS, conn refused, TLS, ...)
    // SDK уже ретраил по retry-политике. Если сюда дошли — транспорт мёртв.
    log.error('Heleket недоступен', { message: res.message });
    throw new ServiceUnavailable('Платёжный провайдер недоступен');

  case 'T001': // TIMEOUT_ERROR
    // То же самое — уже ретраил. Прокидываем юзеру.
    throw new GatewayTimeout('Heleket timed out');

  case 'W001': // WEBHOOK_INVALID_SIGN — только при провале .verify()
    // Молча дропнуть или 401.
    return res.sendStatus(401);

  case 'U001': // UNKNOWN_ERROR — catch-all
    log.error('Неизвестный сбой Heleket', { code: res.code, message: res.message });
    throw new InternalError();

  default:
    // Compile-time exhaustiveness: если SDK добавит новый ErrorCode и вы
    // не обработали его выше — TS подсветит ошибку на этой строке во время сборки.
    return assertNever(code);
}
```

Совет: читайте также `res.errors` — когда Heleket присылает пер-полевые ошибки валидации, они приходят туда дополнительно к `res.message`.

## Класс `HeleketClient`

`HeleketClient` — это **composition root**. Он создаёт и держит:

- один `IHttpClient` (по умолчанию `FetchHttpClient`),
- одну `IRetryPolicy` (по умолчанию `ExponentialBackoffRetryPolicy`),
- один `ICaseConverter` (по умолчанию `SnakeCaseConverter`),
- один `IEnvelopeParser` (по умолчанию `HeleketEnvelopeParser`),
- один `UrlBuilder`,
- `signerFactory` (по умолчанию `(key) => new Md5Signer(key)`).

Resources (`payment`, `payout`) **создаются лениво** при первом обращении, каждый со своим `CommandExecutor` и `ISigner`, привязанным к соответствующему ключу. Webhook-верификаторы (`paymentWebhook`, `payoutWebhook`) тоже ленивые и используют тот же per-key signer.

Обращение к `.payment` / `.paymentWebhook` без `paymentKey` в конструкторе — бросает `Error`. Это программерская ошибка, не runtime-условие. То же для `.payout` / `.payoutWebhook`.

## Полный список опций

```ts
new HeleketClient({
  // идентификация (обязательно)
  merchantUuid: string,
  paymentKey?:  string,   // нужен для .payment / .paymentWebhook
  payoutKey?:   string,   // нужен для .payout / .payoutWebhook

  // транспорт
  baseUrl?:   string,                       // default 'https://api.heleket.com/v1'
  timeoutMs?: number,                       // default 30_000
  fetch?:     FetchLike,                    // default globalThis.fetch

  // ретраи
  retry?: {
    retries?:     number,                   // default 3
    baseDelayMs?: number,                   // default 250
    maxDelayMs?:  number,                   // default 4_000
    sleep?:       (ms: number) => Promise<void>, // для тестов
    random?:      () => number,             // источник джиттера
  },

  // продвинутый DI — подмена любой зависимости
  httpClient?:     IHttpClient,
  retryPolicy?:    IRetryPolicy,
  caseConverter?:  ICaseConverter,
  envelopeParser?: IEnvelopeParser,
  signerFactory?:  (apiKey: string) => ISigner,
});
```

Нужен хотя бы один из `paymentKey` / `payoutKey`. Иначе конструктор бросит исключение.

## `ICommandResponse<T>` — единая форма ответа

Любой resource-метод возвращает это:

```ts
interface ICommandResponse<T> {
  isSuccess: boolean;
  data?: T;
  code?: string; // код из каталога ERRORS (V001, A001, ...)
  message?: string; // человекочитаемое описание
  errors?: unknown; // серверные пер-полевые ошибки валидации, если Heleket их прислал
}
```

Рекомендованный паттерн с TS-сужением:

```ts
const res = await heleket.payment.info({ uuid });
if (!res.isSuccess || !res.data) {
  return reportError(res.code, res.message, res.errors);
}
res.data.status; // тип уточнён
```

Когда Heleket возвращает пер-полевые ошибки валидации (`{state: 1, errors: {amount: ["must be positive"]}}`), они попадают в `res.errors` без изменений, рядом с суммарным `res.message`. Это эквивалент PHP `RequestBuilderException::getErrors()`.

## Каталог ошибок

Стабильные коды, экспортируются как `ERRORS`:

| Code   | Константа                     | Когда                              | `httpCode` |
| ------ | ----------------------------- | ---------------------------------- | ---------- |
| `V001` | `ERRORS.VALIDATION_ERROR`     | Вход не прошёл zod-схему           | 400        |
| `A001` | `ERRORS.API_ERROR`            | Heleket вернул не-успех            | 502        |
| `P001` | `ERRORS.PARSE_ERROR`          | Не удалось разобрать ответ Heleket | 502        |
| `N001` | `ERRORS.NETWORK_ERROR`        | `fetch` бросил исключение          | 503        |
| `T001` | `ERRORS.TIMEOUT_ERROR`        | Таймаут запроса                    | 504        |
| `W001` | `ERRORS.WEBHOOK_INVALID_SIGN` | Не совпала подпись webhook         | 401        |
| `U001` | `ERRORS.UNKNOWN_ERROR`        | Catch-all                          | 500        |

```ts
import { ERRORS } from 'heleket-sdk';

ERRORS.API_ERROR.code; // 'A001'
ERRORS.API_ERROR.message; // 'Heleket API returned an error'
ERRORS.API_ERROR.httpCode; // 502 — рекомендованный HTTP-код для проксирования клиенту
```

## API платежей

`heleket.payment` — это `PaymentResource`. Все методы принимают опциональный `AbortSignal` последним аргументом.

| Метод                | Описание                                           |
| -------------------- | -------------------------------------------------- |
| `create(input)`      | Создать инвойс                                     |
| `info(input)`        | Получить инвойс по `uuid` или `orderId`            |
| `services()`         | Доступные сети/валюты/лимиты/комиссии для платежей |
| `list(input?)`       | Страница инвойсов (курсорная пагинация)            |
| `historyAll(input?)` | Async-итератор по всем инвойсам                    |
| `resend(input)`      | Принудительно повторить webhook                    |
| `wallet(input)`      | Создать статический депозитный кошелёк             |
| `balance()`          | Баланс merchant + user                             |

### `payment.create(input)`

```ts
const res = await heleket.payment.create({
  amount: '16', // string | number, обязательно
  currency: 'USD', // обязательно, автокомплит из Currency.KNOWN
  orderId: '555123', // обязательно, 1..128 символов
  network: 'ETH', // опционально, автокомплит из Network.KNOWN
  toCurrency: 'ETH', // опционально
  urlCallback: 'https://.../cb', // опционально
  urlReturn: 'https://.../back', // опционально
  urlSuccess: 'https://.../ok', // опционально
  isPaymentMultiple: false, // опционально
  lifetime: 7200, // опционально, 300..43200 секунд (по умолчанию 3600)
  subtract: 0, // опционально, 0..100 % — комиссия с покупателя
  accuracyPaymentPercent: 0, // опционально, 0..5
  additionalData: 'some-tag', // опционально, до 255 символов
  currencies: [{ currency: 'USDT', network: 'TRON' }], // опционально, whitelist
  exceptCurrencies: [{ currency: 'XMR' }], // опционально, blacklist
  courseSource: 'Binance', // опционально: Binance | BinanceP2P | Exmo | Kucoin
  fromReferralCode: '...', // опционально
  discountPercent: 10, // опционально, -99..100
  isRefresh: false, // опционально
  payerEmail: 'payer@example.com', // опционально
});
```

### `payment.info(input)`

```ts
await heleket.payment.info({ uuid: '8b03432e-385b-4670-8d06-064591096795' });
// ИЛИ
await heleket.payment.info({ orderId: '555123' });
```

Если переданы оба — Heleket идентифицирует по `orderId`.

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
  dateFrom: '2025-01-01 00:00:00', // опционально, формат сервера
  dateTo: '2025-12-31 23:59:59',
});

if (page1.isSuccess) {
  console.log(page1.data!.items);
  console.log('следующий курсор:', page1.data!.paginate.nextCursor);
}

// Следующая страница:
const page2 = await heleket.payment.list({
  cursor: page1.data!.paginate.nextCursor!,
});
```

### `payment.resend(input)`

```ts
await heleket.payment.resend({ uuid: '...' });
// ИЛИ
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
  console.log(res.data!.address); // адрес для пополнения
}
```

### `payment.balance()`

```ts
const res = await heleket.payment.balance();
if (res.isSuccess) {
  const merchantEntries = res.data![0]!.balance.merchant; // массив { uuid, balance, currencyCode }
  const userEntries = res.data![0]!.balance.user;
}
```

## API выплат

`heleket.payout` — это `PayoutResource`.

| Метод                | Описание                                 |
| -------------------- | ---------------------------------------- |
| `create(input)`      | Отправить выплату                        |
| `info(input)`        | Получить выплату по `uuid` или `orderId` |
| `services()`         | Сети/валюты для выплат                   |
| `list(input?)`       | Страница выплат                          |
| `historyAll(input?)` | Async-итератор по всем выплатам          |

### `payout.create(input)`

```ts
const res = await heleket.payout.create({
  amount: '15', // string | number
  currency: 'USDT', // автокомплит из Currency.KNOWN
  network: 'TRON', // автокомплит из Network.KNOWN
  orderId: '555321', // 1..100 символов, alpha_dash
  address: 'TXguLRFtrAFrEDA17WuPfrxB84jVzJcNNV',
  isSubtract: true, // boolean по доке (принимает также '0'|'1'|0|1 для wire-совместимости)
  urlCallback: 'https://.../cb', // опционально
  toCurrency: 'USDT', // опционально, нужен если currency — фиат
  fromCurrency: 'USDT', // опционально — допустимо только 'USDT', для автоконверсии
  memo: 'memo-or-tag', // опционально, 1..30 символов (например для TON / XRP)
  courseSource: 'Binance', // опционально: Binance | BinanceP2P | Exmo | Kucoin
  priority: 'recommended', // опционально, только для BTC/ETH/Polygon/BSC:
  //   recommended | economy | high | highest
});
```

### `payout.info(input)`

Аналогично `payment.info`:

```ts
await heleket.payout.info({ uuid: '...' });
await heleket.payout.info({ orderId: '...' });
```

## Пагинация и async-итераторы

`list()` возвращает одну страницу. `historyAll()` сам вызывает `list()` в цикле, идя по `paginate.nextCursor`:

```ts
for await (const tx of heleket.payment.historyAll({
  dateFrom: '2025-01-01 00:00:00',
})) {
  console.log(tx.uuid, tx.status, tx.amount);
}
```

Поведение: итератор **молча останавливается на первой неуспешной странице**, чтобы не усложнять цикл. Если нужна гранулярная обработка ошибок — вызывай `list()` напрямую:

```ts
let cursor: string | undefined;
while (true) {
  const page = await heleket.payment.list({ cursor });
  if (!page.isSuccess || !page.data) {
    console.error('сбой на курсоре', cursor, page.message);
    break;
  }
  process(page.data.items);
  if (!page.data.paginate.hasPages || !page.data.paginate.nextCursor) break;
  cursor = page.data.paginate.nextCursor;
}
```

## Верификация вебхуков

Heleket добавляет к телу каждого webhook поле `sign: <md5>`. `WebhookVerifier` извлекает его, пересчитывает `md5(base64(JSON.stringify(rest)) + apiKey)` и сравнивает в **constant time** через `crypto.timingSafeEqual`.

Два верификатора, по одному на ключ:

```ts
heleket.paymentWebhook.verify(payload); // подписан paymentKey
heleket.payoutWebhook.verify(payload); // подписан payoutKey
```

`verify` принимает либо строку (raw body), либо распарсенный объект:

```ts
// Express (JSON уже распарсен):
app.post('/heleket/webhook', (req, res) => {
  if (!heleket.paymentWebhook.verify(req.body)) {
    return res.sendStatus(401);
  }
  // ... обработка req.body
  res.sendStatus(200);
});

// Raw body (предпочтительнее — порядок ключей совпадает с сервером байт-в-байт):
const ok = heleket.paymentWebhook.verify(rawBodyString);
```

Можно создать `WebhookVerifier` напрямую:

```ts
import { Md5Signer, WebhookVerifier } from 'heleket-sdk';
const verifier = new WebhookVerifier(
  new Md5Signer(process.env.HELEKET_PAYMENT_KEY!),
);
verifier.verify(req.body);
```

## Ретраи и таймауты

По умолчанию каждый запрос ретраится до **3 раз** при:

- сетевой ошибке (fetch бросил),
- таймауте,
- HTTP 5xx,
- HTTP 429.

На 4xx (кроме 429) **не ретраит** — это клиентские ошибки.

Задержка: `min(baseDelayMs * 2^attempt + random() * baseDelayMs, maxDelayMs)`.

Дефолты экспортируются:

```ts
import { RETRY_DEFAULTS, HTTP_DEFAULTS } from 'heleket-sdk';

RETRY_DEFAULTS.RETRIES; // 3
RETRY_DEFAULTS.BASE_DELAY_MS; // 250
RETRY_DEFAULTS.MAX_DELAY_MS; // 4_000
HTTP_DEFAULTS.TIMEOUT_MS; // 30_000
```

Переопределить:

```ts
new HeleketClient({
  ...,
  timeoutMs: 10_000,
  retry: { retries: 5, baseDelayMs: 100, maxDelayMs: 2_000 },
});

// Выключить ретраи:
new HeleketClient({
  ...,
  retry: { retries: 0, baseDelayMs: 1, maxDelayMs: 1 },
});
```

## AbortSignal: отмена запросов

Любой resource-метод принимает опциональный `AbortSignal` последним аргументом:

```ts
const controller = new AbortController();
const promise = heleket.payment.info({ uuid }, controller.signal);

// Отменить откуда угодно:
setTimeout(() => controller.abort(), 1_000);

const res = await promise;
// Если отменено, res.code === 'N001' или 'T001' (что сработало первым).
```

Пользовательский signal комбинируется с внутренним таймаут-signal'ом — побеждает тот, что сработает первым.

## Типизированные enum'ы

Каждое поле Heleket с фиксированным набором значений оформлено как неймспейс с одинаковой структурой — `KNOWN` (readonly массив), `Known` (строгий union), `Value` (loose union с трюком `(string & {})`), `Schema` (zod-схема, которую SDK использует внутри). Все шесть дают **автокомплит в IDE без жёсткой фиксации списка** — если Heleket добавит новое значение раньше чем SDK, любая строка тоже пройдёт.

| Namespace        | Источник                                                                                                                                                              | Значения                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Currency`       | примеры из `/payment/services`                                                                                                                                        | 17 — USDT, USDC, BUSD, DAI, VERSE, CGPT, BTC, ETH, BNB, TRX, LTC, BCH, DASH, DOGE, MATIC, TON, XMR |
| `Network`        | примеры из `/payment/services`                                                                                                                                        | 11 — ETH, TRON, BSC, BTC, LTC, BCH, DASH, DOGE, POLYGON, TON, XMR                                  |
| `PaymentStatus`  | [`/payment-statuses`](https://doc.heleket.com/ru/methods/payments/payment-statuses)                                                                                   | 14 — см. таблицу статусов выше                                                                     |
| `PayoutStatus`   | [`/payout-statuses`](https://doc.heleket.com/ru/methods/payouts/payout-statuses)                                                                                      | 6 — см. таблицу статусов выше                                                                      |
| `CourseSource`   | [`/creating-invoice`](https://doc.heleket.com/ru/methods/payments/creating-invoice), [`/creating-payout`](https://doc.heleket.com/ru/methods/payouts/creating-payout) | 4 — `Binance`, `BinanceP2P`, `Exmo`, `Kucoin`                                                      |
| `PayoutPriority` | [`/creating-payout`](https://doc.heleket.com/ru/methods/payouts/creating-payout)                                                                                      | 4 — `recommended`, `economy`, `high`, `highest` (только BTC, ETH, Polygon, BSC)                    |

Использование одинаковое для всех:

```ts
import {
  Currency,
  Network,
  PaymentStatus,
  PayoutStatus,
  CourseSource,
  PayoutPriority,
} from 'heleket-sdk';

// Runtime — это та же схема, которую SDK применяет к полям запросов:
Currency.Schema.parse('USDT');
Network.Schema.parse('TRON');
PaymentStatus.Schema.parse('paid');

// Типы — автокомплит на известных значениях, fallback на любую строку:
const c: Currency.Value = 'USDT'; // подсказывает USDT, USDC, BUSD, ...
const c2: Currency.Value = 'NEW_COIN'; // тоже принимается
const c3: Currency.Known = 'USDT'; // строго — только известные
const s: PaymentStatus.Value = 'paid';
const p: PayoutPriority.Value = 'recommended';
const cs: CourseSource.Value = 'Binance';

// Снимки (runtime массивы) — удобно для дропдаунов, валидации, exhaustive switch:
Currency.KNOWN; // readonly ['USDT', 'USDC', ...]
PaymentStatus.KNOWN; // readonly ['paid', 'paid_over', ...]
CourseSource.KNOWN; // readonly ['Binance', 'BinanceP2P', 'Exmo', 'Kucoin']
PayoutPriority.KNOWN; // readonly ['recommended', 'economy', 'high', 'highest']
```

> **Живой источник правды для Currency / Network:** дёрните `heleket.payment.services()` или `heleket.payout.services()` — вернут актуальные лимиты и комиссии для каждой сети напрямую из Heleket.

## Работа с command-неймспейсами напрямую

Каждый endpoint — это **command-неймспейс** с `url`, схемами, типами и метаданными. Удобно для: генерации OpenAPI, биндингов TanStack Query, кастомного executor'а.

```ts
import {
  CreatePaymentCommand,
  CreatePaymentRequestBodySchema,
  type ICreatePaymentRequestBody,
  type ICreatePaymentResponse,
} from 'heleket-sdk';

// URL (относительный, без хоста):
CreatePaymentCommand.url; // 'payment'

// zod-схемы:
CreatePaymentCommand.RequestBodySchema;
CreatePaymentCommand.ResponseSchema;

// Метаданные:
CreatePaymentCommand.endpointDetails;
// {
//   CONTROLLER_URL: 'payment',
//   REQUEST_METHOD: 'post',
//   METHOD_DESCRIPTION: 'Create a new payment invoice',
//   METHOD_LONG_DESCRIPTION: '...',
// }

// Валидация вручную:
const parsed = CreatePaymentRequestBodySchema.safeParse({
  amount: '16',
  currency: 'USD',
  orderId: '1',
});
```

Каждый command имеет одинаковую форму:

```ts
namespace XxxCommand {
  const url: string;
  const TSQ_url: string;            // алиас url — удобно для ключей TanStack Query
  const RequestBodySchema: ZodType;
  type IRequestBody;
  const ResponseSchema: ZodType;
  type IResponse;
  const endpointDetails: IEndpointDetails;
  // list-endpoints дополнительно имеют:
  const RequestQuerySchema: ZodType;
  type IRequestQuery;
}
```

Доступные команды:

| Namespace                     | Путь                    |
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

## Dependency injection — подмена внутренностей

Каждая зависимость скрыта за интерфейсом. Реализуй и передай в опции.

### Кастомный HTTP-клиент (логирование, маршрутизация)

```ts
import { FetchHttpClient, HeleketClient, type IHttpClient } from 'heleket-sdk';

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

### Кастомная retry-политика

```ts
import { type IRetryPolicy, RetryOutcomeKind } from 'heleket-sdk';

class NoRetry implements IRetryPolicy {
  async execute<T>(op: () => Promise<T>): Promise<T> {
    return op();
  }
}

new HeleketClient({ ..., retryPolicy: new NoRetry() });
```

### Кастомный signer

```ts
import { type ISigner, HeleketClient } from 'heleket-sdk';

class HmacSigner implements ISigner {
  constructor(private readonly key: string) {}
  sign(body: string): string { /* ваша схема */ return '...'; }
}

new HeleketClient({
  ...,
  signerFactory: (apiKey) => new HmacSigner(apiKey),
});
```

Тот же паттерн для `ICaseConverter` и `IEnvelopeParser`.

## Архитектура

```
HeleketClient (composition root)
   │
   ├── payment           → PaymentResource ─┐
   ├── payout            → PayoutResource   │   у каждого свой CommandExecutor
   ├── paymentWebhook    → WebhookVerifier  │   (привязан к api-ключу через signer)
   └── payoutWebhook     → WebhookVerifier  │
                                            ▼
                                   CommandExecutor.execute()
                                   ├── 1. zod валидация входа
                                   ├── 2. camelCase → snake_case (ICaseConverter)
                                   ├── 3. JSON.stringify body
                                   ├── 4. md5 подпись body        (ISigner)
                                   ├── 5. сборка URL              (UrlBuilder)
                                   ├── 6. POST с ретраями         (IHttpClient + IRetryPolicy)
                                   ├── 7. разбор envelope          (IEnvelopeParser)
                                   ├── 8. snake_case → camelCase   (ICaseConverter)
                                   └── 9. zod валидация ответа (loose)
                                       → ICommandResponse<T>
```

Каждый компонент — один класс с одной ответственностью, за одним интерфейсом.

## Карта публичных экспортов

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
                              PaymentRecord, PayoutRecord, Network, Currency
                              (всё неймспейсами)
    payment/                → CreatePaymentCommand, GetPaymentInfoCommand, ListPaymentsCommand,
                              GetPaymentServicesCommand, ResendPaymentWebhookCommand,
                              CreateStaticWalletCommand, GetBalanceCommand
                              (+ Request/Response схемы и типы на уровне модуля)
    payout/                 → CreatePayoutCommand, GetPayoutInfoCommand, ListPayoutsCommand,
                              GetPayoutServicesCommand
  shared/api/               → BASE_URL, REST_API, getEndpointDetails, HttpMethod,
                              IEndpointDetails, controllers (PAYMENT_ROUTES, PAYOUT_ROUTES, ...)
  constants/                → ERRORS, ErrorKey, ErrorEntry, HEADERS,
                              CONTENT_TYPE_JSON, ACCEPT_JSON
  common/                   → ICommandResponse, Json, sleep, tryParseJson
```

Всё перевыставлено из корня пакета.

## TypeScript

- Сборка ESM (`./dist/index.js`) + CJS (`./dist/index.cjs`) с парными `.d.ts` / `.d.cts`.
- Собрано под `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- `peerDependencies`: `zod ^4`.
- Module resolution: `Bundler`.

## Скрипты

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

## Лицензия

MIT. См. [LICENSE](./LICENSE).
