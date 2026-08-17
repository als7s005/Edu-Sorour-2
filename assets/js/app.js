/* =====================================================
   Sarour Center — Supabase Connected App
   ===================================================== */

const SUPABASE_URL = "https://cpoecikmfaroymaxthny.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_m7i0F4QRAHOoYa4vKOyh3Q_i3c5_mOk";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const state = {
  page: "dashboard",
  session: null,
  profile: null,
  student: null,
  groups: [],
  students: [],
  attendance: {},
  selectedAttendanceDate: null
};

const $ = id => document.getElementById(id);
const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function showToast(msg){
  const t=$("toast");
  if(!t) return;
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2500);
}

function cairoNow(){
  return new Date(new Date().toLocaleString("en-US",{timeZone:"Africa/Cairo"}));
}

function dateKey(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function todayText(){
  const d=cairoNow();
  return `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function isAdmin(){
  return ["admin","staff","teacher"].includes(state.profile?.role);
}

function isStudent(){
  return state.profile?.role === "student" && !!state.student;
}

function getGroupsForDate(date){
  return state.groups.filter(g => (g.days_of_week || []).includes(date.getDay()));
}

function normalizeGroup(g){
  return {
    ...g,
    grade: g.grades?.name || "",
    subject: g.subjects?.name || "",
    teacher: g.teachers?.full_name || ""
  };
}

async function loadCurrentUser(){
  const { data: { session } } = await supabaseClient.auth.getSession();
  state.session = session;
  if(!session) return false;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id,full_name,phone,role,active")
    .eq("id", session.user.id)
    .maybeSingle();

  if(profileError) throw profileError;
  if(!profile || profile.active === false) throw new Error("الحساب غير مفعل");

  state.profile = profile;

  const { data: student, error: studentError } = await supabaseClient
    .from("students")
    .select(`
      id,full_name,phone,parent_phone,school,active,total_fee,grade_id,subject_id,auth_user_id,
      grades(id,name,code),
      subjects(id,name,code)
    `)
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if(studentError) throw studentError;
  state.student = student || null;
  return true;
}

async function loadGroups(){
  const { data, error } = await supabaseClient
    .from("groups")
    .select(`
      id,name,grade_id,subject_id,teacher_id,days_of_week,start_time,end_time,active,
      grades(id,name,code),
      subjects(id,name,code),
      teachers(id,full_name)
    `)
    .eq("active", true)
    .order("start_time");

  if(error) throw error;
  state.groups = (data || []).map(normalizeGroup);
}

async function loadAdminStudents(){
  if(!isAdmin()) return;
  const { data, error } = await supabaseClient
    .from("students")
    .select(`
      id,full_name,phone,parent_phone,school,active,total_fee,auth_user_id,
      grades(id,name),
      subjects(id,name),
      group_students(group_id,active,groups(id,name))
    `)
    .eq("active", true)
    .order("full_name");

  if(error) throw error;
  state.students = (data || []).map(s => ({
    ...s,
    name:s.full_name,
    grade:s.grades?.name || "",
    subject:s.subjects?.name || "",
    group:s.group_students?.find(x=>x.active)?.groups?.name || "—"
  }));
}

async function loadStudentGroups(){
  if(!isStudent()) return;
  const { data, error } = await supabaseClient
    .from("group_students")
    .select(`group_id,active,groups(
      id,name,grade_id,subject_id,teacher_id,days_of_week,start_time,end_time,active,
      grades(id,name),subjects(id,name),teachers(id,full_name)
    )`)
    .eq("student_id", state.student.id)
    .eq("active", true);

  if(error) throw error;
  state.groups = (data || []).filter(x=>x.groups).map(x=>normalizeGroup(x.groups));
}

async function loadStudentSolution(){
  if(!isStudent() || state.student.grades?.name !== "ثالثة ثانوي") return [];
  const { data, error } = await supabaseClient
    .from("student_solution_sessions")
    .select(`
      id,active,solution_session_id,
      solution_sessions(id,name,grade_id,subject_id,days_of_week,start_time,end_time,active,grades(name),subjects(name))
    `)
    .eq("student_id", state.student.id)
    .eq("active", true);
  if(error) throw error;
  return (data || []).map(x=>x.solution_sessions).filter(Boolean);
}

function setAppVisible(visible){
  $("loginView").classList.toggle("hidden", visible);
  $("appView").classList.toggle("hidden", !visible);
}

function render(){
  $("todayLabel").textContent=todayText();
  const titles={dashboard:"الرئيسية",students:"الطلاب",groups:"المجموعات",attendance:"الحضور والغياب",solutions:"حصص الحل",payments:"المدفوعات",exams:"الاختبارات والدرجات",reports:"التقارير",settings:"الإعدادات"};
  $("pageTitle").textContent=titles[state.page]||"الرئيسية";
  $("userName").textContent=state.profile?.full_name || "المستخدم";
  document.querySelectorAll(".nav-item").forEach(b=>{
    const page=b.dataset.page;
    const studentAllowed=["dashboard","groups","attendance"];
    const solutionAllowed=isStudent() && state.student?.grades?.name==="ثالثة ثانوي";
    const visible=isAdmin() || studentAllowed.includes(page) || (page==="solutions" && solutionAllowed);
    b.style.display=visible?"block":"none";
    b.classList.toggle("active",b.dataset.page===state.page);
  });

  const pages = isStudent()
    ? {dashboard:studentDashboardPage,groups:studentGroupsPage,attendance:studentAttendancePage,solutions:studentSolutionsPage}
    : {dashboard:dashboardPage,students:studentsPage,groups:groupsPage,attendance:attendancePage,solutions:solutionsPage,payments:paymentsPage,exams:examsPage,reports:reportsPage,settings:settingsPage};

  $("pageContent").innerHTML=(pages[state.page] || pages.dashboard)();
  bindPage();
}

function dashboardPage(){
  const today=getGroupsForDate(cairoNow());
  return `<div class="page-head"><div><h2>مرحبًا ${escapeHtml(state.profile?.full_name || "بك")} 👋</h2><p class="muted">لوحة إدارة سنتر مستر يحيى سرور.</p></div></div>
  <div class="stats">
    <div class="stat"><div class="label">إجمالي الطلاب</div><div class="value">${state.students.length}</div></div>
    <div class="stat"><div class="label">المجموعات</div><div class="value">${state.groups.length}</div></div>
    <div class="stat"><div class="label">مجموعات اليوم</div><div class="value">${today.length}</div></div>
    <div class="stat"><div class="label">الصلاحية</div><div class="value" style="font-size:18px">${escapeHtml(state.profile?.role || "")}</div></div>
  </div>
  <div class="grid">
    <div class="card"><h3>مجموعات اليوم</h3>${today.length?today.map(g=>`<div class="attendance-group"><div><strong>${escapeHtml(g.name)}</strong><div class="muted">${escapeHtml(g.subject)} — ${escapeHtml(g.grade)}</div></div><span class="badge">${formatTime(g.start_time)}</span></div>`).join(""):`<div class="empty">لا توجد مجموعات اليوم.</div>`}</div>
    <div class="card"><h3>آخر الطلاب</h3>${state.students.length?`<div class="table-wrap"><table class="table"><tr><th>الاسم</th><th>الصف</th></tr>${state.students.slice(0,5).map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.grade)}</td></tr>`).join("")}</table></div>`:`<div class="empty">لا يوجد طلاب.</div>`}</div>
  </div>`;
}

