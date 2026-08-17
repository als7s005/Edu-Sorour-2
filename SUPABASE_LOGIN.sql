-- تشغيل مرة واحدة في Supabase SQL Editor
-- يتيح للموقع تحويل رقم الهاتف إلى بريد حساب Auth ثم تسجيل الدخول بكلمة المرور.
-- لا يعيد كلمة المرور ولا أي بيانات حساسة.

create or replace function public.get_login_email(p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  where u.id = (
    select s.auth_user_id
    from public.students s
    where s.phone = p_phone
      and s.active = true
      and s.auth_user_id is not null
    limit 1
  )
  or u.id = (
    select p.id
    from public.profiles p
    where p.phone = p_phone
      and p.active = true
      and p.id is not null
    limit 1
  )
  limit 1;
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;
