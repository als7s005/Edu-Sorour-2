// =====================================================
// EduCenter - App.js
// =====================================================

const hasSupabase =
  window.SUPABASE_URL &&
  !window.SUPABASE_URL.includes("ضع_") &&
  window.SUPABASE_ANON_KEY &&
  !window.SUPABASE_ANON_KEY.includes("ضع_");

const sb = hasSupabase
  ? window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    )
  : null;

let currentUser = null;
let currentProfile = null;
let page = "dashboard";


// =====================================================
// الصفحات
// =====================================================

const titles = {
  dashboard: ["لوحة التحكم", "نظرة سريعة على النظام"],
  students: ["الطلاب", "إدارة بيانات الطلاب والحسابات"],
  teachers: ["المعلمين", "إدارة المعلمين والصلاحيات"],
  groups: ["المجموعات", "المجموعات ومواعيد الحضور"],
  attendance: ["الحضور", "تسجيل ومتابعة الحضور"],
  exams: ["الامتحانات", "الدرجات والتقييمات"],
  messages: ["المحادثات", "شات الطلاب مع المعلمين"],
  notifications: ["الإشعارات", "إرسال التنبيهات"],
  reports: ["التقارير", "تقارير الأداء والحضور"],
  settings: ["الإعدادات", "إعدادات الحساب والنظام"]
};


// =====================================================
// الصلاحيات
// =====================================================

const navByRole = {

  admin: [
    ["dashboard", "الرئيسية"],
    ["students", "الطلاب"],
    ["teachers", "المعلمين"],
    ["groups", "المجموعات"],
    ["attendance", "الحضور"],
    ["exams", "الامتحانات"],
    ["messages", "المحادثات"],
    ["notifications", "الإشعارات"],
    ["reports", "التقارير"],
    ["settings", "الإعدادات"]
  ],

  teacher: [
    ["dashboard", "الرئيسية"],
    ["students", "طلابي"],
    ["groups", "مجموعاتي"],
    ["attendance", "الحضور"],
    ["exams", "الامتحانات"],
    ["messages", "المحادثات"],
    ["notifications", "الإشعارات"],
    ["reports", "التقارير"],
    ["settings", "الإعدادات"]
  ],

  student: [
    ["dashboard", "الرئيسية"],
    ["attendance", "حضوري"],
    ["exams", "امتحاناتي"],
    ["messages", "المحادثات"],
    ["notifications", "الإشعارات"],
    ["reports", "تقييمي"],
    ["settings", "حسابي"]
  ]

};


// =====================================================
// تشغيل الموقع
// =====================================================

async function boot() {

  if (!sb) {

    showLogin();

    setLoginMessage(
      "لم يتم ربط Supabase بعد. تأكد من ملف config.js"
    );

    return;
  }

  const {
    data: { session }
  } = await sb.auth.getSession();

  if (session) {

    currentUser = session.user;

    await loadProfile();

  } else {

    showLogin();

  }

  sb.auth.onAuthStateChange(
    async (_event, session) => {

      if (session) {

        currentUser = session.user;

        await loadProfile();

      } else {

        currentUser = null;
        currentProfile = null;

        showLogin();

      }

    }
  );
}


// =====================================================
// تحميل بيانات المستخدم
// =====================================================

async function loadProfile() {

  if (!currentUser) {

    showLogin();

    return;
  }

  const {
    data,
    error
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !data) {

    console.error(error);

    showLogin();

    setLoginMessage(
      "لم يتم العثور على ملف الحساب."
    );

    return;
  }

  currentProfile = data;

  showApp();

  render();
}


// =====================================================
// تسجيل الدخول
// =====================================================

function showLogin() {

  document
    .getElementById("loginView")
    ?.classList.remove("hidden");

  document
    .getElementById("app")
    ?.classList.add("hidden");
}


function showApp() {

  document
    .getElementById("loginView")
    ?.classList.add("hidden");

  document
    .getElementById("app")
    ?.classList.remove("hidden");

  const name =
    currentProfile?.full_name || "مستخدم";

  const userName =
    document.getElementById("userName");

  if (userName)
    userName.textContent = name;

  const roleLabel =
    document.getElementById("roleLabel");

  if (roleLabel)
    roleLabel.textContent =
      roleArabic(currentProfile.role);

  const userMeta =
    document.getElementById("userMeta");

  if (userMeta)
    userMeta.textContent =
      currentProfile.role;

  const avatar =
    document.getElementById("avatar");

  if (avatar)
    avatar.textContent =
      name[0] || "م";
}


function roleArabic(role) {

  return {

    admin: "مدير",
    teacher: "معلم",
    student: "طالب"

  }[role] || role;
}


function setLoginMessage(message) {

  const el =
    document.getElementById("loginMsg");

  if (el)
    el.textContent = message;
}


// =====================================================
// تسجيل الدخول
// =====================================================

const loginForm =
  document.getElementById("loginForm");

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      if (!sb) {

        setLoginMessage(
          "اربط Supabase أولًا."
        );

        return;
      }

      const id =
        document
          .getElementById("loginId")
          .value
          .trim();

      const pass =
        document
          .getElementById("loginPassword")
          .value;

      let email = id;

      const {
        data: studentData
      } = await sb
        .from("profiles")
        .select("email")
        .eq("student_id", id)
        .maybeSingle();

      if (studentData?.email)
        email = studentData.email;

      const {
        data,
        error
      } =
        await sb.auth.signInWithPassword({

          email,
          password: pass

        });

      if (error) {

        console.error(error);

        setLoginMessage(
          "بيانات الدخول غير صحيحة."
        );

        return;
      }

      currentUser = data.user;

      await loadProfile();

    }
  );
}


// =====================================================
// تسجيل الخروج
// =====================================================

const logoutBtn =
  document.getElementById("logout");

if (logoutBtn) {

  logoutBtn.onclick =
    async () => {

      if (sb)
        await sb.auth.signOut();

    };
}


// =====================================================
// Render
// =====================================================

