const hasSupabase = window.SUPABASE_URL && !window.SUPABASE_URL.includes("ضع_") && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("ضع_");
const sb = hasSupabase ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
let currentUser=null, currentProfile=null, page="dashboard";

const titles={dashboard:["لوحة التحكم","نظرة سريعة على النظام"],students:["الطلاب","إدارة بيانات الطلاب والحسابات"],teachers:["المعلمين","إدارة المعلمين والصلاحيات"],groups:["المجموعات","المجموعات ومواعيد الحضور"],attendance:["الحضور","تسجيل ومتابعة الحضور"],exams:["الامتحانات","الدرجات والتقييمات"],messages:["المحادثات","شات الطلاب مع المعلمين"],notifications:["الإشعارات","إرسال التنبيهات"],reports:["التقارير","تقارير الأداء والحضور"],settings:["الإعدادات","إعدادات الحساب والنظام"]};

const navByRole={
admin:[["dashboard","الرئيسية"],["students","الطلاب"],["teachers","المعلمين"],["groups","المجموعات"],["attendance","الحضور"],["exams","الامتحانات"],["messages","المحادثات"],["notifications","الإشعارات"],["reports","التقارير"],["settings","الإعدادات"]],
teacher:[["dashboard","الرئيسية"],["students","طلابي"],["groups","مجموعاتي"],["attendance","الحضور"],["exams","الامتحانات"],["messages","المحادثات"],["notifications","الإشعارات"],["reports","التقارير"],["settings","الإعدادات"]],
student:[["dashboard","الرئيسية"],["attendance","حضوري"],["exams","امتحاناتي"],["messages","المحادثات"],["notifications","الإشعارات"],["reports","تقييمي"],["settings","حسابي"]]
};

async function boot(){
 if(!sb){showLogin(); setLoginMessage("لم يتم ربط Supabase بعد. ضع URL و ANON KEY في assets/config.js."); return;}
 const {data:{session}}=await sb.auth.getSession();
 if(session){currentUser=session.user;await loadProfile();}else showLogin();
 sb.auth.onAuthStateChange(async(_e,session)=>{if(session){currentUser=session.user;await loadProfile()}else showLogin()});
}
async function loadProfile(){
 const {data,error}=await sb.from("profiles").select("*").eq("id",currentUser.id).single();
 if(error){showLogin();setLoginMessage("لم يتم العثور على ملف الحساب. تأكد من إنشاء profile لهذا المستخدم.");return;}
 currentProfile=data;showApp();render();
}
function showLogin(){document.getElementById("loginView").classList.remove("hidden");document.getElementById("app").classList.add("hidden")}
function showApp(){document.getElementById("loginView").classList.add("hidden");document.getElementById("app").classList.remove("hidden");document.getElementById("userName").textContent=currentProfile.full_name||"مستخدم";document.getElementById("roleLabel").textContent=roleArabic(currentProfile.role);document.getElementById("userMeta").textContent=currentProfile.role;document.getElementById("avatar").textContent=(currentProfile.full_name||"م")[0]}
function roleArabic(r){return {admin:"مدير",teacher:"معلم",student:"طالب"}[r]||r}
function setLoginMessage(x){document.getElementById("loginMsg").textContent=x}

document.getElementById("loginForm").addEventListener("submit",async e=>{
 e.preventDefault(); if(!sb){setLoginMessage("اربط Supabase أولًا.");return}
 const id=document.getElementById("loginId").value.trim(), pass=document.getElementById("loginPassword").value;
 // الطالب يدخل بالـID: يتم تحويله إلى email داخلي محفوظ في profiles.
 let email=id;
 const q=await sb.from("profiles").select("email").eq("student_id",id).maybeSingle();
 if(q.data?.email) email=q.data.email;
 const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
 if(error)setLoginMessage("بيانات الدخول غير صحيحة.");
 else{currentUser=data.user;await loadProfile();}
});
document.getElementById("logout").onclick=async()=>{if(sb)await sb.auth.signOut()};

