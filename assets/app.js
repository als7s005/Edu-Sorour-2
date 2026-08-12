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

const logoutBtn =
  document.getElementById("logout");

if (logoutBtn) {

  logoutBtn.onclick =
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

  if (pageTitle)
    pageTitle.textContent =
      titles[page]?.[0] || "";

  if (pageSub)
    pageSub.textContent =
      titles[page]?.[1] || "";

  const nav =
    document.getElementById("nav");

  if (nav) {

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

  }

  const content =
    document.getElementById("content");

  if (!content)
    return;

  content.innerHTML =
    pageHTML(page);

  if (page === "students")
    loadStudents();

  if (page === "groups")
    loadGroups();

}


// =====================================================
// صفحات الموقع
// =====================================================

function pageHTML(p) {

  // ---------------------------------------------------
  // Dashboard
  // ---------------------------------------------------

  if (p === "dashboard") {

    return dashboardHTML();

  }


  // ---------------------------------------------------
  // الطلاب
  // ---------------------------------------------------

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

                <th>المجموعة الأساسية</th>

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


  // ---------------------------------------------------
  // المعلمين
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // المجموعات
  // ---------------------------------------------------

  if (p === "groups") {

    return `

      <div class="grid2">

        <div class="card">

          <div class="section-head">

            <h2>المجموعات الأساسية</h2>

            <button
              class="btn"
              onclick="addGroup('main')"
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


        <div class="card">

          <div class="section-head">

            <h2>مجموعات الحل</h2>

            <button
              class="btn"
              onclick="addGroup('solution')"
            >
              + إضافة مجموعة حل
            </button>

          </div>

          <div
            id="solutionGroupList"
            class="empty"
          >
            جاري التحميل...
          </div>

        </div>

      </div>

    `;

  }


  // ---------------------------------------------------
  // الحضور
  // ---------------------------------------------------

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

          يتم تسجيل حضور وغياب الطالب
          حسب أيام مجموعته الأساسية.

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


  // ---------------------------------------------------
  // الامتحانات
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // المحادثات
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // الإشعارات
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // التقارير
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // الإعدادات
  // ---------------------------------------------------

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
        يتم احتساب التقييم من الحضور ونتائج الامتحانات والتقييم الشهري.
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

  /*
    مهم جدًا:

    عند وجود علاقتين بين students و groups
    لازم نحدد اسم الـ FK صراحة.

    group_id
      -> students_group_id_fkey

    solution_group_id
      -> students_solution_group_id_fkey
  */

  const {
    data,
    error
  } =
    await sb
      .from("students")
      .select(`
        *,
        groups!students_group_id_fkey(
          id,
          name,
          grade,
          day1,
          day2,
          start_time,
          duration_minutes
        ),
        solution_group:groups!students_solution_group_id_fkey(
          id,
          name,
          grade,
          day1,
          day2,
          day3,
          start_time,
          end_time,
          duration_minutes
        ),
        profiles(
          full_name
        )
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

          خطأ:
          ${esc(error.message)}

        </td>

      </tr>

    `;

    return;
  }

  let arr =
    data || [];

  if (
    currentProfile.role ===
    "student"
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
                    (
                      student.full_name ||
                      "?"
                    )[0]
                  }

                </span>

                <b>

                  ${esc(
                    student.full_name
                  )}

                </b>

              </div>

            </td>


            <td>

              ${esc(
                student.student_id
              )}

            </td>


            <td>

              ${esc(
                student.grade ||
                ""
              )}

            </td>


            <td>

              <div>

                <b>

                  ${
                    esc(
                      student.groups?.name ||
                      "—"
                    )
                  }

                </b>

                ${
                  student.groups
                    ? `
                      <small
                        style="
                          display:block;
                          color:#718096;
                          margin-top:4px
                        "
                      >

                        ${formatGroupDays(
                          student.groups
                        )}

                        ${
                          student.groups.start_time
                            ? `
                              -
                              ${formatTime(
                                student.groups.start_time
                              )}
                            `
                            : ""
                        }

                      </small>
                    `
                    : ""
                }

              </div>

            </td>


            <td>

              <div>

                <b>

                  ${
                    esc(
                      student.solution_group?.name ||
                      "—"
                    )
                  }

                </b>

                ${
                  student.solution_group
                    ? `
                      <small
                        style="
                          display:block;
                          color:#718096;
                          margin-top:4px
                        "
                      >

                        ${formatSolutionDays(
                          student.solution_group
                        )}

                        ${
                          student.solution_group.start_time
                            ? `
                              -
                              ${formatTime(
                                student.solution_group.start_time
                              )}
                            `
                            : ""
                        }

                      </small>
                    `
                    : ""
                }

              </div>

            </td>


            <td>

              ${
                student.attendance_percent ??
                0
              }%

            </td>


            <td>

              <span class="badge orange">

                ${
                  student.points ??
                  0
                }

              </span>

            </td>


            <td>

              <button
                class="btn secondary"
                onclick='studentPDF(${JSON.stringify(
                  student
                )})'
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