function render() {

  document
    .getElementById("pageTitle")
    .textContent =
      titles[page]?.[0] || "";

  document
    .getElementById("pageSub")
    .textContent =
      titles[page]?.[1] || "";

  const nav =
    document.getElementById("nav");

  if (!nav)
    return;

  nav.innerHTML =
    (navByRole[currentProfile.role] || [])
      .map(
        item => `

          <button
            class="${item[0] === page ? "active" : ""}"
            data-page="${item[0]}"
          >
            ${item[1]}
          </button>

        `
      )
      .join("");

  nav
    .querySelectorAll("button")
    .forEach(button => {

      button.onclick = () => {

        page =
          button.dataset.page;

        render();

      };

    });

  const content =
    document.getElementById("content");

  content.innerHTML =
    pageHTML(page);

  if (page === "students")
    loadStudents();

  if (page === "groups")
    loadGroups();

  if (page === "attendance")
    loadAttendance();

  if (page === "reports")
    loadReports();

}


// =====================================================
// صفحات الموقع
// =====================================================

function pageHTML(p) {

  // ===================================================
  // Dashboard
  // ===================================================

  if (p === "dashboard")
    return dashboardHTML();


  // ===================================================
  // الطلاب
  // ===================================================

  if (p === "students") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>
            ${
              currentProfile.role === "student"
                ? "بياناتي"
                : "الطلاب"
            }
          </h2>

          ${
            currentProfile.role === "admin"
              ? `

                <button
                  class="btn"
                  onclick="addStudent()"
                >
                  + إضافة طالب
                </button>

              `
              : ""
          }

        </div>


        <div class="searchbar">

          <input
            id="studentSearch"
            placeholder="ابحث بالاسم أو ID أو الهاتف..."
          >

        </div>


        <div class="table-wrap">

          <table class="table">

            <thead>

              <tr>

                <th>الطالب</th>
                <th>ID</th>
                <th>الصف</th>
                <th>المجموعة</th>
                <th>مجموعة الحل</th>
                <th>الحضور</th>
                <th>النقاط</th>
                <th></th>

              </tr>

            </thead>

            <tbody id="studentBody">

              <tr>

                <td
                  colspan="8"
                  class="empty"
                >
                  جاري التحميل...
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    `;
  }


  // ===================================================
  // المعلمين
  // ===================================================

  if (p === "teachers") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>المعلمين</h2>

          <button
            class="btn"
            onclick="simpleForm('معلم')"
          >
            + إضافة معلم
          </button>

        </div>

        <div
          id="teacherList"
          class="empty"
        >
          جاري التحميل...
        </div>

      </div>

    `;
  }


  // ===================================================
  // المجموعات
  // ===================================================

  if (p === "groups") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>المجموعات</h2>

          ${
            currentProfile.role === "admin"
              ? `

                <button
                  class="btn"
                  onclick="addGroup()"
                >
                  + إضافة مجموعة
                </button>

              `
              : ""
          }

        </div>


        <div
          id="groupList"
          class="empty"
        >
          جاري التحميل...
        </div>

      </div>

    `;
  }


  // ===================================================
  // الحضور
  // ===================================================

  if (p === "attendance") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>الحضور</h2>

        </div>


        <div class="notice">

          يتم تسجيل الحضور حسب أيام المجموعة
          ومجموعة الحل.

        </div>


        <div
          id="attendanceList"
          class="empty"
        >
          جاري التحميل...
        </div>

      </div>

    `;
  }


  // ===================================================
  // الامتحانات
  // ===================================================

  if (p === "exams") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>الامتحانات</h2>

          ${
            currentProfile.role !== "student"
              ? `

                <button
                  class="btn"
                  onclick="simpleForm('امتحان')"
                >
                  + إضافة امتحان
                </button>

              `
              : ""
          }

        </div>


        <div
          id="examList"
          class="empty"
        >
          جاري التحميل...
        </div>

      </div>

    `;
  }


  // ===================================================
  // المحادثات
  // ===================================================

  if (p === "messages") {

    return `

      <div class="grid2">

        <div class="card">

          <h2>المحادثات</h2>

          <div
            id="chatList"
            class="empty"
          >
            جاري التحميل...
          </div>

        </div>


        <div class="card">

          <h2>المحادثة</h2>

          <div
            id="chatBox"
            class="empty"
          >
            اختر محادثة
          </div>

        </div>

      </div>

    `;
  }


  // ===================================================
  // الإشعارات
  // ===================================================

  if (p === "notifications") {

    return `

      <div class="card">

        <h2>إرسال إشعار</h2>

        <form
          class="form"
          onsubmit="sendNotification(event)"
        >

          <label>

            المستلم

            <select id="notifyTo">

              <option value="">
                اختر طالبًا
              </option>

            </select>

          </label>


          <label>

            العنوان

            <input
              id="notifyTitle"
              required
            >

          </label>


          <label>

            الرسالة

            <textarea
              id="notifyBody"
              rows="4"
              required
            ></textarea>

          </label>


          <button class="btn">
            إرسال
          </button>

        </form>

      </div>

    `;
  }


  // ===================================================
  // التقارير
  // ===================================================

  if (p === "reports") {

    return `

      <div class="stats">

        <div class="card">

          <span class="kpi">
            متوسط الحضور
          </span>

          <strong id="rAttendance">
            —
          </strong>

        </div>


        <div class="card">

          <span class="kpi">
            متوسط الامتحانات
          </span>

          <strong id="rExam">
            —
          </strong>

        </div>


        <div class="card">

          <span class="kpi">
            إجمالي النقاط
          </span>

          <strong id="rPoints">
            —
          </strong>

        </div>


        <div class="card">

          <span class="kpi">
            تقييم الشهر
          </span>

          <strong id="rMonth">
            —
          </strong>

        </div>

      </div>


      <div class="card">

        <h2>
          سجل تغيير المجموعات
        </h2>

        <div
          id="groupHistory"
          class="empty"
        >
          جاري التحميل...
        </div>

      </div>

    `;
  }


  // ===================================================
  // الإعدادات
  // ===================================================

  if (p === "settings") {

    return `

      <div class="grid2">

        <div class="card">

          <h2>بيانات الحساب</h2>


          <form
            class="form"
            onsubmit="saveProfile(event)"
          >

            <label>

              الاسم

              <input
                id="profileName"
                value="${esc(
                  currentProfile.full_name || ""
                )}"
              >

            </label>


            <label>

              الهاتف

              <input
                id="profilePhone"
                value="${esc(
                  currentProfile.phone || ""
                )}"
              >

            </label>


            <button class="btn">
              حفظ البيانات
            </button>

          </form>


          <button
            class="btn secondary"
            style="margin-top:10px"
            onclick="changePassword()"
          >
            تغيير كلمة المرور
          </button>

        </div>

      </div>

    `;
  }

  return "";
}


// =====================================================
// Dashboard
// =====================================================

function dashboardHTML() {

  return `

    <div class="stats">

      <div class="card stat">

        <div>

          <small>

            ${
              currentProfile.role === "student"
                ? "نسبة حضوري"
                : "إجمالي الطلاب"
            }

          </small>

          <strong id="d1">
            —
          </strong>

        </div>

        <div class="icon">
          👥
        </div>

      </div>


      <div class="card stat">

        <div>

          <small>
            متوسط الامتحانات
          </small>

          <strong id="d2">
            —
          </strong>

        </div>

        <div class="icon">
          📝
        </div>

      </div>


      <div class="card stat">

        <div>

          <small>
            النقاط
          </small>

          <strong id="d3">
            —
          </strong>

        </div>

        <div class="icon">
          ⭐
        </div>

      </div>


      <div class="card stat">

        <div>

          <small>
            الإشعارات
          </small>

          <strong id="d4">
            —
          </strong>

        </div>

        <div class="icon">
          🔔
        </div>

      </div>

    </div>


    <div class="card">

      <div class="section-head">

        <h2>
          تقييم الأداء الشهري
        </h2>

        <span class="badge green">
          يُحسب تلقائيًا
        </span>

      </div>

      <p>
        يتم احتساب التقييم من الحضور
        ونتائج الامتحانات والتقييم الشهري.
      </p>

    </div>

  `;
}


// =====================================================
// تحميل الطلاب
// =====================================================

async function loadStudents() {

  if (!sb)
    return;

  let query =
    sb
      .from("students")
      .select(`
        *,
        groups(name,grade,day_1,day_2,start_time,end_time),
        profiles(full_name)
      `)
      .order(
        "created_at",
        { ascending: false }
      );

  const {
    data,
    error
  } = await query;

  const body =
    document.getElementById("studentBody");

  if (!body)
    return;

  if (error) {

    console.error(error);

    body.innerHTML = `

      <tr>

        <td
          colspan="8"
          class="error"
        >
          خطأ: ${esc(error.message)}
        </td>

      </tr>

    `;

    return;
  }

  let arr =
    data || [];

  if (
    currentProfile.role === "student"
  ) {

    arr =
      arr.filter(
        student =>
          student.profile_id === currentUser.id
      );

  }

  body.innerHTML =
    arr.map(
      student => `

        <tr>

          <td>

            <div class="student-row">

              <span class="mini">

                ${
                  (student.full_name || "?")[0]
                }

              </span>

              <b>
                ${esc(student.full_name)}
              </b>

            </div>

          </td>


          <td>
            ${esc(student.student_id)}
          </td>


          <td>
            ${esc(student.grade || "")}
          </td>


          <td>

            ${
              esc(
                student.groups?.name ||
                (
                  student.groups
                    ? `${student.groups.day_1 || ""} + ${student.groups.day_2 || ""}`
                    : "—"
                )
              )
            }

          </td>


          <td>
            ${esc(student.solution_day || "—")}
          </td>


          <td>
            ${student.attendance_percent ?? 0}%
          </td>


          <td>

            <span class="badge orange">
              ${student.points ?? 0}
            </span>

          </td>


          <td>

            <button
              class="btn secondary"
              onclick='studentPDF(${JSON.stringify(student)})'
            >
              تقرير
            </button>

            ${
              currentProfile.role === "student"
                ? `

                  <button
                    class="btn secondary"
                    onclick="requestGroupChange('${student.id}')"
                  >
                    طلب نقل
                  </button>

                `
                : ""
            }

          </td>

        </tr>

      `
    )
    .join("")
    ||
    `

      <tr>

        <td
          colspan="8"
          class="empty"
        >
          لا توجد بيانات
        </td>

      </tr>

    `;


  const input =
    document.getElementById(
      "studentSearch"
    );

  if (input) {

    input.oninput = () => {

      const q =
        input.value
          .trim()
          .toLowerCase();

      [
        ...body.rows
      ].forEach(row => {

        row.style.display =
          row.innerText
            .toLowerCase()
            .includes(q)
              ? ""
              : "none";

      });

    };

  }

}


// =====================================================
// إضافة طالب
// =====================================================

async function addStudent() {

  const groups =
    await getRegularGroups();

  openModal(`

    <h2>
      إضافة طالب جديد
    </h2>


    <form
      class="form"
      onsubmit="createStudent(event)"
    >

      <div class="form-grid">


        <label>

          الاسم

          <input
            id="sn"
            required
          >

        </label>


        <label>

          هاتف الطالب

          <input
            id="sp"
            required
            inputmode="numeric"
            placeholder="01012345678"
          >

        </label>


        <label>

          هاتف ولي الأمر

          <input
            id="sparent"
          >

        </label>


        <label>

          الصف

          <select
            id="sg"
            required
            onchange="filterStudentGroups()"
          >

            <option value="">
              اختر الصف
            </option>

            <option value="first_secondary">
              الأول الثانوي
            </option>

            <option value="third_secondary">
              الثالث الثانوي
            </option>

          </select>

        </label>


        <label>

          المجموعة الأساسية
          <span style="color:red">*</span>

          <select
            id="sgrp"
            required
          >

            <option value="">
              اختر الصف أولًا
            </option>

            ${groups.map(
              group => `

                <option
                  value="${esc(group.id)}"
                  data-grade="${esc(group.grade || "")}"
                >

                  ${esc(
                    group.name ||
                    groupName(group)
                  )}

                </option>

              `
            ).join("")}

          </select>

        </label>


        <label>

          مجموعة الحل
          <span style="color:red">*</span>

          <select
            id="solutionGroup"
            required
            onchange="loadSolutionDays()"
          >

            <option value="">
              اختر مجموعة الحل
            </option>

          </select>

        </label>


        <label>

          يوم الحل
          <span style="color:red">*</span>

          <select
            id="solutionDay"
            required
          >

            <option value="">
              اختر اليوم
            </option>

          </select>

        </label>


        <label>

          رقم الجلوس

          <input
            id="seat"
          >

        </label>


      </div>


      <div class="notice">

        <strong>
          تنبيه:
        </strong>

        لا يمكن إنشاء الطالب بدون
        مجموعة أساسية ومجموعة حل.

        <br><br>

        كلمة المرور الافتراضية =
        آخر 6 أرقام من هاتف الطالب.

      </div>


      <button
        class="btn"
        type="submit"
      >

        حفظ الطالب

      </button>

    </form>

  `);

}


// =====================================================
// تحميل مجموعات الطالب
// =====================================================

async function getRegularGroups() {

  const {
    data,
    error
  } =
    await sb
      .from("groups")
      .select("*")
      .eq("active", true)
      .eq("group_type", "regular")
      .order("grade")
      .order("day_1");

  if (error) {

    console.error(error);

    return [];

  }

  return data || [];
}


// =====================================================
// مجموعات الحل
// =====================================================

async function getSolutionGroups() {

  const {
    data,
    error
  } =
    await sb
      .from("groups")
      .select("*")
      .eq("active", true)
      .eq("group_type", "solution")
      .eq("grade", "third_secondary")
      .order("day_1");

  if (error) {

    console.error(error);

    return [];

  }

  return data || [];
}


// =====================================================
// فلترة المجموعات حسب الصف
// =====================================================

function filterStudentGroups() {

  const grade =
    document.getElementById("sg")?.value;

  const select =
    document.getElementById("sgrp");

  if (!select)
    return;

  [
    ...select.options
  ].forEach(option => {

    if (!option.value)
      return;

    option.hidden =
      option.dataset.grade !== grade;

  });

  select.value = "";

  loadSolutionGroupsForStudent();

}


// =====================================================
// تحميل مجموعة الحل
// =====================================================

async function loadSolutionGroupsForStudent() {

  const select =
    document.getElementById("solutionGroup");

  if (!select)
    return;

  select.innerHTML = `

    <option value="">
      جاري التحميل...
    </option>

  `;

  const groups =
    await getSolutionGroups();

  const grade =
    document.getElementById("sg")?.value;

  if (grade !== "third_secondary") {

    select.innerHTML = `

      <option value="">
        مجموعة الحل للثالث الثانوي فقط
      </option>

    `;

    return;
  }

  select.innerHTML = `

    <option value="">
      اختر مجموعة الحل
    </option>

    ${
      groups.map(
        group => `

          <option value="${esc(group.id)}">

            ${esc(
              group.name ||
              groupName(group)
            )}

          </option>

        `
      ).join("")
    }

  `;

}


// =====================================================
// تحميل أيام الحل
// =====================================================

async function loadSolutionDays() {

  const groupId =
    document.getElementById(
      "solutionGroup"
    )?.value;

  const daySelect =
    document.getElementById(
      "solutionDay"
    );

  if (!daySelect)
    return;

  daySelect.innerHTML = `

    <option value="">
      اختر اليوم
    </option>

  `;

  if (!groupId)
    return;

  const {
    data: group
  } =
    await sb
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

  if (!group)
    return;

  const days =
    [
      group.day_1,
      group.day_2
    ].filter(Boolean);

  days.forEach(day => {

    const option =
      document.createElement("option");

    option.value = day;
    option.textContent = day;

    daySelect.appendChild(option);

  });

}


// =====================================================
// إنشاء الطالب
// =====================================================

async function createStudent(e) {

  e.preventDefault();

  if (!sb || !currentUser) {

    alert(
      "يجب تسجيل الدخول أولًا."
    );

    return;

  }


  const fullName =
    document
      .getElementById("sn")
      .value
      .trim();

  const phone =
    document
      .getElementById("sp")
      .value
      .trim();

  const parentPhone =
    document
      .getElementById("sparent")
      .value
      .trim();

  const grade =
    document
      .getElementById("sg")
      .value;

  const groupId =
    document
      .getElementById("sgrp")
      .value;

  const solutionGroupId =
    document
      .getElementById("solutionGroup")
      .value;

  const solutionDay =
    document
      .getElementById("solutionDay")
      .value;

  const seatNumber =
    document
      .getElementById("seat")
      .value
      .trim();


  // ===================================================
  // تحقق أساسي
  // ===================================================

  if (!fullName) {

    alert("اكتب اسم الطالب.");

    return;
  }


  if (!phone) {

    alert(
      "اكتب رقم هاتف الطالب."
    );

    return;
  }


  if (!grade) {

    alert(
      "اختر الصف."
    );

    return;
  }


  if (!groupId) {

    alert(
      "يجب اختيار المجموعة الأساسية."
    );

    return;
  }


  if (!solutionGroupId) {

    alert(
      "يجب اختيار مجموعة الحل."
    );

    return;
  }


  if (!solutionDay) {

    alert(
      "يجب اختيار يوم مجموعة الحل."
    );

    return;
  }


  if (
    grade !== "third_secondary"
  ) {

    alert(
      "مجموعة الحل متاحة للصف الثالث الثانوي فقط."
    );

    return;
  }


  // ===================================================
  // منع تكرار الهاتف قبل إرسال الطلب
  // ===================================================

  const {
    data: duplicate
  } =
    await sb
      .from("students")
      .select("id,full_name,student_id")
      .eq("phone", phone)
      .maybeSingle();

  if (duplicate) {

    alert(
      `رقم الهاتف مستخدم بالفعل مع الطالب: ${duplicate.full_name} - ID: ${duplicate.student_id}`
    );

    return;
  }


  // ===================================================
  // الجلسة
  // ===================================================

  const {
    data: sessionData,
    error: sessionError
  } =
    await sb.auth.getSession();


  if (
    sessionError ||
    !sessionData.session
  ) {

    alert(
      "انتهت جلسة تسجيل الدخول."
    );

    return;
  }


  const form =
    e.target;

  const button =
    form.querySelector(
      'button[type="submit"]'
    );

  const oldText =
    button
      ? button.textContent
      : "";


  if (button) {

    button.disabled = true;

    button.textContent =
      "جاري إنشاء الطالب...";

  }


  try {

    const response =
      await fetch(
        `${window.SUPABASE_URL}/functions/v1/create-student`,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${sessionData.session.access_token}`,

            "apikey":
              window.SUPABASE_ANON_KEY

          },

          body: JSON.stringify({

            full_name:
              fullName,

            phone:
              phone,

            parent_phone:
              parentPhone,

            grade:
              grade,

            group_id:
              groupId,

            solution_group_id:
              solutionGroupId,

            solution_day:
              solutionDay,

            seat_number:
              seatNumber

          })

        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result.success
    ) {

      throw new Error(
        result.error ||
        "حدث خطأ أثناء إنشاء الطالب."
      );

    }


    const student =
      result.student;


    closeModal();


    openModal(`

      <div style="text-align:center">

        <h2>
          ✅ تم إنشاء الطالب بنجاح
        </h2>


        <div
          class="notice"
          style="margin:20px 0"
        >

          <p>

            <strong>
              اسم الطالب:
            </strong>

            ${esc(student.name)}

          </p>


          <p>

            <strong>
              ID الطالب:
            </strong>

            ${esc(student.student_id)}

          </p>


          <p>

            <strong>
              كلمة المرور:
            </strong>

            ${esc(student.password)}

          </p>


          <p>

            <strong>
              المجموعة:
            </strong>

            ${esc(student.group_name || "—")}

          </p>


          <p>

            <strong>
              مجموعة الحل:
            </strong>

            ${esc(student.solution_day || "—")}

          </p>

        </div>


        <p
          style="
            color:#718096;
            font-size:13px
          "
        >

          احتفظ بالـID وكلمة المرور
          لإعطائهما للطالب.

        </p>


        <button
          class="btn"
          onclick="closeModal();loadStudents()"
        >

          تم

        </button>

      </div>

    `);


  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "حدث خطأ أثناء إنشاء الطالب."
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        oldText;

    }

  }

}


