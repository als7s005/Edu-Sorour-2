# EduCenter v2

نسخة أولى لتحويل الموقع إلى نظام حقيقي باستخدام Supabase.

## ما تم تجهيزه
- Login باستخدام Supabase Auth.
- أدوار Admin / Teacher / Student.
- قاعدة بيانات للطلاب والمعلمين والمجموعات والحضور والامتحانات والنقاط والتقييمات والإشعارات والشات.
- PDF لبيان الطالب.
- إعدادات الحساب وتغيير كلمة المرور للمعلم والمدير.
- الطالب لا يغير كلمة المرور من الواجهة.
- بنية RLS أساسية.

## التشغيل
1. أنشئ مشروعًا على Supabase.
2. افتح SQL Editor وشغّل `supabase_schema.sql`.
3. من Supabase Project Settings > API انسخ Project URL و anon public key.
4. ضع القيم في `assets/config.js`.
5. ارفع الملفات إلى GitHub مع الحفاظ على:
   `index.html`
   `assets/app.js`
   `assets/style.css`
   `assets/config.js`
6. فعّل GitHub Pages.

## مهم جدًا
لا تضع `service_role` key في `config.js` أو أي ملف Frontend.
إنشاء حسابات الطلاب تلقائيًا بالـID وكلمة المرور الأولية يحتاج Edge Function آمنة في Supabase؛ لا يتم ذلك من JavaScript المنشور على GitHub.

هذه النسخة ليست جاهزة بعد لتخزين بيانات طلاب حقيقية حتى يتم استكمال RLS ووظائف الإدارة وEdge Functions والنسخ الاحتياطي.