function studentDashboardPage(){
  const s=state.student;
  const today=getGroupsForDate(cairoNow());
  return `<div class="page-head"><div><h2>أهلًا بك، ${escapeHtml(s.full_name)} 👋</h2><p class="muted">بياناتك الدراسية ومواعيد حصصك.</p></div></div>
  <div class="stats">
    <div class="stat"><div class="label">الصف</div><div class="value" style="font-size:18px">${escapeHtml(s.grades?.name || "—")}</div></div>
    <div class="stat"><div class="label">المادة</div><div class="value" style="font-size:18px">${escapeHtml(s.subjects?.name || "—")}</div></div>
    <div class="stat"><div class="label">مجموعات اليوم</div><div class="value">${today.length}</div></div>
    <div class="stat"><div class="label">رقم الهاتف</div><div class="value" style="font-size:16px">${escapeHtml(s.phone)}</div></div>
  </div>
  <div class="card"><h3>مجموعات اليوم</h3>${today.length?today.map(g=>`<div class="attendance-group"><div><strong>${escapeHtml(g.name)}</strong><div class="muted">${escapeHtml(g.subject)} — ${escapeHtml(g.grade)}</div></div><span class="badge">${formatTime(g.start_time)}</span></div>`).join(""):`<div class="empty">لا توجد حصة لك اليوم.</div>`}</div>`;
}

