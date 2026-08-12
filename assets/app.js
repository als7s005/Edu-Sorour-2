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

let groupsCache = [];

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

  await loadGroups();

  render();
}


// =====================================================
// إظهار تسجيل الدخول
// =====================================================

function showLogin() {

  document
    .getElementById("loginView")
    ?.classList.remove("hidden");

  document
    .getElementById("app")
    ?.classList.add("hidden");
}


// =====================================================
// إظهار التطبيق
// =====================================================

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

  const roleLabel =
    document.getElementById("roleLabel");

  const userMeta =
    document.getElementById("userMeta");

  const avatar =
    document.getElementById("avatar");

  if (userName)
    userName.textContent = name;

  if (roleLabel)
    roleLabel.textContent =
      roleArabic(currentProfile.role);

  if (userMeta)
    userMeta.textContent =
      currentProfile.role;

  if (avatar)
    avatar.textContent =
      name[0] || "م";
}


// =====================================================
// ترجمة الصلاحيات
// =====================================================

function roleArabic(role) {

  return {
    admin: "مدير",
    teacher: "معلم",
    student: "طالب"
  }[role] || role;

}


// =====================================================
// رسالة تسجيل الدخول
// =====================================================

function setLoginMessage(message) {

  const el =
    document.getElementById("loginMsg");

  if (el) {

    el.textContent = message;

  }

}


// =====================================================
// تحميل المجموعات
// =====================================================

async function loadGroups() {

  if (!sb) return;

  const {
    data,
    error
  } = await sb
    .from("groups")
    .select("*")
    .order("name");

  if (error) {

    console.error("GROUPS ERROR:", error);

    groupsCache = [];

    return;

  }

  groupsCache = data || [];

}


// =====================================================
// اسم المجموعة
// =====================================================

function groupName(id) {

  if (!id) return "—";

  const group =
    groupsCache.find(
      g => String(g.id) === String(id)
    );

  return group?.name || "—";
}


// =====================================================
// تسجيل الدخول
// =====================================================

document
  .getElementById("loginForm")
  ?.addEventListener(
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

      if (studentData?.email) {

        email = studentData.email;

      }

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


// =====================================================
// تسجيل الخروج
// =====================================================

document
  .getElementById("logout")
  ?.addEventListener(
    "click",
    async () => {

      if (sb) {

        await sb.auth.signOut();

      }

    }
  );


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

  if (!nav) return;

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

  if (!content) return;

  content.innerHTML =
    pageHTML(page);

  if (page === "students") {

    loadStudents();

  }

  if (page === "groups") {

    loadGroupsPage();

  }

  if (page === "reports") {

    loadReports();

  }

}


// =====================================================
// صفحات الموقع
// =====================================================