// =====================================================
// المجموعات
// =====================================================

async function loadGroups() {

  const container =
    document.getElementById(
      "groupList"
    );

  if (!container)
    return;

  const {
    data,
    error
  } =
    await sb
      .from("groups")
      .select("*")
      .eq("active", true)
      .order("grade")
      .order("day_1");

  if (error) {

    container.innerHTML =
      `<div class="error">
        ${esc(error.message)}
      </div>`;

    return;
  }

  if (!data?.length) {

    container.innerHTML =
      "لا توجد مجموعات حاليًا.";

    return;
  }


  container.innerHTML =
    data.map(
      group => `

        <div
          class="card"
          style="margin-bottom:12px"
        >

          <div class="section-head">

            <div>

              <h3>
                ${esc(
                  group.name ||
                  groupName(group)
                )}
              </h3>

              <small>

                ${gradeArabic(group.grade)}

              </small>

            </div>

            <span class="badge green">

              ${
                group.group_type === "solution"
                  ? "مجموعة حل"
                  : "مجموعة أساسية"
              }

            </span>

          </div>


          <p>

            الأيام:

            <strong>
              ${esc(group.day_1 || "")}
              ${
                group.day_2
                  ? " + " + esc(group.day_2)
                  : ""
              }
            }

          </p>


          <p>

            الموعد:

            <strong>

              ${formatTime(group.start_time)}

              -

              ${formatTime(group.end_time)}

            </strong>

          </p>


          <p>

            المدة:

            ${group.duration_minutes || 60}
            دقيقة

          </p>

        </div>

      `
    )
    .join("");

}