function studentGroupsPage(){
  return `<div class="page-head"><div><h2>مجموعاتي</h2><p class="muted">المجموعات المسجل بها حسابك فقط.</p></div></div><div class="card"><div class="table-wrap"><table class="table"><tr><th>المجموعة</th><th>الصف</th><th>المادة</th><th>الأيام</th><th>الوقت</th></tr>${state.groups.length?state.groups.map(g=>`<tr><td>${escapeHtml(g.name)}</td><td>${escapeHtml(g.grade)}</td><td>${escapeHtml(g.subject)}</td><td>${(g.days_of_week||[]).map(d=>dayNames[d]).join(" / ")}</td><td>${formatTime(g.start_time)}</td></tr>`).join(""):"<tr><td colspan='5' class='empty'>لا توجد مجموعات.</td></tr>"}</table></div></div>`;
}

function studentsPage(){
  return `<div class="page-head"><div><h2>الطلاب</h2><p class="muted">إدارة بيانات الطلاب من Supabase.</p></div><button class="primary" id="addStudent">+ إضافة طالب</button></div>
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>الصف</th><th>المجموعة</th><th>حصة الحل</th></tr></thead><tbody>
  ${state.students.length?state.students.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.phone)}</td><td>${escapeHtml(s.grade)}</td><td>${escapeHtml(s.group)}</td><td>${s.grade==="ثالثة ثانوي"?"متاحة حسب الربط":"—"}</td></tr>`).join(""):`<tr><td colspan="5" class="empty">لا يوجد طلاب.</td></tr>`}</tbody></table></div></div>`;
}

function groupsPage(){
  return `<div class="page-head"><div><h2>المجموعات</h2><p class="muted">المواعيد من قاعدة بيانات Supabase.</p></div></div>
  <div class="card"><div class="table-wrap"><table class="table"><tr><th>المجموعة</th><th>الصف</th><th>المادة</th><th>الأيام</th><th>الوقت</th></tr>
  ${state.groups.map(g=>`<tr><td>${escapeHtml(g.name)}</td><td>${escapeHtml(g.grade)}</td><td>${escapeHtml(g.subject)}</td><td>${(g.days_of_week||[]).map(d=>dayNames[d]).join(" / ")}</td><td>${formatTime(g.start_time)}</td></tr>`).join("")}</table></div></div>`;
}

function attendancePage(){
  const d=cairoNow(), groups=getGroupsForDate(d);
  return attendanceListPage(d,groups,true);
}

function studentAttendancePage(){
  const d=cairoNow(), groups=getGroupsForDate(d);
  return attendanceListPage(d,groups,false);
}

function attendanceListPage(date,groups,adminMode){
  return `<div class="page-head"><div><h2>الحضور والغياب</h2><p class="muted">اليوم: ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} — ${dayNames[date.getDay()]}</p></div>${adminMode?'<button class="secondary" id="pastDay">📅 استعادة يوم سابق</button>':''}</div>
  <div class="card"><h3>${adminMode?'مجموعات اليوم':'حصصك اليوم'}</h3>${groups.length?groups.map(g=>`<div class="attendance-group"><div><strong>${escapeHtml(g.name)}</strong><div class="muted">${escapeHtml(g.subject)} — ${escapeHtml(g.grade)}</div></div><button class="primary open-att" data-id="${g.id}">فتح الحضور</button></div>`).join(""):`<div class="empty">لا توجد مجموعات في هذا اليوم.</div>`}</div>
  <div id="attendanceModal"></div>`;
}

async function openAttendance(date, groupId){
  const group=state.groups.find(g=>g.id===groupId);
  if(!group) return;
  if(!isAdmin()) return;

  const { data: memberships, error: membershipError } = await supabaseClient
    .from("group_students")
    .select("student_id,students(id,full_name,phone,active)")
    .eq("group_id", groupId)
    .eq("active", true);
  if(membershipError){showToast(membershipError.message);return;}

  const students=(memberships||[]).map(x=>x.students).filter(Boolean).filter(s=>s.active);
  const key=dateKey(date);
  const { data: existing, error }=await supabaseClient
    .from("attendance")
    .select("student_id,status")
    .eq("group_id",groupId)
    .eq("attendance_date",key);
  if(error){showToast(error.message);return;}

  const records={};
  (existing||[]).forEach(r=>records[r.student_id]=r.status);

  $("attendanceModal").innerHTML=`<div class="card" style="margin-top:18px"><div class="page-head"><div><h3>${escapeHtml(group.name)}</h3><span class="muted">${dayNames[date.getDay()]} — ${key}</span></div><button class="secondary" id="closeAttendance">إغلاق</button></div>
  ${students.length?students.map(s=>`<div class="attendance-group"><strong>${escapeHtml(s.full_name)}</strong><div><button class="status-btn ${records[s.id]==="present"?"selected":""}" data-student="${s.id}" data-status="present">حاضر</button><button class="status-btn ${records[s.id]==="absent"?"selected":""}" data-student="${s.id}" data-status="absent">غائب</button><button class="status-btn ${records[s.id]==="late"?"selected":""}" data-student="${s.id}" data-status="late">متأخر</button></div></div>`).join(""):`<div class="empty">لا يوجد طلاب في هذه المجموعة.</div>`}
  <button class="primary" id="saveAttendance">حفظ الحضور</button></div>`;

  let temp={...records};
  document.querySelectorAll(".status-btn").forEach(btn=>btn.onclick=()=>{
    temp[btn.dataset.student]=btn.dataset.status;
    document.querySelectorAll(`[data-student="${btn.dataset.student}"]`).forEach(x=>x.classList.toggle("selected",x.dataset.status===btn.dataset.status));
  });

  $("saveAttendance").onclick=async()=>{
    const rows=Object.entries(temp).map(([student_id,status])=>({
      student_id,
      group_id:groupId,
      attendance_date:key,
      status,
      recorded_by:state.session.user.id
    }));
    if(!rows.length){showToast("لم يتم اختيار حضور لأي طالب");return;}
    const {error: upsertError}=await supabaseClient.from("attendance").upsert(rows,{onConflict:"student_id,group_id,attendance_date"});
    if(upsertError){showToast(upsertError.message);return;}
    showToast("تم حفظ الحضور بنجاح");
    $("attendanceModal").innerHTML="";
  };
  $("closeAttendance").onclick=()=>$("attendanceModal").innerHTML="";
}

async function studentOpenAttendance(date,groupId){
  const group=state.groups.find(g=>g.id===groupId);
  if(!group || !state.student) return;
  const key=dateKey(date);
  const {data,error}=await supabaseClient.from("attendance").select("status").eq("student_id",state.student.id).eq("group_id",groupId).eq("attendance_date",key).maybeSingle();
  if(error){showToast(error.message);return;}
  const status=data?.status;
  $("attendanceModal").innerHTML=`<div class="card" style="margin-top:18px"><h3>${escapeHtml(group.name)}</h3><p class="muted">${key}</p><div class="attendance-group"><strong>حالتك</strong><span class="badge">${statusLabel(status)}</span></div></div>`;
}

async function studentSolutions(){
  try{return await loadStudentSolution();}catch(e){showToast(e.message);return [];}
}

function solutionsPage(){
  return `<div class="page-head"><div><h2>حصص الحل</h2><p class="muted">إدارة حصص الحل — متاحة للصف الثالث الثانوي فقط.</p></div></div>
  <div class="card"><div class="empty">استخدم إضافة الطالب وربطه بحصة الحل من قاعدة البيانات. سيتم عرض الحصص المرتبطة بالطالب في حسابه.</div></div>`;
}

function studentSolutionsPage(){
  return `<div class="page-head"><div><h2>حصص الحل</h2><p class="muted">هذه الصفحة تظهر للصف الثالث الثانوي فقط.</p></div></div><div id="solutionsBox" class="card"><div class="empty">جاري تحميل حصص الحل...</div></div>`;
}

function paymentsPage(){return simplePage("المدفوعات","إدارة الاشتراكات والمدفوعات والمتبقيات.");}
function examsPage(){return simplePage("الاختبارات والدرجات","إنشاء الاختبارات وإدخال درجات الطلاب.");}
function reportsPage(){return simplePage("التقارير","تقارير الطلاب والحضور والمدفوعات والدرجات.");}
function settingsPage(){return simplePage("الإعدادات","إعدادات النظام والمستخدمين والصلاحيات.");}
function simplePage(title,desc){return `<div class="page-head"><div><h2>${title}</h2><p class="muted">${desc}</p></div></div><div class="card"><div class="empty">هذه الشاشة ستتوسع في المرحلة التالية.</div></div>`;}

function addStudentForm(){
  $("pageContent").innerHTML=`<div class="page-head"><div><h2>إضافة طالب</h2><p class="muted">أدخل بيانات الطالب. حصة الحل تظهر للثالثة فقط.</p></div><button class="secondary" id="backStudents">رجوع</button></div>
  <div class="card"><form id="studentForm" class="form-grid">
  <div><label>اسم الطالب</label><input id="sName" required></div>
  <div><label>رقم الهاتف</label><input id="sPhone" inputmode="numeric" maxlength="11" required></div>
  <div><label>رقم ولي الأمر</label><input id="sParent"></div>
  <div><label>المدرسة</label><input id="sSchool"></div>
  <div><label>الصف الدراسي</label><select id="sGrade" required><option value="">اختر الصف</option><option value="أولى ثانوي">أولى ثانوي</option><option value="ثانية ثانوي">ثانية ثانوي</option><option value="ثالثة ثانوي">ثالثة ثانوي</option></select></div>
  <div><label>المجموعة</label><select id="sGroup"><option value="">اختر المجموعة</option></select></div>
  <div id="solutionField" class="full" style="display:none"><label>حصة الحل — ثالثة ثانوي فقط</label><select id="sSolution"><option value="">اختر حصة الحل</option></select></div>
  <div class="full"><button class="primary" type="submit">حفظ الطالب</button></div>
  </form></div>`;

  const grade=$("sGrade"), group=$("sGroup"), solution=$("solutionField");
  async function refreshGroups(){
    group.innerHTML='<option value="">اختر المجموعة</option>'+state.groups.filter(g=>g.grade===grade.value).map(g=>`<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");
  }
  async function refreshSolutions(){
    const box=$("sSolution");
    box.innerHTML='<option value="">اختر حصة الحل</option>';
    if(grade.value!=="ثالثة ثانوي") return;
    const {data,error}=await supabaseClient.from("solution_sessions").select("id,name,start_time,end_time").eq("active",true).order("start_time");
    if(error){showToast(error.message);return;}
    (data||[]).forEach(x=>box.innerHTML+=`<option value="${x.id}">${escapeHtml(x.name)} — ${formatTime(x.start_time)}</option>`);
  }
  grade.onchange=async()=>{await refreshGroups();solution.style.display=grade.value==="ثالثة ثانوي"?"block":"none";if(grade.value!=="ثالثة ثانوي")$("sSolution").value="";else await refreshSolutions();};
  refreshGroups();
  $("backStudents").onclick=()=>render();
  $("studentForm").onsubmit=async e=>{
    e.preventDefault();
    const phone=$("sPhone").value.trim();
    if(!/^01\d{9}$/.test(phone)){showToast("رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01");return;}
    const {data:gradeRow,error:gradeError}=await supabaseClient.from("grades").select("id,name").eq("name",grade.value).single();
    if(gradeError){showToast(gradeError.message);return;}
    const {data:subjectRow,error:subjectError}=await supabaseClient.from("subjects").select("id,name").eq("name",grade.value==="أولى ثانوي"?"علوم متكاملة":"أحياء").single();
    if(subjectError){showToast(subjectError.message);return;}
    const {data:student,error}=await supabaseClient.from("students").insert({full_name:$("sName").value.trim(),phone,parent_phone:$("sParent").value.trim()||null,school:$("sSchool").value.trim()||null,grade_id:gradeRow.id,subject_id:subjectRow.id,active:true}).select("id").single();
    if(error){showToast(error.message);return;}
    const groupId=Number(group.value)||null;
    if(groupId){
      const {error:e1}=await supabaseClient.from("group_students").insert({student_id:student.id,group_id:groupId,active:true});
      if(e1){showToast(e1.message);return;}
    }
    if(grade.value==="ثالثة ثانوي" && $("sSolution").value){
      const {error:e2}=await supabaseClient.from("student_solution_sessions").insert({student_id:student.id,solution_session_id:$('sSolution').value,active:true});
      if(e2){showToast(e2.message);return;}
    }
    showToast("تمت إضافة الطالب بنجاح");
    await loadAdminStudents();
    render();
  };
}