async function addStudent() {

  if (!sb)
    return;


  // تحميل المجموعات الأساسية
  const {
    data: groups,
    error: groupsError
  } =
    await sb
      .from("groups")
      .select("*")
      .eq("type", "main")
      .order("name");


  // تحميل مجموعات الحل
  const {
    data: solutionGroups,
    error: solutionError
  } =
    await sb
      .from("groups")
      .select("*")
      .eq("type", "solution")
      .order("name");


  if (groupsError) {

    console.error(groupsError);

  }

  if (solutionError) {

    console.error(solutionError);

  }


  const mainGroups =
    groups || [];

  const solGroups =
    solutionGroups || [];


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

          المجموعة الأساسية

          <select
            id="sgrp"
            required
          >

            <option value="">
              اختر المجموعة
            </option>

            ${
              mainGroups
                .map(
                  group => `
                    <option value="${esc(
                      group.id
                    )}">

                      ${esc(
                        group.name
                      )}

                      -
                      ${formatGroupDays(
                        group
                      )}

                      ${
                        group.start_time
                          ? `
                            -
                            ${formatTime(
                              group.start_time
                            )}
                          `
                          : ""
                      }

                    </option>
                  `
                )
                .join("")
            }

          </select>

        </label>


        <label>

          مجموعة الحل

          <select
            id="ssolution"
            required
          >

            <option value="">
              اختر مجموعة الحل
            </option>

            ${
              solGroups
                .map(
                  group => `
                    <option value="${esc(
                      group.id
                    )}">

                      ${esc(
                        group.name
                      )}

                      -
                      ${formatSolutionDays(
                        group
                      )}

                      ${
                        group.start_time
                          ? `
                            -
                            ${formatTime(
                              group.start_time
                            )}
                          `
                          : ""
                      }

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

        سيتم إنشاء ID الطالب تلقائيًا.

        <br>

        كلمة المرور الافتراضية =
        آخر 6 أرقام من هاتف الطالب.

        <br>

        يجب اختيار المجموعة الأساسية
        ومجموعة الحل.

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
      .getElementById("ssolution")
      .value;


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


  // منع تكرار رقم الطالب
  const {
    data: existingStudent
  } =
    await sb
      .from("students")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();


  if (existingStudent) {

    alert(
      "رقم هاتف الطالب مسجل بالفعل."
    );

    return;
  }


  // منع تكرار رقم ولي الأمر مع طالب آخر
  if (parentPhone) {

    const {
      data: existingParent
    } =
      await sb
        .from("students")
        .select("id")
        .eq(
          "parent_phone",
          parentPhone
        )
        .maybeSingle();


    if (existingParent) {

      alert(
        "رقم هاتف ولي الأمر مسجل بالفعل لطالب آخر."
      );

      return;
    }

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

    button.disabled =
      true;

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

            <strong>
              اسم الطالب:
            </strong>

            ${esc(
              student.name
            )}

          </p>


          <p>

            <strong>
              ID الطالب:
            </strong>

            ${esc(
              student.student_id
            )}

          </p>


          <p>

            <strong>
              كلمة المرور:
            </strong>

            ${esc(
              student.password
            )}

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

      button.disabled =
        false;

      button.textContent =
        oldText;

    }

  }

}


// =====================================================
// المجموعات
// =====================================================

async function loadGroups() {

  if (!sb)
    return;


  const {
    data,
    error
  } =
    await sb
      .from("groups")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  const mainList =
    document.getElementById(
      "groupList"
    );

  const solutionList =
    document.getElementById(
      "solutionGroupList"
    );


  if (error) {

    console.error(error);

    const msg =
      `خطأ: ${esc(
        error.message
      )}`;

    if (mainList)
      mainList.innerHTML =
        `<div class="error">${msg}</div>`;

    if (solutionList)
      solutionList.innerHTML =
        `<div class="error">${msg}</div>`;

    return;
  }


  const mainGroups =
    (data || []).filter(
      group =>
        !group.type ||
        group.type === "main"
    );


  const solutionGroups =
    (data || []).filter(
      group =>
        group.type === "solution"
    );


  if (mainList) {

    mainList.innerHTML =
      mainGroups.length
        ? mainGroups
            .map(
              group =>
                groupCardHTML(
                  group,
                  false
                )
            )
            .join("")
        : `
          <div class="empty">
            لا توجد مجموعات أساسية.
          </div>
        `;

  }


  if (solutionList) {

    solutionList.innerHTML =
      solutionGroups.length
        ? solutionGroups
            .map(
              group =>
                groupCardHTML(
                  group,
                  true
                )
            )
            .join("")
        : `
          <div class="empty">
            لا توجد مجموعات حل.
          </div>
        `;

  }

}


// =====================================================
// بطاقة المجموعة
// =====================================================

function groupCardHTML(
  group,
  isSolution
) {

  return `

    <div
      class="card"
      style="margin-bottom:12px"
    >

      <div class="section-head">

        <div>

          <h3>

            ${esc(
              group.name ||
              "مجموعة بدون اسم"
            )}

          </h3>

          <small>

            ${
              isSolution
                ? "مجموعة حل"
                : "مجموعة أساسية"
            }

          </small>

        </div>


        ${
          currentProfile.role ===
          "admin"
            ? `
              <button
                class="btn secondary"
                onclick='editGroup(${JSON.stringify(
                  group
                )})'
              >
                تعديل
              </button>
            `
            : ""
        }

      </div>


      <p>

        الصف:
        ${gradeArabic(
          group.grade
        )}

      </p>


      <p>

        الأيام:

        ${
          isSolution
            ? formatSolutionDays(
                group
              )
            : formatGroupDays(
                group
              )
        }

      </p>


      <p>

        الموعد:

        ${
          group.start_time
            ? formatTime(
                group.start_time
              )
            : "—"
        }

        ${
          group.end_time
            ? `
              إلى
              ${formatTime(
                group.end_time
              )}
            `
            : ""
        }

      </p>


      <p>

        مدة المجموعة:

        ${
          group.duration_minutes ||
          60
        }

        دقيقة

      </p>

    </div>

  `;

}


// =====================================================
// إضافة مجموعة
// =====================================================

function addGroup(type) {

  const isSolution =
    type === "solution";


  openModal(`

    <h2>

      ${
        isSolution
          ? "إضافة مجموعة حل"
          : "إضافة مجموعة أساسية"
      }

    </h2>


    <form
      class="form"
      onsubmit="saveGroup(event, '${type}')"
    >


      <label>

        اسم المجموعة

        <input
          id="groupName"
          required
          placeholder="مثال: مجموعة السبت والثلاثاء"
        >

      </label>


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


      ${
        isSolution
          ? `

            <label>

              اليوم الأول

              <select
                id="groupDay1"
                required
              >

                <option value="">
                  اختر اليوم
                </option>

                <option value="sunday">
                  الأحد
                </option>

                <option value="tuesday">
                  الثلاثاء
                </option>

                <option value="thursday">
                  الخميس
                </option>

              </select>

            </label>


            <label>

              اليوم الثاني

              <select
                id="groupDay2"
              >

                <option value="">
                  —
                </option>

                <option value="sunday">
                  الأحد
                </option>

                <option value="tuesday">
                  الثلاثاء
                </option>

                <option value="thursday">
                  الخميس
                </option>

              </select>

            </label>


            <label>

              اليوم الثالث

              <select
                id="groupDay3"
              >

                <option value="">
                  —
                </option>

                <option value="sunday">
                  الأحد
                </option>

                <option value="tuesday">
                  الثلاثاء
                </option>

                <option value="thursday">
                  الخميس
                </option>

              </select>

            </label>

          `
          : `

            <label>

              اليوم الأول

              <select
                id="groupDay1"
                required
              >

                <option value="">
                  اختر اليوم
                </option>

                <option value="saturday">
                  السبت
                </option>

                <option value="sunday">
                  الأحد
                </option>

                <option value="monday">
                  الاثنين
                </option>

              </select>

            </label>


            <label>

              اليوم الثاني

              <select
                id="groupDay2"
                required
              >

                <option value="">
                  اختر اليوم
                </option>

                <option value="tuesday">
                  الثلاثاء
                </option>

                <option value="wednesday">
                  الأربعاء
                </option>

                <option value="thursday">
                  الخميس
                </option>

              </select>

            </label>

          `
      }


      <label>

        وقت البداية

        <input
          id="groupStart"
          type="time"
          value="${
            isSolution
              ? "10:00"
              : ""
          }"
          required
        >

      </label>


      ${
        isSolution
          ? `

            <label>

              وقت النهاية

              <input
                id="groupEnd"
                type="time"
                value="12:00"
                required
              >

            </label>

          `
          : ""
      }


      <label>

        مدة المجموعة بالدقائق

        <input
          id="groupDuration"
          type="number"
          min="30"
          value="${
            isSolution
              ? 120
              : 60
          }"
          required
        >

      </label>


      <div class="notice">

        ${
          isSolution
            ? `
              مجموعة الحل للثالث الثانوي
              تكون في الأحد أو الثلاثاء أو الخميس.
              الطالب يحضر يومًا واحدًا فقط.
              الجمعة إجازة.
            `
            : `
              المجموعة الأساسية لها يومان أسبوعيًا،
              مثل السبت والثلاثاء أو الأحد والأربعاء
              أو الاثنين والخميس.
              مدة الحصة ساعة.
            `
        }

      </div>


      <button
        class="btn"
        type="submit"
      >

        حفظ المجموعة

      </button>


    </form>

  `);

}


// =====================================================
// حفظ المجموعة
// =====================================================

async function saveGroup(
  e,
  type
) {

  e.preventDefault();


  const name =
    document
      .getElementById(
        "groupName"
      )
      .value
      .trim();


  const grade =
    document
      .getElementById(
        "groupGrade"
      )
      .value;


  const day1 =
    document
      .getElementById(
        "groupDay1"
      )
      .value;


  const day2 =
    document
      .getElementById(
        "groupDay2"
      )
      ?.value || null;


  const day3 =
    document
      .getElementById(
        "groupDay3"
      )
      ?.value || null;


  const startTime =
    document
      .getElementById(
        "groupStart"
      )
      .value;


  const endTime =
    document
      .getElementById(
        "groupEnd"
      )
      ?.value || null;


  const duration =
    Number(
      document
        .getElementById(
          "groupDuration"
        )
        .value
    );


  if (!name) {

    alert(
      "اكتب اسم المجموعة."
    );

    return;
  }


  if (!grade) {

    alert(
      "اختر الصف."
    );

    return;
  }


  if (!day1) {

    alert(
      "اختر اليوم."
    );

    return;
  }


  if (
    type === "main" &&
    !day2
  ) {

    alert(
      "المجموعة الأساسية تحتاج يومين."
    );

    return;
  }


  if (!startTime) {

    alert(
      "اختر وقت البداية."
    );

    return;
  }


  if (
    type === "solution" &&
    !endTime
  ) {

    alert(
      "اختر وقت النهاية."
    );

    return;
  }


  const {
    error
  } =
    await sb
      .from("groups")
      .insert({

        name,

        grade,

        type,

        day1,

        day2,

        day3,

        start_time:
          startTime,

        end_time:
          endTime,

        duration_minutes:
          duration

      });


  if (error) {

    console.error(error);

    alert(
      error.message
    );

    return;
  }


  closeModal();

  await loadGroups();

}


// =====================================================
// تعديل مجموعة
// =====================================================

function editGroup(group) {

  const isSolution =
    group.type ===
    "solution";


  openModal(`

    <h2>
      تعديل المجموعة
    </h2>


    <form
      class="form"
      onsubmit="updateGroup(event, '${group.id}', '${group.type}')"
    >

      <label>

        اسم المجموعة

        <input
          id="groupName"
          value="${esc(
            group.name || ""
          )}"
          required
        >

      </label>


      <label>

        الصف

        <select
          id="groupGrade"
          required
        >

          <option
            value="first_secondary"
            ${
              group.grade ===
              "first_secondary"
                ? "selected"
                : ""
            }
          >
            الأول الثانوي
          </option>

          <option
            value="third_secondary"
            ${
              group.grade ===
              "third_secondary"
                ? "selected"
                : ""
            }
          >
            الثالث الثانوي
          </option>

        </select>

      </label>


      <label>

        اليوم الأول

        <select
          id="groupDay1"
          required
        >

          ${daysOptions(
            group.day1
          )}

        </select>

      </label>


      <label>

        اليوم الثاني

        <select
          id="groupDay2"
        >

          ${daysOptions(
            group.day2
          )}

        </select>

      </label>


      ${
        isSolution
          ? `

            <label>

              اليوم الثالث

              <select
                id="groupDay3"
              >

                ${daysOptions(
                  group.day3
                )}

              </select>

            </label>

          `
          : ""
      }


      <label>

        وقت البداية

        <input
          id="groupStart"
          type="time"
          value="${esc(
            normalizeTime(
              group.start_time
            )
          )}"
          required
        >

      </label>


      ${
        isSolution
          ? `

            <label>

              وقت النهاية

              <input
                id="groupEnd"
                type="time"
                value="${esc(
                  normalizeTime(
                    group.end_time
                  )
                )}"
                required
              >

            </label>

          `
          : ""
      }


      <label>

        مدة المجموعة بالدقائق

        <input
          id="groupDuration"
          type="number"
          min="30"
          value="${
            group.duration_minutes ||
            (isSolution
              ? 120
              : 60)
          }"
          required
        >

      </label>


      <button
        class="btn"
        type="submit"
      >

        حفظ التعديلات

      </button>

    </form>

  `);

}


// =====================================================
// تحديث مجموعة
// =====================================================

async function updateGroup(
  e,
  id,
  type
) {

  e.preventDefault();


  const updates = {

    name:
      document
        .getElementById(
          "groupName"
        )
        .value
        .trim(),

    grade:
      document
        .getElementById(
          "groupGrade"
        )
        .value,

    day1:
      document
        .getElementById(
          "groupDay1"
        )
        .value,

    day2:
      document
        .getElementById(
          "groupDay2"
        )
        ?.value || null,

    day3:
      document
        .getElementById(
          "groupDay3"
        )
        ?.value || null,

    start_time:
      document
        .getElementById(
          "groupStart"
        )
        .value,

    end_time:
      document
        .getElementById(
          "groupEnd"
        )
        ?.value || null,

    duration_minutes:
      Number(
        document
          .getElementById(
            "groupDuration"
          )
          .value
      )

  };


  const {
    error
  } =
    await sb
      .from("groups")
      .update(updates)
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      error.message
    );

    return;
  }


  closeModal();

  await loadGroups();

}


// =====================================================
// خيارات الأيام
// =====================================================

function daysOptions(selected) {

  const days = [

    ["", "—"],

    ["saturday", "السبت"],

    ["sunday", "الأحد"],

    ["monday", "الاثنين"],

    ["tuesday", "الثلاثاء"],

    ["wednesday", "الأربعاء"],

    ["thursday", "الخميس"]

  ];


  return days
    .map(
      day => `

        <option
          value="${day[0]}"
          ${
            selected === day[0]
              ? "selected"
              : ""
          }
        >

          ${day[1]}

        </option>

      `
    )
    .join("");

}


// =====================================================
// أسماء الأيام
// =====================================================

function dayArabic(day) {

  return {

    saturday: "السبت",

    sunday: "الأحد",

    monday: "الاثنين",

    tuesday: "الثلاثاء",

    wednesday: "الأربعاء",

    thursday: "الخميس"

  }[day] || "—";

}


// =====================================================
// أيام المجموعة الأساسية
// =====================================================

function formatGroupDays(group) {

  const result = [];

  if (group?.day1)
    result.push(
      dayArabic(
        group.day1
      )
    );

  if (group?.day2)
    result.push(
      dayArabic(
        group.day2
      )
    );

  return result.join(" - ") || "—";

}


// =====================================================
// أيام مجموعة الحل
// =====================================================

function formatSolutionDays(group) {

  const result = [];

  if (group?.day1)
    result.push(
      dayArabic(
        group.day1
      )
    );

  if (group?.day2)
    result.push(
      dayArabic(
        group.day2
      )
    );

  if (group?.day3)
    result.push(
      dayArabic(
        group.day3
      )
    );

  return result.join(" - ") || "—";

}


// =====================================================
// الوقت
// =====================================================

function normalizeTime(time) {

  if (!time)
    return "";

  return String(
    time
  ).substring(
    0,
    5
  );

}


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
    parts[1] || "00";

  const period =
    hour >= 12
      ? "م"
      : "ص";

  hour =
    hour % 12 || 12;

  return `${hour}:${minute} ${period}`;

}


// =====================================================
// الصف
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
            .getElementById(
              "profileName"
            )
            .value,

        phone:
          document
            .getElementById(
              "profilePhone"
            )
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
    currentProfile.role ===
    "student"
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
// الحضور
// =====================================================

async function saveAttendance() {

  alert(
    "سيتم ربط نظام الحضور تلقائيًا حسب أيام المجموعة في الخطوة التالية."
  );

}


// =====================================================
// PDF
// =====================================================

function studentPDF(s) {

  const html = `

    <!doctype html>

    <html
      lang="ar"
      dir="rtl"
    >

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
            [
              "الاسم",
              s.full_name
            ],

            [
              "ID",
              s.student_id
            ],

            [
              "الصف",
              gradeArabic(
                s.grade
              )
            ],

            [
              "الهاتف",
              s.phone || ""
            ],

            [
              "ولي الأمر",
              s.parent_phone || ""
            ],

            [
              "المجموعة الأساسية",
              s.groups?.name || "—"
            ],

            [
              "أيام المجموعة",
              formatGroupDays(
                s.groups
              )
            ],

            [
              "مجموعة الحل",
              s.solution_group?.name ||
              "—"
            ],

            [
              "أيام الحل",
              formatSolutionDays(
                s.solution_group
              )
            ],

            [
              "نسبة الحضور",
              (
                s.attendance_percent ??
                0
              ) + "%"
            ],

            [
              "النقاط",
              s.points ??
              0
            ]

          ]
            .map(
              x => `

                <tr>

                  <td class="h">
                    ${esc(
                      x[0]
                    )}
                  </td>

                  <td>
                    ${esc(
                      x[1]
                    )}
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


  w.document.write(
    html
  );

  w.document.close();

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
        .then(
          loaded => {

            document.fonts.add(
              loaded
            );

            document.body.style.fontFamily =
              "UploadedFont,Arial";

            alert(
              "تم تطبيق الخط على الجلسة الحالية."
            );

          }
        );

    };


  reader.readAsArrayBuffer(
    file
  );

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

  if (modalContent)
    modalContent.innerHTML =
      content;

  if (modal)
    modal.classList.remove(
      "hidden"
    );

}


function closeModal() {

  const modal =
    document.getElementById(
      "modal"
    );

  if (modal)
    modal.classList.add(
      "hidden"
    );

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