// =====================================================
// إضافة مجموعة
// =====================================================

function addGroup() {

  openModal(`

    <h2>
      إضافة مجموعة
    </h2>


    <form
      class="form"
      onsubmit="createGroup(event)"
    >


      <label>

        الصف

        <select
          id="groupGrade"
          required
        >

          <option value="">
            اختر الصف
          </option>

          <option value="first_secondary">
            الأول الثانوي
          </option>

          <option value="third_secondary">
            الثالث الثانوي
          </option>

        </select>

      </label>


      <label>

        نوع المجموعة

        <select
          id="groupType"
          required
          onchange="groupTypeChanged()"
        >

          <option value="regular">
            مجموعة أساسية
          </option>

          <option value="solution">
            مجموعة حل
          </option>

        </select>

      </label>


      <label>

        اليوم الأول

        <select
          id="groupDay1"
          required
        >

          <option value="">
            اختر اليوم
          </option>

          <option value="السبت">
            السبت
          </option>

          <option value="الأحد">
            الأحد
          </option>

          <option value="الاثنين">
            الاثنين
          </option>

          <option value="الثلاثاء">
            الثلاثاء
          </option>

          <option value="الأربعاء">
            الأربعاء
          </option>

          <option value="الخميس">
            الخميس
          </option>

        </select>

      </label>


      <label id="day2Wrap">

        اليوم الثاني

        <select
          id="groupDay2"
          required
        >

          <option value="">
            اختر اليوم
          </option>

          <option value="السبت">
            السبت
          </option>

          <option value="الأحد">
            الأحد
          </option>

          <option value="الاثنين">
            الاثنين
          </option>

          <option value="الثلاثاء">
            الثلاثاء
          </option>

          <option value="الأربعاء">
            الأربعاء
          </option>

          <option value="الخميس">
            الخميس
          </option>

        </select>

      </label>


      <label>

        وقت البداية

        <select
          id="groupStart"
          required
          onchange="calculateEndTime()"
        >

          ${timeOptions()}

        </select>

      </label>


      <label>

        وقت النهاية

        <input
          id="groupEnd"
          readonly
          value="—"
        >

      </label>


      <div class="notice">

        مدة المجموعة الأساسية:
        <strong>60 دقيقة</strong>

        <br><br>

        مجموعة الحل:
        من <strong>10:00</strong>
        إلى <strong>12:00</strong>

      </div>


      <button
        class="btn"
        type="submit"
      >

        إنشاء المجموعة

      </button>


    </form>

  `);

  calculateEndTime();

}