function bindPage(){
  const add=$("addStudent"); if(add)add.onclick=addStudentForm;
  document.querySelectorAll(".open-att").forEach(b=>b.onclick=()=>{
    const d=state.selectedAttendanceDate||cairoNow();
    if(isAdmin()) openAttendance(d,Number(b.dataset.id)); else studentOpenAttendance(d,Number(b.dataset.id));
  });

  const past=$("pastDay");
  if(past)past.onclick=async()=>{
    const val=prompt("اكتب التاريخ بصيغة YYYY-MM-DD");
    if(!val)return;
    const d=new Date(val+"T12:00:00");
    if(isNaN(d)){showToast("التاريخ غير صحيح");return;}
    state.selectedAttendanceDate=d;
    const groups=getGroupsForDate(d);
    $("pageContent").innerHTML=`<div class="page-head"><div><h2>حضور يوم ${dayNames[d.getDay()]}</h2><p class="muted">${val} — مجموعات هذا اليوم فقط.</p></div><button class="secondary" id="backToday">العودة لليوم الحالي</button></div><div class="card"><h3>المجموعات</h3>${groups.length?groups.map(g=>`<div class="attendance-group"><div><strong>${escapeHtml(g.name)}</strong><div class="muted">${escapeHtml(g.subject)} — ${escapeHtml(g.grade)}</div></div><button class="primary old-att" data-id="${g.id}">فتح الحضور</button></div>`).join(""):`<div class="empty">لا توجد مجموعات في هذا اليوم.</div>`}<div id="attendanceModal"></div></div>`;
    $("backToday").onclick=()=>{state.selectedAttendanceDate=null;render();};
    document.querySelectorAll(".old-att").forEach(b=>b.onclick=()=>openAttendance(d,Number(b.dataset.id)));
  };

  if(state.page==="solutions" && isStudent()){
    studentSolutions().then(solutions=>{
      const box=$("solutionsBox");
      if(!box)return;
      if(state.student.grades?.name!=="ثالثة ثانوي"){
        box.innerHTML='<div class="empty">حصة الحل متاحة للصف الثالث الثانوي فقط.</div>';
        return;
      }
      box.innerHTML=solutions.length?solutions.map(x=>`<div class="attendance-group"><div><strong>${escapeHtml(x.name)}</strong><div class="muted">${escapeHtml(x.grades?.name||"ثالثة ثانوي")} — ${escapeHtml(x.subjects?.name||"أحياء")}</div></div><span class="badge">${formatTime(x.start_time)}${x.end_time?` - ${formatTime(x.end_time)}`:""}</span></div>`).join(""):'<div class="empty">لا توجد حصة حل مرتبطة بحسابك حاليًا.</div>';
    });
  }
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
}

