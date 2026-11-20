# «وصّل Vercel»: تجهيز لمرة وحدة

بخطوة «متجرك» بأول إعداد المتجر، كبسة «وصّل Vercel» بتفتح صفحة Vercel نفسها: صاحب المتجر بيفوت، بيختار الحساب أو الفريق، وبيوافق. بعدها Vercel بيرجّعه، وسيرفره بياخد من Vercel توكن قصير العمر، بيعمل فيه المتجر، وبيرميه. ولا حدا بينسخ توكن، وولا شي بينحفظ.

حتى تشتغل هالكبسة، لازم تعمل **Integration** بحسابك على Vercel، مرة وحدة بس، وتحط تفاصيلها بمتغيرات السيرفر. لحد ما تعملها، الخطوة بتضل تطلب لصق توكن متل قبل.

## 1. اعمل الـ Integration على Vercel

بـ vercel.com افتح **Integrations Console** واكبس **Create**:

| الخانة | شو بتحط |
| --- | --- |
| Name | مثلاً `Estabrek Shops` |
| URL Slug | مثلاً `estabrek-shops` (هاد اللي بيروح بـ `VERCEL_INTEGRATION`) |
| Redirect URL | `https://estabrek-store-production.up.railway.app/v1/vercel/callback` (عنوان سيرفرك الرئيسي، وبعده `/v1/vercel/callback`) |
| API Scopes | Projects: **Read/Write**، Deployments: **Read/Write**، Project Environment Variables: **Read/Write** |
| Issue Only Short-Lived Access Tokens | شغّلها |

ممكن Vercel يطلب كمان وصف قصير ولوغو وعنوان موقع. حط أي شي مناسب: الـ Integration ما بتنعرض بالسوق إلا إذا بعتّها للمراجعة.

بعد ما تنحفظ، انسخ **Client ID** و **Client Secret**.

## 2. حطهم بمتغيرات السيرفر الرئيسي (Railway)

| المتغير | القيمة |
| --- | --- |
| `VERCEL_INTEGRATION` | الـ slug، مثلاً `estabrek-shops` |
| `VERCEL_CLIENT_ID` | الـ Client ID |
| `VERCEL_CLIENT_SECRET` | الـ Client Secret |
| `VERCEL_REDIRECT_URI` | نفس الـ Redirect URL تبع خطوة 1، حرف بحرف |

## 3. لكل نسخة زبون بدها الكبسة

Vercel بيرجّع الكل لعنوان واحد، اللي هو سيرفرك الرئيسي، وهو بيبعت كل صاحب متجر لسيرفر نسخته. فسيرفر النسخة كمان لازم يعرف الـ Integration: حط **نفس المتغيرات الأربعة** عليه (نفس `VERCEL_REDIRECT_URI`، يعني عنوان سيرفرك الرئيسي).

سيرفرات النسخ اللي على Railway (`*.up.railway.app`) مقبولة لحالها. إذا نسخة إلها دومين تاني، زيده بمتغير `VERCEL_FORWARD_HOSTS` على السيرفر الرئيسي، مثلاً `api.client.com` أو `*.client.com`.

## كيف بتشتغل (للتفاصيل)

1. «وصّل Vercel» ← `POST /v1/admin/settings/shop/connect`. السيرفر بيعمل كود لمرة وحدة (بينحفظ منه الـ hash بس، لمدة نص ساعة)، وبيرجّع رابط `https://vercel.com/integrations/<slug>/new?state=…`.
2. Vercel بيرجّع على `…/v1/vercel/callback?code&state&teamId`. إذا الـ state لسيرفر تاني، السيرفر الرئيسي بيبعت المتصفح لعنده.
3. سيرفر النسخة بيبدّل الـ `code` بتوكن (`POST https://api.vercel.com/v2/oauth/access_token`)، وبيعمل المتجر بنفس خطوات «اعمل المتجر»، وبيرجّع صاحب المتجر على `/setup?shop=made`، أو `?shop=failed` والسبب بيبيّن بالخطوة.
4. التوكن ما بينحفظ أبداً، والكود بيشتغل مرة وحدة.