// =====================================================
// تغيير نوع المجموعة
// =====================================================

function groupTypeChanged() {

  const type =
    document.getElementById(
      "groupType"
    )?.value;

  const day2Wrap =
    document.getElementById(
      "day2Wrap"
    );

  const day2 =
    document.getElementById(
      "groupDay2"
    );

  const start =
    document.getElementById(
      "groupStart"
    );

  if (type === "solution") {

    if (day2Wrap)
      day2Wrap.style.display = "none";

    if (day2) {

      day2.required = false;
      day2.value = "";

    }

    if (start) {

      start.innerHTML = `
        <option value="10:00">
          10:00 صباحًا
        </option>
      `;

      start.value = "10:00";

    }

  } else {

    if (day2Wrap)
      day2Wrap.style.display = "";

    if (day2)
      day2.required = true;

    if (start)
      start.innerHTML =
        timeOptions();

  }

  calculateEndTime();

}


// =====================================================
// أوقات الحصص
// =====================================================

function timeOptions() {

  const times = [

    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00"

  ];

  return `

    <option value="">
      اختر الموعد
    </option>

    ${
      times.map(
        time => `

          <option value="${time}">
            ${formatTime(time)}
          </option>

        `
      ).join("")
    }

  `;

}


// =====================================================
// حساب النهاية
// =====================================================