function formatTime(t){
  if(!t)return "—";
  const [h,m]=String(t).split(":").map(Number);
  if(Number.isNaN(h))return t;
  const suffix=h>=12?"م":"ص";
  const hh=(h%12)||12;
  return `${hh}:${String(m||0).padStart(2,"0")} ${suffix}`;
}

function statusLabel(status){
  return status==="present"?"حاضر":status==="absent"?"غائب":status==="late"?"متأخر":"غير مسجل";
}

async function login(){
  const phone=$("loginPhone").value.trim();
  const password=$("loginPassword").value;
  if(!/^01\d{9}$/.test(phone)){showToast("اكتب رقم هاتف مصري صحيح من 11 رقمًا");return;}
  if(!password){showToast("اكتب كلمة المرور");return;}

  const {data:loginEmail,error:lookupError}=await supabaseClient.rpc("get_login_email",{p_phone:phone});
  if(lookupError){console.error(lookupError);showToast("تعذر العثور على الحساب");return;}
  if(!loginEmail){showToast("رقم الهاتف غير مسجل");return;}

  const {data,error}=await supabaseClient.auth.signInWithPassword({email:loginEmail,password});
  if(error){showToast("بيانات الدخول غير صحيحة");return;}

  state.session=data.session;
  try{
    await loadCurrentUser();
    await loadGroups();
    if(isAdmin()) await loadAdminStudents();
    else await loadStudentGroups();
    state.page="dashboard";
    setAppVisible(true);
    render();
  }catch(e){
    console.error(e);
    await supabaseClient.auth.signOut();
    setAppVisible(false);
    showToast(e.message || "حدث خطأ أثناء تحميل الحساب");
  }
}

async function logout(){
  await supabaseClient.auth.signOut();
  state.session=null;state.profile=null;state.student=null;state.groups=[];state.students=[];
  setAppVisible(false);
  $("loginForm").reset();
}

async function boot(){
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{
    if(isStudent() && !["dashboard","groups","attendance","solutions"].includes(b.dataset.page))return;
    state.page=b.dataset.page;
    state.selectedAttendanceDate=null;
    render();
  }));

  $("togglePassword").onclick=()=>{
    $("loginPassword").type=$("loginPassword").type==="password"?"text":"password";
    $("togglePassword").textContent=$("loginPassword").type==="password"?"إظهار":"إخفاء";
  };

  $("loginForm").onsubmit=e=>{e.preventDefault();login();};
  $("logoutBtn").onclick=logout;
  $("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");

  try{
    if(await loadCurrentUser()){
      await loadGroups();
      if(isAdmin()) await loadAdminStudents(); else await loadStudentGroups();
      setAppVisible(true);
      render();
    }else setAppVisible(false);
  }catch(e){
    console.error(e);
    await supabaseClient.auth.signOut();
    setAppVisible(false);
  }
}

boot();