function render(){
 document.getElementById("pageTitle").textContent=titles[page][0];document.getElementById("pageSub").textContent=titles[page][1];
 const nav=document.getElementById("nav");nav.innerHTML=(navByRole[currentProfile.role]||[]).map(x=>`<button class="${x[0]===page?'active':''}" data-page="${x[0]}">${x[1]}</button>`).join("");
 nav.querySelectorAll("button").forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});
 const c=document.getElementById("content");c.innerHTML=pageHTML(page);
 if(page==="students")loadStudents();
}
function pageHTML(p){
 if(p==="dashboard")return dashboardHTML();
 if(p==="students")return `<div class="card"><div class="section-head"><h2>${currentProfile.role==="student"?"بياناتي":"الطلاب"}</h2>${currentProfile.role==="admin"?'<button class="btn" onclick="addStudent()">+ إضافة طالب</button>':""}</div><div class="searchbar"><input id="studentSearch" placeholder="ابحث بالاسم أو ID أو الهاتف..."></div><div class="table-wrap"><table class="table"><thead><tr><th>الطالب</th><th>ID</th><th>الصف</th><th>المجموعة</th><th>الحضور</th><th>النقاط</th><th></th></tr></thead><tbody id="studentBody"><tr><td colspan="7" class="empty">جاري التحميل...</td></tr></tbody></table></div></div>`;
 if(p==="teachers")return `<div class="card"><div class="section-head"><h2>المعلمين</h2><button class="btn" onclick="simpleForm('معلم')">+ إضافة معلم</button></div><div id="teacherList" class="empty">جاري التحميل...</div></div>`;
 if(p==="groups")return `<div class="card"><div class="section-head"><h2>المجموعات</h2><button class="btn" onclick="simpleForm('مجموعة')">+ إضافة مجموعة</button></div><div id="groupList" class="empty">جاري التحميل...</div></div>`;
 if(p==="attendance")return `<div class="card"><div class="section-head"><h2>الحضور</h2><button class="btn" onclick="saveAttendance()">حفظ الحضور</button></div><div class="notice">حصة الحل يمكن ربطها بيوم الأحد أو الثلاثاء أو الخميس للطالب، مع الاحتفاظ بنسبة الحضور تلقائيًا.</div><div id="attendanceList" class="empty">جاري التحميل...</div></div>`;
 if(p==="exams")return `<div class="card"><div class="section-head"><h2>الامتحانات</h2><button class="btn" onclick="simpleForm('امتحان')">+ إضافة امتحان</button></div><div id="examList" class="empty">جاري التحميل...</div></div>`;
 if(p==="messages")return `<div class="grid2"><div class="card"><h2>المحادثات</h2><div id="chatList" class="empty">جاري التحميل...</div></div><div class="card"><h2>المحادثة</h2><div id="chatBox" class="empty">اختر محادثة</div></div></div>`;
 if(p==="notifications")return `<div class="card"><h2>إرسال إشعار</h2><form class="form" onsubmit="sendNotification(event)"><label>المستلم<select id="notifyTo"><option value="">اختر طالبًا</option></select></label><label>العنوان<input id="notifyTitle" required></label><label>الرسالة<textarea id="notifyBody" rows="4" required></textarea></label><button class="btn">إرسال</button></form></div>`;
 if(p==="reports")return `<div class="stats"><div class="card"><span class="kpi">متوسط الحضور</span><strong id="rAttendance">—</strong></div><div class="card"><span class="kpi">متوسط الامتحانات</span><strong id="rExam">—</strong></div><div class="card"><span class="kpi">إجمالي النقاط</span><strong id="rPoints">—</strong></div><div class="card"><span class="kpi">تقييم الشهر</span><strong id="rMonth">—</strong></div></div><div class="card"><h2>نظام النقاط</h2><p>النقاط مبنية على الحضور والامتحانات والتقييم الشهري. يمكن جعل الأوزان قابلة للتعديل من لوحة المدير.</p></div>`;
 if(p==="settings")return `<div class="grid2"><div class="card"><h2>بيانات الحساب</h2><form class="form" onsubmit="saveProfile(event)"><label>الاسم<input id="profileName" value="${esc(currentProfile.full_name||"")}"></label><label>الهاتف<input id="profilePhone" value="${esc(currentProfile.phone||"")}"></label><button class="btn">حفظ البيانات</button></form><button class="btn secondary" style="margin-top:10px" onclick="changePassword()">تغيير كلمة المرور</button></div><div class="card"><h2>الخط</h2><div class="notice">رفع الخط وتطبيقه على الموقع. للحفظ الدائم نستخدم Supabase Storage.</div><div class="form" style="margin-top:12px"><input id="fontFile" type="file" accept=".woff,.woff2,.ttf,.otf"><button class="btn" onclick="applyFont()">تطبيق الخط</button></div></div></div>`;
}
function dashboardHTML(){return `<div class="stats"><div class="card stat"><div><small>${currentProfile.role==="student"?"نسبة حضوري":"إجمالي الطلاب"}</small><strong id="d1">—</strong></div><div class="icon">👥</div></div><div class="card stat"><div><small>متوسط الامتحانات</small><strong id="d2">—</strong></div><div class="icon">📝</div></div><div class="card stat"><div><small>النقاط</small><strong id="d3">—</strong></div><div class="icon">⭐</div></div><div class="card stat"><div><small>الإشعارات</small><strong id="d4">—</strong></div><div class="icon">🔔</div></div></div><div class="card"><div class="section-head"><h2>تقييم الأداء الشهري</h2><span class="badge green">يُحسب تلقائيًا</span></div><p>يتم احتساب التقييم من الحضور + نتائج الامتحانات + التقييم الشهري حسب إعدادات النظام.</p></div>`}

