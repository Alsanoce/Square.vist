# Manual bank transfer setup

## Google Sheet

- A tab named `BankTransfers` should exist.
- The Apps Script backend creates the tab and headers automatically if missing.
- Admin confirms payment manually by changing `Status` to `تم الدفع`.

## Apps Script properties

Set these in Apps Script > Project Settings > Script Properties:

```text
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id_or_channel
```

Do not put Telegram secrets in frontend code.

## Apps Script trigger

To enable Telegram notification after admin confirmation:

1. Open Apps Script.
2. Go to Triggers.
3. Add Trigger.
4. Choose function: `handleBankTransferStatusEdit`
5. Event source: From spreadsheet
6. Event type: On edit
7. Authorize the script.

Telegram is sent only when `Status` becomes `تم الدفع`, and only if `Telegram Sent` is not already `YES`.

## Frontend environment variables

Set these in the deployment environment:

```text
VITE_BANK_NAME=اسم المصرف
VITE_BANK_ACCOUNT_NAME=اسم صاحب الحساب
VITE_BANK_ACCOUNT_NUMBER=0000000000
VITE_BANK_IBAN=LY00000000000000000000000
VITE_ADMIN_WHATSAPP=218915100403
```

The WhatsApp number must not include a plus sign.