function calculateEndTime() {

  const type =
    document.getElementById(
      "groupType"
    )?.value;

  const start =
    document.getElementById(
      "groupStart"
    )?.value;

  const end =
    document.getElementById(
      "groupEnd"
    );

  if (!end)
    return;

  if (type === "solution") {

    end.value =
      "12:00";

    return;
  }

  if (!start) {

    end.value =
      "—";

    return;
  }

  const [h, m] =
    start
      .split(":")
      .map(Number);

  const date =
    new Date();

  date.setHours(
    h,
    m + 60,
    0,
    0
  );

  const hh =
    String(
      date.getHours()
    ).padStart(2, "0");

  const mm =
    String(
      date.getMinutes()
    ).padStart(2, "0");

  end.value =
    `${hh}:${mm}`;

}


// =====================================================
// إنشاء مجموعة
// =====================================================

async function createGroup(e) {

  e.preventDefault();

  const grade =
    document.getElementById(
      "groupGrade"
    ).value;

  const type =
    document.getElementById(
      "groupType"
    ).value;

  const day1 =
    document.getElementById(
      "groupDay1"
    ).value;

  const day2 =
    document.getElementById(
      "groupDay2"
    ).value;

  const start =
    document.getElementById(
      "groupStart"
    ).value;

  let end =
    document.getElementById(
      "groupEnd"
    ).value;


  if (!grade || !day1) {

    alert(
      "أكمل بيانات المجموعة."
    );

    return;
  }


  if (
    type === "regular" &&
    !day2
  ) {

    alert(
      "المجموعة الأساسية يجب أن يكون لها يومان."
    );

    return;
  }


  if (
    type === "regular" &&
    day1 === day2
  ) {

    alert(
      "يجب اختيار يومين مختلفين."
    );

    return;
  }


  if (type === "solution") {

    if (
      ![
        "الأحد",
        "الثلاثاء",
        "الخميس"
      ].includes(day1)
    ) {

      alert(
        "مجموعة الحل تكون الأحد أو الثلاثاء أو الخميس فقط."
      );

      return;
    }

    end = "12:00";

  }


  const name =
    groupName({

      grade,
      group_type: type,
      day_1: day1,
      day_2: day2,
      start_time: start,
      end_time: end

    });


  const {
    error
  } =
    await sb
      .from("groups")
      .insert({

        name,
        grade,
        group_type: type,
        day_1: day1,
        day_2:
          type === "regular"
            ? day2
            : null,
        start_time:
          start,
        end_time:
          end,
        duration_minutes:
          type === "solution"
            ? 120
            : 60,
        active: true

      });


  if (error) {

    console.error(error);

    alert(
      error.message
    );

    return;
  }


  closeModal();

  loadGroups();

}


// =====================================================
// اسم المجموعة
// =====================================================

function groupName(group) {

  const grade =
    gradeArabic(group.grade);

  const days =
    group.group_type === "solution"
      ? group.day_1
      : `${group.day_1} والثلاثاء`
        .replace(
          "والثلاثاء",
          group.day_2
            ? `و${group.day_2}`
            : ""
        );

  const start =
    formatTime(group.start_time);

  const end =
    formatTime(group.end_time);

  return `${grade} | ${days} | ${start} - ${end}`;
}


// =====================================================
// ترجمة الصف
// =====================================================

function gradeArabic(grade) {

  return {

    first_secondary:
      "الأول الثانوي",

    second_secondary:
      "الثاني الثانوي",

    third_secondary:
      "الثالث الثانوي"

  }[grade] || grade || "—";
}


// =====================================================
// تنسيق الوقت
// =====================================================

function formatTime(time) {

  if (!time)
    return "—";

  const parts =
    String(time)
      .substring(0, 5)
      .split(":");

  let hour =
    Number(parts[0]);

  const minute =
    parts[1];

  const suffix =
    hour >= 12
      ? "مساءً"
      : "صباحًا";

  if (hour > 12)
    hour -= 12;

  if (hour === 0)
    hour = 12;

  return `${hour}:${minute} ${suffix}`;
}


// =====================================================
// طلب تغيير المجموعة
// =====================================================

