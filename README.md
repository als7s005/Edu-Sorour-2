# EduCenter — Edu Sorour

نظام إدارة الطلاب يعمل كواجهة Static Web App مع Supabase.

## تشغيل محلي
يمكن فتح `index.html` مباشرة، لكن الأفضل استخدام Local Server أثناء التطوير.

## النشر على Vercel
1. ارفع المشروع إلى GitHub.
2. في Vercel اختر **Import Project** ثم مستودع GitHub.
3. المشروع Static ولا يحتاج Build Command.
4. اترك **Output Directory** فارغًا.
5. اضغط Deploy.

## Supabase
قبل الاستخدام، افتح Supabase SQL Editor وشغّل ملف:

`supabase_schema.sql`

الملف مصمم ليعمل على مشروع جديد، كما يحتوي على ترقية للمخطط القديم الذي كان يستخدم `group_id` فقط ويحتاج `solution_group_id` وحقول مواعيد المجموعات.

ملف `assets/config.js` يحتوي فقط على Project URL وPublishable/Anon key. لا تضع أبدًا `service_role` أو Secret key في الواجهة.

## ملاحظة مهمة عن إنشاء الطلاب
واجهة إنشاء الطالب تعتمد على Edge Function باسم:

`create-student`

لأن إنشاء مستخدم في Supabase Auth من المتصفح باستخدام service role غير آمن. إذا لم تكن Edge Function موجودة في مشروع Supabase، تسجيل الدخول والموقع الأساسي سيعملان، لكن إنشاء حسابات الطلاب من زر الإضافة يحتاج إنشاء/نشر هذه الوظيفة.
