# رفع ملفات مراقبة الترافيك إلى GitHub

الريبو: `Alsanoce/Square.vist`

## الملفات الجاهزة

انسخ محتوى هذا المجلد إلى جذر الريبو:

```text
package.json
netlify.toml
netlify/functions/traffic-alert.ts
netlify/edge-functions/count-traffic.ts
```

## من GitHub UI

1. افتح الريبو: `https://github.com/Alsanoce/Square.vist`
2. ارفع أو عدل `package.json` و`netlify.toml` بالمحتوى الموجود هنا.
3. أنشئ المجلدات:
   - `netlify/functions`
   - `netlify/edge-functions`
4. ارفع:
   - `netlify/functions/traffic-alert.ts`
   - `netlify/edge-functions/count-traffic.ts`
5. Commit على `main`.

## بعد الرفع

Netlify سيعمل deploy تلقائي للموقع. بعد اكتمال deploy، افتح:

```text
https://saniah.ly/.netlify/functions/traffic-alert?dryRun=1
```

لو رجع JSON فيه `ok: true`، المراقبة شغالة.

## ملاحظة أمان

لا ترفع `TELEGRAM_BOT_TOKEN` إلى GitHub. تم ضبطه في Netlify كـ secret، والأفضل تبدله من `@BotFather` لاحقاً لأن التوكن ظهر في المحادثة.