async function requestGroupChange(studentId) {

  const {
    data: student,
    error
  } =
    await sb
      .from("students")
      .select(`
        *,
        groups(name,grade,day_1,day_2,start_time,end_time)
      `)
      .eq("id", studentId)
      .single();

  if (error || !student) {

    alert(
      "تعذر تحميل بيانات الطالب."
    );

    return;
  }


  const groups =
    await getRegularGroups();


  openModal(`

    <h2>
      طلب تغيير المجموعة
    </h2>


    <div class="notice">

      المجموعة الحالية:

      <strong>

        ${esc(
          student.groups?.name ||
          groupName(student.groups || {})
        )}

      </strong>

    </div>


    <form
      class="form"
      onsubmit="submitGroupChange(event,'${esc(studentId)}','${esc(student.group_id || "")}')"
    >

      <label>

        المجموعة الجديدة

        <select
          id="requestedGroup"
          required
        >

          <option value="">
            اختر المجموعة
          </option>

          ${
            groups
              .filter(
                g =>
                  String(g.id) !==
                  String(student.group_id)
              )
              .map(
                g => `

                  <option value="${esc(g.id)}">

                    ${esc(
                      g.name ||
                      groupName(g)
                    )}

                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <label>

        سبب النقل

        <textarea
          id="changeReason"
          rows="4"
          placeholder="اكتب سبب طلب النقل"
        ></textarea>

      </label>


      <button
        class="btn"
        type="submit"
      >

        إرسال الطلب

      </button>

    </form>

  `);

}


// =====================================================
// إرسال طلب النقل
// =====================================================

async function submitGroupChange(
  e,
  studentId,
  oldGroupId
) {

  e.preventDefault();

  const requestedGroupId =
    document
      .getElementById(
        "requestedGroup"
      )
      .value;

  const reason =
    document
      .getElementById(
        "changeReason"
      )
      .value
      .trim();


  if (!requestedGroupId) {

    alert(
      "اختر المجموعة الجديدة."
    );

    return;
  }


  const {
    error
  } =
    await sb
      .from("group_change_requests")
      .insert({

        student_id:
          studentId,

        old_group_id:
          oldGroupId || null,

        requested_group_id:
          requestedGroupId,

        reason:
          reason || null,

        status:
          "pending"

      });


  if (error) {

    alert(
      error.message
    );

    return;
  }


  closeModal();

  alert(
    "تم إرسال طلب نقل المجموعة إلى الإدارة."
  );

}


// =====================================================
// سجل تغيير المجموعة
// =====================================================

async function loadGroupHistory(
  studentId
) {

  const {
    data,
    error
  } =
    await sb
      .from("student_group_history")
      .select(`
        *,
        old_group:groups!student_group_history_old_group_id_fkey(name),
        new_group:groups!student_group_history_new_group_id_fkey(name)
      `)
      .eq(
        "student_id",
        studentId
      )
      .order(
        "changed_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(error);

    return [];

  }

  return data || [];
}


// =====================================================
// الحضور
// =====================================================

async function loadAttendance() {

  const container =
    document.getElementById(
      "attendanceList"
    );

  if (!container)
    return;


  if (
    currentProfile.role === "student"
  ) {

    const {
      data: student
    } =
      await sb
        .from("students")
        .select(`
          *,
          groups(*)
        `)
        .eq(
          "profile_id",
          currentUser.id
        )
        .maybeSingle();

    if (!student) {

      container.innerHTML =
        "لا توجد بيانات طالب.";

      return;
    }


    container.innerHTML = `

      <div class="notice">

        <strong>
          المجموعة الأساسية:
        </strong>

        ${esc(
          student.groups?.name ||
          "—"
        )}

        <br><br>

        أيام الحضور:

        ${esc(
          student.groups?.day_1 ||
          "—"
        )}

        ${
          student.groups?.day_2
            ? " + " +
              esc(
                student.groups.day_2
              )
            : ""
        }

        <br><br>

        مجموعة الحل:

        ${esc(
          student.solution_day ||
          "—"
        )}

      </div>

    `;

    return;
  }


  container.innerHTML = `

    <div class="notice">

      نظام الحضور مرتبط بأيام المجموعات.
      يتم تسجيل الحضور لكل حصة في يومها.

    </div>

  `;

}


// =====================================================
// التقارير
// =====================================================

async function loadReports() {

  const history =
    document.getElementById(
      "groupHistory"
    );

  if (!history)
    return;


  if (
    currentProfile.role !== "student"
  ) {

    history.innerHTML =
      "سجل النقل يظهر داخل ملف الطالب.";

    return;
  }


  const {
    data: student
  } =
    await sb
      .from("students")
      .select("id")
      .eq(
        "profile_id",
        currentUser.id
      )
      .maybeSingle();


  if (!student) {

    history.innerHTML =
      "لا توجد بيانات.";

    return;
  }


  const data =
    await loadGroupHistory(
      student.id
    );


  if (!data.length) {

    history.innerHTML =
      "لا توجد عمليات نقل سابقة.";

    return;
  }


  history.innerHTML =
    data.map(
      item => `

        <div
          class="notice"
          style="margin-bottom:10px"
        >

          <strong>
            تم تغيير المجموعة
          </strong>

          <br>

          من:

          ${esc(
            item.old_group?.name ||
            "—"
          )}

          <br>

          إلى:

          ${esc(
            item.new_group?.name ||
            "—"
          )}

          <br>

          التاريخ:

          ${formatDate(
            item.changed_at
          )}

          ${
            item.notes
              ? `
                <br>
                السبب:
                ${esc(item.notes)}
              `
              : ""
          }

        </div>

      `
    )
    .join("");

}


// =====================================================
// حفظ بيانات الحساب
// =====================================================

async function saveProfile(e) {

  e.preventDefault();

  const phone =
    document
      .getElementById(
        "profilePhone"
      )
      .value
      .trim();


  if (phone) {

    const {
      data: duplicate
    } =
      await sb
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .neq(
          "id",
          currentUser.id
        )
        .maybeSingle();


    if (duplicate) {

      alert(
        "رقم الهاتف مستخدم بالفعل."
      );

      return;
    }

  }


  const {
    error
  } =
    await sb
      .from("profiles")
      .update({

        full_name:
          document
            .getElementById(
              "profileName"
            )
            .value
            .trim(),

        phone

      })
      .eq(
        "id",
        currentUser.id
      );


  alert(
    error
      ? error.message
      : "تم الحفظ"
  );


  if (!error)
    await loadProfile();

}


// =====================================================
// تغيير كلمة المرور
// =====================================================

async function changePassword() {

  openModal(`

    <h2>
      تغيير كلمة المرور
    </h2>


    <form
      class="form"
      onsubmit="doPassword(event)"
    >

      <input
        id="newPass"
        type="password"
        minlength="8"
        placeholder="كلمة المرور الجديدة"
        required
      >


      <input
        id="newPass2"
        type="password"
        minlength="8"
        placeholder="تأكيد كلمة المرور"
        required
      >


      <button class="btn">
        تحديث
      </button>

    </form>

  `);

}


async function doPassword(e) {

  e.preventDefault();

  if (
    currentProfile.role === "student"
  ) {

    alert(
      "الطالب لا يستطيع تغيير كلمة المرور."
    );

    return;
  }


  const a =
    document
      .getElementById(
        "newPass"
      )
      .value;

  const b =
    document
      .getElementById(
        "newPass2"
      )
      .value;


  if (a !== b) {

    alert(
      "كلمتا المرور غير متطابقتين"
    );

    return;
  }


  const {
    error
  } =
    await sb.auth.updateUser({

      password: a

    });


  alert(
    error?.message ||
    "تم تغيير كلمة المرور"
  );


  if (!error)
    closeModal();

}


// =====================================================
// الإشعارات
// =====================================================

async function sendNotification(e) {

  e.preventDefault();

  alert(
    "سيتم ربط الإشعارات في الخطوة القادمة."
  );

}


// =====================================================
// نماذج مؤقتة
// =====================================================

function simpleForm(title) {

  openModal(`

    <h2>
      إضافة ${title}
    </h2>


    <form
      class="form"
      onsubmit="event.preventDefault();closeModal()"
    >

      <input
        placeholder="الاسم"
        required
      >


      <textarea
        placeholder="التفاصيل"
      ></textarea>


      <button class="btn">
        حفظ
      </button>

    </form>

  `);

}


// =====================================================
// PDF الطالب
// =====================================================

async function studentPDF(s) {

  const history =
    await loadGroupHistory(
      s.id
    );


  const historyRows =
    history.length
      ? history.map(
          item => `

            <tr>

              <td>
                ${formatDate(
                  item.changed_at
                )}
              </td>

              <td>
                ${esc(
                  item.old_group?.name ||
                  "—"
                )}
              </td>

              <td>
                ${esc(
                  item.new_group?.name ||
                  "—"
                )}
              </td>

              <td>
                ${esc(
                  item.notes ||
                  "—"
                )}
              </td>

            </tr>

          `
        ).join("")
      : `

          <tr>

            <td colspan="4">
              لا توجد تغييرات سابقة
            </td>

          </tr>

        `;


  const html = `

    <!doctype html>

    <html lang="ar" dir="rtl">

    <head>

      <meta charset="utf-8">

      <title>
        بيان الطالب
      </title>


      <style>

        body {
          font-family: Arial;
          padding: 35px;
        }

        h1 {
          text-align:center;
        }

        table {
          width:100%;
          border-collapse:collapse;
          margin-bottom:25px;
        }

        th,
        td {
          border:1px solid #ddd;
          padding:10px;
          text-align:right;
        }

        th {
          background:#f4f5f8;
        }

        .h {
          font-weight:bold;
          background:#f4f5f8;
        }

      </style>

    </head>


    <body>

      <h1>
        بيان الطالب
      </h1>


      <p style="text-align:center">
        EduCenter
      </p>


      <table>

        <tr>

          <td class="h">
            الاسم
          </td>

          <td>
            ${esc(s.full_name)}
          </td>

        </tr>


        <tr>

          <td class="h">
            ID
          </td>

          <td>
            ${esc(s.student_id)}
          </td>

        </tr>


        <tr>

          <td class="h">
            الصف
          </td>

          <td>
            ${esc(
              gradeArabic(s.grade)
            )}
          </td>

        </tr>


        <tr>

          <td class="h">
            الهاتف
          </td>

          <td>
            ${esc(s.phone || "")}
          </td>

        </tr>


        <tr>

          <td class="h">
            ولي الأمر
          </td>

          <td>
            ${esc(
              s.parent_phone || ""
            )}
          </td>

        </tr>


        <tr>

          <td class="h">
            المجموعة
          </td>

          <td>
            ${esc(
              s.groups?.name ||
              "—"
            )}
          </td>

        </tr>


        <tr>

          <td class="h">
            يوم مجموعة الحل
          </td>

          <td>
            ${esc(
              s.solution_day ||
              "—"
            )}
          </td>

        </tr>


        <tr>

          <td class="h">
            نسبة الحضور
          </td>

          <td>
            ${(s.attendance_percent ?? 0)}%
          </td>

        </tr>


        <tr>

          <td class="h">
            النقاط
          </td>

          <td>
            ${s.points ?? 0}
          </td>

        </tr>

      </table>


      <h2>
        سجل تغيير المجموعات
      </h2>


      <table>

        <thead>

          <tr>

            <th>
              التاريخ
            </th>

            <th>
              المجموعة القديمة
            </th>

            <th>
              المجموعة الجديدة
            </th>

            <th>
              السبب
            </th>

          </tr>

        </thead>


        <tbody>

          ${historyRows}

        </tbody>

      </table>


      <script>

        window.print();

      <\/script>

    </body>

    </html>

  `;


  const w =
    window.open(
      "",
      "_blank"
    );


  if (!w) {

    alert(
      "اسمح بالنوافذ المنبثقة."
    );

    return;
  }


  w.document.write(html);

  w.document.close();

}


// =====================================================
// التاريخ
// =====================================================

function formatDate(value) {

  if (!value)
    return "—";

  try {

    return new Date(value)
      .toLocaleDateString(
        "ar-EG",
        {
          year: "numeric",
          month: "long",
          day: "numeric"
        }
      );

  } catch {

    return value;

  }

}


// =====================================================
// تطبيق الخط
// =====================================================

function applyFont() {

  const file =
    document
      .getElementById(
        "fontFile"
      )
      ?.files[0];


  if (!file) {

    alert(
      "اختر الخط"
    );

    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    event => {

      const font =
        new FontFace(
          "UploadedFont",
          event.target.result
        );


      font
        .load()
        .then(loaded => {

          document.fonts.add(
            loaded
          );

          document.body.style.fontFamily =
            "UploadedFont,Arial";


          alert(
            "تم تطبيق الخط على الجلسة الحالية."
          );

        });

    };


  reader.readAsArrayBuffer(file);

}


// =====================================================
// Modal
// =====================================================

function openModal(content) {

  const contentEl =
    document.getElementById(
      "modalContent"
    );

  const modal =
    document.getElementById(
      "modal"
    );

  if (!contentEl || !modal)
    return;

  contentEl.innerHTML =
    content;

  modal
    .classList
    .remove("hidden");

}


function closeModal() {

  document
    .getElementById("modal")
    ?.classList
    .add("hidden");

}


// =====================================================
// حماية HTML
// =====================================================

function esc(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    char =>
      ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[char])
  );

}


// =====================================================
// تشغيل
// =====================================================

boot();