function pageHTML(p) {

  // ==============================
  // الطلاب
  // ==============================

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
                <th>حصة الحل</th>
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


  // ==============================
  // المعلمين
  // ==============================

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


  // ==============================
  // المجموعات
  // ==============================

  if (p === "groups") {

    return `
      <div class="card">

        <div class="section-head">

          <h2>المجموعات</h2>

          <button
            class="btn"
            onclick="simpleForm('مجموعة')"
          >
            + إضافة مجموعة
          </button>

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


  // ==============================
  // الحضور
  // ==============================

  if (p === "attendance") {

    return `
      <div class="card">

        <div class="section-head">

          <h2>الحضور</h2>

          <button
            class="btn"
            onclick="saveAttendance()"
          >
            حفظ الحضور
          </button>

        </div>

        <div class="notice">
          تسجيل ومتابعة حضور الطلاب.
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


  // ==============================
  // الامتحانات
  // ==============================

  if (p === "exams") {

    return `
      <div class="card">

        <div class="section-head">

          <h2>الامتحانات</h2>

          <button
            class="btn"
            onclick="simpleForm('امتحان')"
          >
            + إضافة امتحان
          </button>

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


  // ==============================
  // المحادثات
  // ==============================

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


  // ==============================
  // الإشعارات
  // ==============================

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


  // ==============================
  // التقارير
  // ==============================

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
            طلبات نقل المجموعات
          </span>

          <strong id="rTransfers">
            —
          </strong>
        </div>

      </div>

      ${
        currentProfile.role === "admin"
          ? `
            <div class="card">

              <div class="section-head">

                <h2>
                  طلبات نقل المجموعات
                </h2>

              </div>

              <div id="transferRequests">
                جاري التحميل...
              </div>

            </div>
          `
          : ""
      }

      <div class="card">

        <h2>
          سجل تغيير المجموعات
        </h2>

        <div id="transferHistory">
          جاري التحميل...
        </div>

      </div>
    `;

  }


  // ==============================
  // الإعدادات
  // ==============================

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

          ${
            currentProfile.role === "student"
              ? `
                <button
                  class="btn secondary"
                  style="margin-top:10px"
                  onclick="requestGroupTransfer()"
                >
                  طلب تغيير المجموعة
                </button>
              `
              : ""
          }

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

          <strong id="d1">—</strong>

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
        يتم احتساب التقييم من الحضور ونتائج الامتحانات والتقييم الشهري.
      </p>

    </div>
  `;

}


// =====================================================
// الطلاب
// =====================================================

async function loadStudents() {

  if (!sb) return;

  let query =
    sb
      .from("students")
      .select(
        "*,groups(name),profiles(full_name)"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  const {
    data,
    error
  } = await query;

  const body =
    document.getElementById("studentBody");

  if (!body) return;

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

  let arr = data || [];

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
    arr
      .map(
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
              ${esc(
                student.groups?.name || "—"
              )}
            </td>

            <td>
              ${esc(
                groupName(student.solution_group_id)
              )}
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
                PDF
              </button>

              ${
                currentProfile.role === "admin"
                  ? `
                    <button
                      class="btn secondary"
                      onclick='editStudentGroups(${JSON.stringify(student)})'
                    >
                      المجموعات
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

function addStudent() {

  const normalGroups =
    groupsCache
      .filter(
        g =>
          g.type !== "solution"
      );

  const solutionGroups =
    groupsCache
      .filter(
        g =>
          g.type === "solution"
      );

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

          الهاتف

          <input
            id="sp"
            required
            placeholder="مثال: 01012345678"
          >

        </label>

        <label>

          هاتف ولي الأمر

          <input
            id="sparent"
            placeholder="رقم ولي الأمر"
          >

        </label>

        <label>

          الصف

          <select
            id="sg"
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

          المجموعة

          <select
            id="sgrp"
            required
          >

            <option value="">
              اختر المجموعة
            </option>

            ${
              normalGroups
                .map(
                  g => `
                    <option value="${esc(g.id)}">
                      ${esc(g.name)}
                    </option>
                  `
                )
                .join("")
            }

          </select>

        </label>

        <label>

          حصة الحل

          <select
            id="solutionGroup"
            required
          >

            <option value="">
              اختر حصة الحل
            </option>

            ${
              solutionGroups
                .map(
                  g => `
                    <option value="${esc(g.id)}">
                      ${esc(g.name)}
                    </option>
                  `
                )
                .join("")
            }

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
          مهم:
        </strong>

        المجموعة وحصة الحل إجباريتان.

        <br>

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

  const seatNumber =
    document
      .getElementById("seat")
      .value
      .trim();

  if (!fullName) {

    alert("اكتب اسم الطالب.");

    return;

  }

  if (!phone) {

    alert("اكتب رقم هاتف الطالب.");

    return;

  }

  if (!grade) {

    alert("اختر الصف.");

    return;

  }

  if (!groupId) {

    alert(
      "لا يمكن إنشاء الطالب بدون اختيار المجموعة."
    );

    return;

  }

  if (!solutionGroupId) {

    alert(
      "لا يمكن إنشاء الطالب بدون اختيار حصة الحل."
    );

    return;

  }

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
            <strong>اسم الطالب:</strong>
            ${esc(student.name)}
          </p>

          <p>
            <strong>ID الطالب:</strong>
            ${esc(student.student_id)}
          </p>

          <p>
            <strong>المجموعة:</strong>
            ${esc(groupName(student.group_id))}
          </p>

          <p>
            <strong>حصة الحل:</strong>
            ${esc(groupName(student.solution_group_id))}
          </p>

          <p>
            <strong>كلمة المرور:</strong>
            ${esc(student.password)}
          </p>

        </div>

        <p
          style="
            color:#718096;
            font-size:13px
          "
        >
          احتفظ بالـID وكلمة المرور لإعطائهما للطالب.
        </p>

        <button
          class="btn"
          onclick="closeModal();loadStudents()"
        >
          تم
        </button>

      </div>

    `);

    await loadStudents();

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
// تعديل مجموعات الطالب للمدير
// =====================================================

function editStudentGroups(student) {

  const normalGroups =
    groupsCache
      .filter(
        g =>
          g.type !== "solution"
      );

  const solutionGroups =
    groupsCache
      .filter(
        g =>
          g.type === "solution"
      );

  openModal(`

    <h2>
      تعديل مجموعات الطالب
    </h2>

    <p>
      ${esc(student.full_name)}
    </p>

    <form
      class="form"
      onsubmit="saveStudentGroups(event, '${esc(student.id)}')"
    >

      <label>

        المجموعة

        <select
          id="editGroup"
          required
        >

          <option value="">
            اختر المجموعة
          </option>

          ${
            normalGroups
              .map(
                g => `
                  <option
                    value="${esc(g.id)}"
                    ${
                      String(g.id) ===
                      String(student.group_id)
                        ? "selected"
                        : ""
                    }
                  >
                    ${esc(g.name)}
                  </option>
                `
              )
              .join("")
          }

        </select>

      </label>

      <label>

        حصة الحل

        <select
          id="editSolutionGroup"
          required
        >

          <option value="">
            اختر حصة الحل
          </option>

          ${
            solutionGroups
              .map(
                g => `
                  <option
                    value="${esc(g.id)}"
                    ${
                      String(g.id) ===
                      String(student.solution_group_id)
                        ? "selected"
                        : ""
                    }
                  >
                    ${esc(g.name)}
                  </option>
                `
              )
              .join("")
          }

        </select>

      </label>

      <button
        class="btn"
        type="submit"
      >
        حفظ
      </button>

    </form>

  `);

}


// =====================================================
// حفظ مجموعات الطالب
// =====================================================

async function saveStudentGroups(
  e,
  studentId
) {

  e.preventDefault();

  const groupId =
    document
      .getElementById("editGroup")
      .value;

  const solutionGroupId =
    document
      .getElementById("editSolutionGroup")
      .value;

  if (!groupId || !solutionGroupId) {

    alert(
      "المجموعة وحصة الحل إجباريتان."
    );

    return;

  }

  const {
    data: student
  } =
    await sb
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

  if (!student) {

    alert("لم يتم العثور على الطالب.");

    return;

  }

  const oldGroup =
    student.group_id;

  const oldSolutionGroup =
    student.solution_group_id;

  const {
    error
  } =
    await sb
      .from("students")
      .update({

        group_id:
          groupId,

        solution_group_id:
          solutionGroupId

      })
      .eq(
        "id",
        studentId
      );

  if (error) {

    alert(error.message);

    return;

  }

  if (
    String(oldGroup) !== String(groupId)
  ) {

    await addTransferHistory(
      studentId,
      oldGroup,
      groupId,
      "تم تغيير المجموعة بواسطة المدير"
    );

  }

  if (
    String(oldSolutionGroup) !==
    String(solutionGroupId)
  ) {

    await addTransferHistory(
      studentId,
      oldSolutionGroup,
      solutionGroupId,
      "تم تغيير حصة الحل بواسطة المدير"
    );

  }

  closeModal();

  alert("تم تحديث مجموعات الطالب.");

  await loadStudents();

}


// =====================================================
// طلب نقل المجموعة للطالب
// =====================================================

function requestGroupTransfer() {

  const availableGroups =
    groupsCache
      .filter(
        g =>
          g.type !== "solution"
      );

  openModal(`

    <h2>
      طلب تغيير المجموعة
    </h2>

    <div class="notice">

      سيتم إرسال الطلب إلى الإدارة.
      ولن تتغير مجموعتك إلا بعد موافقة الإدارة.

    </div>

    <form
      class="form"
      onsubmit="submitTransferRequest(event)"
    >

      <label>

        المجموعة الحالية

        <input
          value="${esc(
            groupName(currentProfile.group_id)
          )}"
          disabled
        >

      </label>

      <label>

        المجموعة الجديدة

        <select
          id="transferGroup"
          required
        >

          <option value="">
            اختر المجموعة الجديدة
          </option>

          ${
            availableGroups
              .filter(
                g =>
                  String(g.id) !==
                  String(currentProfile.group_id)
              )
              .map(
                g => `
                  <option value="${esc(g.id)}">
                    ${esc(g.name)}
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
          id="transferReason"
          rows="4"
          placeholder="اكتب سبب طلب النقل"
        ></textarea>

      </label>

      <button
        class="btn"
        type="submit"
      >
        إرسال طلب النقل
      </button>

    </form>

  `);

}


// =====================================================
// إرسال طلب النقل
// =====================================================

async function submitTransferRequest(e) {

  e.preventDefault();

  const newGroupId =
    document
      .getElementById("transferGroup")
      .value;

  const reason =
    document
      .getElementById("transferReason")
      .value
      .trim();

  if (!newGroupId) {

    alert("اختر المجموعة الجديدة.");

    return;

  }

  const {
    data: student,
    error: studentError
  } =
    await sb
      .from("students")
      .select("*")
      .eq(
        "profile_id",
        currentUser.id
      )
      .single();

  if (studentError || !student) {

    alert(
      "لم يتم العثور على بيانات الطالب."
    );

    return;

  }

  const {
    data: pending
  } =
    await sb
      .from("group_transfer_requests")
      .select("id")
      .eq(
        "student_id",
        student.id
      )
      .eq(
        "status",
        "pending"
      )
      .maybeSingle();

  if (pending) {

    alert(
      "لديك طلب نقل قيد المراجعة بالفعل."
    );

    return;

  }

  const {
    error
  } =
    await sb
      .from("group_transfer_requests")
      .insert({

        student_id:
          student.id,

        from_group_id:
          student.group_id,

        to_group_id:
          newGroupId,

        reason:
          reason || null,

        status:
          "pending",

        requested_by:
          currentUser.id

      });

  if (error) {

    alert(error.message);

    return;

  }

  closeModal();

  alert(
    "تم إرسال طلب النقل للإدارة بنجاح."
  );

}


// =====================================================
// سجل نقل المجموعات
// =====================================================

async function addTransferHistory(
  studentId,
  fromGroupId,
  toGroupId,
  note
) {

  const {
    error
  } =
    await sb
      .from("student_group_history")
      .insert({

        student_id:
          studentId,

        from_group_id:
          fromGroupId || null,

        to_group_id:
          toGroupId,

        changed_by:
          currentUser.id,

        note:
          note || null

      });

  if (error) {

    console.error(
      "TRANSFER HISTORY ERROR:",
      error
    );

  }

}


// =====================================================
// صفحة المجموعات
// =====================================================

async function loadGroupsPage() {

  const el =
    document.getElementById(
      "groupList"
    );

  if (!el) return;

  await loadGroups();

  if (!groupsCache.length) {

    el.innerHTML =
      "لا توجد مجموعات.";

    return;

  }

  el.innerHTML =
    groupsCache
      .map(
        group => `

          <div
            class="notice"
            style="margin-bottom:10px"
          >

            <strong>
              ${esc(group.name)}
            </strong>

            ${
              group.type === "solution"
                ? `
                  <span class="badge orange">
                    حصة حل
                  </span>
                `
                : `
                  <span class="badge green">
                    مجموعة أساسية
                  </span>
                `
            }

          </div>

        `
      )
      .join("");

}


// =====================================================
// التقارير
// =====================================================

async function loadReports() {

  await loadTransferHistory();

  if (
    currentProfile.role === "admin"
  ) {

    await loadTransferRequests();

  }

}


// =====================================================
// طلبات النقل للمدير
// =====================================================

async function loadTransferRequests() {

  const el =
    document.getElementById(
      "transferRequests"
    );

  if (!el) return;

  const {
    data,
    error
  } =
    await sb
      .from("group_transfer_requests")
      .select(
        `
        *,
        students(full_name,student_id),
        from_group:groups!group_transfer_requests_from_group_id_fkey(name),
        to_group:groups!group_transfer_requests_to_group_id_fkey(name)
        `
      )
      .eq(
        "status",
        "pending"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(error);

    el.innerHTML =
      `خطأ: ${esc(error.message)}`;

    return;

  }

  if (!data?.length) {

    el.innerHTML =
      `<div class="empty">لا توجد طلبات نقل معلقة.</div>`;

    return;

  }

  el.innerHTML =
    data
      .map(
        request => `

          <div
            class="notice"
            style="margin-bottom:12px"
          >

            <strong>
              ${esc(
                request.students?.full_name
              )}
            </strong>

            <br>

            ID:
            ${esc(
              request.students?.student_id
            )}

            <br>

            من:
            ${esc(
              request.from_group?.name || "—"
            )}

            <br>

            إلى:
            ${esc(
              request.to_group?.name || "—"
            )}

            ${
              request.reason
                ? `
                  <br>
                  السبب:
                  ${esc(request.reason)}
                `
                : ""
            }

            <br><br>

            <button
              class="btn"
              onclick="approveTransfer('${request.id}')"
            >
              موافقة
            </button>

            <button
              class="btn secondary"
              onclick="rejectTransfer('${request.id}')"
            >
              رفض
            </button>

          </div>

        `
      )
      .join("");

}


// =====================================================
// الموافقة على النقل
// =====================================================

async function approveTransfer(requestId) {

  const {
    data: request,
    error
  } =
    await sb
      .from("group_transfer_requests")
      .select("*")
      .eq(
        "id",
        requestId
      )
      .single();

  if (error || !request) {

    alert(
      "لم يتم العثور على الطلب."
    );

    return;

  }

  const {
    error: updateError
  } =
    await sb
      .from("students")
      .update({

        group_id:
          request.to_group_id

      })
      .eq(
        "id",
        request.student_id
      );

  if (updateError) {

    alert(updateError.message);

    return;

  }

  await addTransferHistory(
    request.student_id,
    request.from_group_id,
    request.to_group_id,
    "تم تغيير المجموعة بعد موافقة الإدارة"
  );

  const {
    error: requestError
  } =
    await sb
      .from("group_transfer_requests")
      .update({

        status:
          "approved",

        reviewed_by:
          currentUser.id,

        reviewed_at:
          new Date().toISOString()

      })
      .eq(
        "id",
        requestId
      );

  if (requestError) {

    alert(requestError.message);

    return;

  }

  alert(
    "تمت الموافقة على طلب النقل."
  );

  await loadTransferRequests();

}


// =====================================================
// رفض النقل
// =====================================================

async function rejectTransfer(requestId) {

  const reason =
    prompt(
      "اكتب سبب رفض الطلب:"
    );

  const {
    error
  } =
    await sb
      .from("group_transfer_requests")
      .update({

        status:
          "rejected",

        reviewed_by:
          currentUser.id,

        reviewed_at:
          new Date().toISOString(),

        admin_note:
          reason || null

      })
      .eq(
        "id",
        requestId
      );

  if (error) {

    alert(error.message);

    return;

  }

  alert(
    "تم رفض طلب النقل."
  );

  await loadTransferRequests();

}


// =====================================================
// سجل الطالب
// =====================================================

async function loadTransferHistory() {

  const el =
    document.getElementById(
      "transferHistory"
    );

  if (!el) return;

  let query =
    sb
      .from("student_group_history")
      .select(
        `
        *,
        students(full_name,student_id),
        from_group:groups!student_group_history_from_group_id_fkey(name),
        to_group:groups!student_group_history_to_group_id_fkey(name)
        `
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (
    currentProfile.role === "student"
  ) {

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
        .single();

    if (!student) {

      el.innerHTML =
        "لا توجد بيانات.";

      return;

    }

    query =
      query.eq(
        "student_id",
        student.id
      );

  }

  const {
    data,
    error
  } =
    await query;

  if (error) {

    console.error(error);

    el.innerHTML =
      `خطأ: ${esc(error.message)}`;

    return;

  }

  if (!data?.length) {

    el.innerHTML =
      `<div class="empty">لا يوجد سجل تغييرات حتى الآن.</div>`;

    return;

  }

  el.innerHTML =
    data
      .map(
        item => {

          const date =
            new Date(
              item.created_at
            ).toLocaleString(
              "ar-EG"
            );

          return `

            <div
              class="notice"
              style="margin-bottom:10px"
            >

              <strong>
                ${
                  currentProfile.role === "admin"
                    ? esc(
                        item.students?.full_name
                      )
                    : "تغيير المجموعة"
                }
              </strong>

              <br>

              تم تغيير المجموعة من

              <strong>
                ${esc(
                  item.from_group?.name || "—"
                )}
              </strong>

              إلى

              <strong>
                ${esc(
                  item.to_group?.name || "—"
                )}
              </strong>

              <br>

              التاريخ:
              ${esc(date)}

              ${
                item.note
                  ? `
                    <br>
                    ${esc(item.note)}
                  `
                  : ""
              }

            </div>

          `;

        }
      )
      .join("");

}


// =====================================================
// إعدادات الحساب
// =====================================================

async function saveProfile(e) {

  e.preventDefault();

  const newPhone =
    document
      .getElementById("profilePhone")
      .value
      .trim();

  const newName =
    document
      .getElementById("profileName")
      .value
      .trim();

  if (!newName) {

    alert("الاسم مطلوب.");

    return;

  }

  if (newPhone) {

    const {
      data: duplicate
    } =
      await sb
        .from("profiles")
        .select("id")
        .eq(
          "phone",
          newPhone
        )
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
          newName,

        phone:
          newPhone

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

  if (!error) {

    await loadProfile();

  }

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
      .getElementById("newPass")
      .value;

  const b =
    document
      .getElementById("newPass2")
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

  if (!error) {

    closeModal();

  }

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
// الحضور
// =====================================================

async function saveAttendance() {

  alert(
    "سيتم ربط نظام الحضور في الخطوة القادمة."
  );

}


// =====================================================
// PDF
// =====================================================

async function studentPDF(s) {

  let history = [];

  const {
    data
  } =
    await sb
      .from("student_group_history")
      .select(
        `
        *,
        from_group:groups!student_group_history_from_group_id_fkey(name),
        to_group:groups!student_group_history_to_group_id_fkey(name)
        `
      )
      .eq(
        "student_id",
        s.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  history =
    data || [];

  const historyHTML =
    history.length
      ? history
          .map(
            h => `

              <tr>

                <td>
                  ${esc(
                    h.from_group?.name || "—"
                  )}
                </td>

                <td>
                  ${esc(
                    h.to_group?.name || "—"
                  )}
                </td>

                <td>
                  ${esc(
                    new Date(
                      h.created_at
                    ).toLocaleString("ar-EG")
                  )}
                </td>

              </tr>

            `
          )
          .join("")
      : `
          <tr>
            <td colspan="3">
              لا يوجد سجل نقل
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

        h1,
        h2 {
          text-align:center;
        }

        table {
          width:100%;
          border-collapse:collapse;
          margin-bottom:25px;
        }

        td,
        th {
          border:1px solid #ddd;
          padding:10px;
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

        ${
          [
            ["الاسم", s.full_name],
            ["ID", s.student_id],
            ["الصف", s.grade],
            ["الهاتف", s.phone || ""],
            ["ولي الأمر", s.parent_phone || ""],
            [
              "المجموعة",
              groupName(s.group_id)
            ],
            [
              "حصة الحل",
              groupName(s.solution_group_id)
            ],
            [
              "نسبة الحضور",
              (s.attendance_percent ?? 0) + "%"
            ],
            [
              "النقاط",
              s.points ?? 0
            ]
          ]
            .map(
              x => `
                <tr>

                  <td class="h">
                    ${esc(x[0])}
                  </td>

                  <td>
                    ${esc(x[1])}
                  </td>

                </tr>
              `
            )
            .join("")
        }

      </table>

      <h2>
        سجل تغيير المجموعة
      </h2>

      <table>

        <thead>

          <tr>

            <th>
              المجموعة القديمة
            </th>

            <th>
              المجموعة الجديدة
            </th>

            <th>
              التاريخ
            </th>

          </tr>

        </thead>

        <tbody>

          ${historyHTML}

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
      "المتصفح منع فتح نافذة PDF."
    );

    return;

  }

  w.document.write(html);

  w.document.close();

}


// =====================================================
// تطبيق الخط
// =====================================================

function applyFont() {

  const file =
    document
      .getElementById("fontFile")
      ?.files[0];

  if (!file) {

    alert("اختر الخط");

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

  document
    .getElementById("modalContent")
    .innerHTML =
      content;

  document
    .getElementById("modal")
    .classList
    .remove("hidden");

}


function closeModal() {

  document
    .getElementById("modal")
    .classList
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
