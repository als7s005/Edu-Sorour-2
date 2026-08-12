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
      "لم يتم العثور على ملف الحساب. تأكد من إنشاء profile لهذا المستخدم."
    );

    return;
  }

  currentProfile = data;

  showApp();

  render();

}


// =====================================================
// إظهار تسجيل الدخول
// =====================================================

function showLogin() {

  const loginView =
    document.getElementById("loginView");

  const app =
    document.getElementById("app");

  if (loginView) {
    loginView.classList.remove("hidden");
  }

  if (app) {
    app.classList.add("hidden");
  }

}


// =====================================================
// إظهار التطبيق
// =====================================================

function showApp() {

  const loginView =
    document.getElementById("loginView");

  const app =
    document.getElementById("app");

  if (loginView) {
    loginView.classList.add("hidden");
  }

  if (app) {
    app.classList.remove("hidden");
  }

  const name =
    currentProfile.full_name || "مستخدم";

  const userName =
    document.getElementById("userName");

  const roleLabel =
    document.getElementById("roleLabel");

  const userMeta =
    document.getElementById("userMeta");

  const avatar =
    document.getElementById("avatar");

  if (userName) {
    userName.textContent = name;
  }

  if (roleLabel) {
    roleLabel.textContent =
      roleArabic(currentProfile.role);
  }

  if (userMeta) {
    userMeta.textContent =
      currentProfile.role;
  }

  if (avatar) {
    avatar.textContent =
      name[0] || "م";
  }

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

    el.textContent =
      message;

  }

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

      // إذا كان المستخدم طالبًا وكتب ID
      const {
        data: studentData
      } = await sb
        .from("profiles")
        .select("email")
        .eq("student_id", id)
        .maybeSingle();

      if (studentData?.email) {

        email =
          studentData.email;

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

      currentUser =
        data.user;

      await loadProfile();

    }
  );

}


// =====================================================
// تسجيل الخروج
// =====================================================

const logoutButton =
  document.getElementById("logout");

if (logoutButton) {

  logoutButton.onclick =
    async () => {

      if (sb) {

        await sb.auth.signOut();

      }

    };

}


// =====================================================
// Render
// =====================================================

function render() {

  const pageTitle =
    document.getElementById("pageTitle");

  const pageSub =
    document.getElementById("pageSub");

  if (pageTitle) {

    pageTitle.textContent =
      titles[page]?.[0] || "";

  }

  if (pageSub) {

    pageSub.textContent =
      titles[page]?.[1] || "";

  }

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

}


// =====================================================
// صفحات الموقع
// =====================================================

function pageHTML(p) {

  if (p === "dashboard") {

    return dashboardHTML();

  }


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

        <h2>نظام النقاط</h2>

        <p>
          النقاط مبنية على الحضور والامتحانات والتقييم الشهري.
        </p>

      </div>
    `;

  }


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

  /*
    مهم جدًا:

    عندنا علاقتان بين students و groups:

    1) students.group_id
       → groups.id

    2) students.solution_group_id
       → groups.id

    لذلك لازم نحدد الـ Foreign Key صراحة.
  */

  const {
    data,
    error
  } =
    await sb
      .from("students")
      .select(`
        *,
        profiles(full_name),
        main_group:groups!students_group_id_fkey(name),
        solution_group:groups!students_solution_group_id_fkey(name)
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  const body =
    document.getElementById(
      "studentBody"
    );

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

  let arr =
    data || [];

  if (
    currentProfile.role === "student"
  ) {

    arr =
      arr.filter(
        student =>
          student.profile_id ===
          currentUser.id
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
                student.main_group?.name ||
                "—"
              )}
            </td>

            <td>
              ${esc(
                student.solution_group?.name ||
                "—"
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

          <input
            id="sgrp"
            placeholder="اتركها فارغة حاليًا"
          >

        </label>


        <label>

          رقم الجلوس

          <input
            id="seat"
          >

        </label>

      </div>


      <div class="notice">

        سيتم إنشاء ID الطالب تلقائيًا.

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
// إنشاء الطالب عن طريق Edge Function
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
      .value
      .trim();

  const seatNumber =
    document
      .getElementById("seat")
      .value
      .trim();


  if (!fullName) {

    alert(
      "اكتب اسم الطالب."
    );

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
      "انتهت جلسة تسجيل الدخول. سجل الدخول مرة أخرى."
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
              null,

            solution_group_id:
              null,

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
// إعدادات الحساب
// =====================================================

async function saveProfile(e) {

  e.preventDefault();

  const {
    error
  } =
    await sb
      .from("profiles")
      .update({

        full_name:
          document
            .getElementById("profileName")
            .value,

        phone:
          document
            .getElementById("profilePhone")
            .value

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

function studentPDF(s) {

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
        }

        td {
          border:1px solid #ddd;
          padding:10px;
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
            [
              "المجموعة",
              s.main_group?.name || ""
            ],
            [
              "مجموعة الحل",
              s.solution_group?.name || ""
            ],
            ["الهاتف", s.phone || ""],
            ["ولي الأمر", s.parent_phone || ""],
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
                    ${x[0]}
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
      "المتصفح منع فتح نافذة PDF. اسمح بالنوافذ المنبثقة."
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

  const modalContent =
    document.getElementById(
      "modalContent"
    );

  const modal =
    document.getElementById(
      "modal"
    );

  if (modalContent) {

    modalContent.innerHTML =
      content;

  }

  if (modal) {

    modal.classList
      .remove("hidden");

  }

}


function closeModal() {

  const modal =
    document.getElementById(
      "modal"
    );

  if (modal) {

    modal.classList
      .add("hidden");

  }

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