async function loadStudents(){
 const {data,error}=await sb.from("students").select("*,groups(name),profiles(full_name)").order("created_at",{ascending:false});
 const body=document.getElementById("studentBody"); if(error){body.innerHTML=`<tr><td colspan="7" class="error">خطأ: ${esc(error.message)}</td></tr>`;return}
 const arr=currentProfile.role==="student"?data.filter(x=>x.profile_id===currentUser.id):data;
 body.innerHTML=arr.map(s=>`<tr><td><div class="student-row"><span class="mini">${(s.full_name||"?")[0]}</span><b>${esc(s.full_name)}</b></div></td><td>${esc(s.student_id)}</td><td>${esc(s.grade||"")}</td><td>${esc(s.groups?.name||"—")}</td><td>${s.attendance_percent??0}%</td><td><span class="badge orange">${s.points??0}</span></td><td><button class="btn secondary" onclick='studentPDF(${JSON.stringify(s)})'>PDF</button></td></tr>`).join("")||`<tr><td colspan="7" class="empty">لا توجد بيانات</td></tr>`;
 const input=document.getElementById("studentSearch");input.oninput=()=>{const q=input.value.trim();[...body.rows].forEach(r=>r.style.display=r.innerText.includes(q)?"":"none")};
}
async function addStudent(){openModal(`<h2>إضافة طالب</h2><form class="form" onsubmit="createStudent(event)"><div class="form-grid"><label>الاسم<input id="sn" required></label><label>الهاتف<input id="sp" required></label><label>هاتف ولي الأمر<input id="sparent"></label><label>الصف<select id="sg"><option value="first_secondary">الأول الثانوي</option><option value="third_secondary">الثالث الثانوي</option></select></label><label>المجموعة<input id="sgrp"></label><label>رقم الجلوس اختياري<input id="seat"></label></div><div class="notice">يتم إنشاء ID من 6 أرقام تلقائيًا. كلمة المرور الافتراضية = آخر 6 أرقام من هاتف الطالب. الطالب لا يغيّرها؛ المدير فقط يعيد تعيينها.</div><button class="btn">حفظ الطالب</button></form>`)}
async function createStudent(e){e.preventDefault();const phone=document.getElementById("sp").value.trim();const prefix=document.getElementById("sg").value==="first_secondary"?"10":"30";const id=prefix+String(Math.floor(Math.random()*10000)).padStart(4,"0");alert(`تم تجهيز الطالب بالـID ${id}. لإنشاء حساب Auth فعلي للطالب نحتاج Edge Function آمنة من Supabase؛ لا تنشئ المستخدم من المتصفح باستخدام service_role key.`);closeModal();}
async function saveProfile(e){e.preventDefault();const {error}=await sb.from("profiles").update({full_name:document.getElementById("profileName").value,phone:document.getElementById("profilePhone").value}).eq("id",currentUser.id);alert(error?error.message:"تم الحفظ");if(!error){await loadProfile()}}
async function changePassword(){openModal(`<h2>تغيير كلمة المرور</h2><form class="form" onsubmit="doPassword(event)"><input id="newPass" type="password" minlength="8" placeholder="كلمة المرور الجديدة" required><input id="newPass2" type="password" minlength="8" placeholder="تأكيد كلمة المرور" required><button class="btn">تحديث</button></form>`)}
async function doPassword(e){e.preventDefault();if(currentProfile.role==="student"){alert("الطالب لا يستطيع تغيير كلمة المرور.");return}const a=document.getElementById("newPass").value,b=document.getElementById("newPass2").value;if(a!==b)return alert("كلمتا المرور غير متطابقتين");const {error}=await sb.auth.updateUser({password:a});alert(error?.message||"تم تغيير كلمة المرور");if(!error)closeModal()}
async function sendNotification(e){e.preventDefault();alert("سيتم تنفيذ الإرسال بعد إنشاء سياسة الإشعارات في قاعدة البيانات.");}
function simpleForm(t){openModal(`<h2>إضافة ${t}</h2><form class="form"><input placeholder="الاسم" required><textarea placeholder="التفاصيل"></textarea><button class="btn" type="button" onclick="closeModal()">حفظ</button></form>`)}
async function saveAttendance(){alert("سيتم الحفظ بعد ربط شاشة الحضور بجدول attendance.");}
function studentPDF(s){const html=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>بيان الطالب</title><style>body{font-family:Arial;padding:35px}h1{text-align:center}table{width:100%;border-collapse:collapse}td{border:1px solid #ddd;padding:10px}.h{font-weight:bold;background:#f4f5f8}</style><h1>بيان الطالب</h1><p style="text-align:center">EduCenter</p><table>${[['الاسم',s.full_name],['ID',s.student_id],['الصف',s.grade],['الهاتف',s.phone||''],['ولي الأمر',s.parent_phone||''],['نسبة الحضور',(s.attendance_percent??0)+'%'],['النقاط',s.points??0]].map(x=>`<tr><td class="h">${x[0]}</td><td>${x[1]}</td></tr>`).join("")}</table><script>window.print()<\/script></html>`;const w=window.open("","_blank");w.document.write(html);w.document.close()}
function applyFont(){const f=document.getElementById("fontFile").files[0];if(!f)return alert("اختر الخط");const r=new FileReader();r.onload=e=>{const ff=new FontFace("UploadedFont",e.target.result);ff.load().then(x=>{document.fonts.add(x);document.body.style.fontFamily="UploadedFont,Arial";alert("تم تطبيق الخط على الجلسة الحالية.")})};r.readAsArrayBuffer(f)}
function openModal(x){document.getElementById("modalContent").innerHTML=x;document.getElementById("modal").classList.remove("hidden")}function closeModal(){document.getElementById("modal").classList.add("hidden")}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

boot();
