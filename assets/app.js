// =====================================================
// EduCenter - Main JavaScript
// =====================================================

// =====================================================
// Supabase
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


// =====================================================
// المتغيرات العامة
// =====================================================

let currentUser = null;
let currentProfile = null;
let page = "dashboard";


// =====================================================
// عناوين الصفحات
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
// القوائم حسب الصلاحية
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

  try {

    const {
      data: {
        session
      },
      error
    } = await sb.auth.getSession();

    if (error) {

      console.error(
        "GET SESSION ERROR:",
        error
      );

      showLogin();

      setLoginMessage(
        "تعذر التحقق من جلسة تسجيل الدخول."
      );

      return;
    }

    if (session) {

      currentUser =
        session.user;

      await loadProfile();

    } else {

      showLogin();

    }

    sb.auth.onAuthStateChange(
      async (event, session) => {

        console.log(
          "AUTH EVENT:",
          event
        );

        if (session) {

          currentUser =
            session.user;

          await loadProfile();

        } else {

          currentUser = null;

          currentProfile = null;

          showLogin();

        }

      }
    );

  } catch (error) {

    console.error(
      "BOOT ERROR:",
      error
    );

    showLogin();

    setLoginMessage(
      "حدث خطأ أثناء تشغيل النظام."
    );

  }

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
  } =
    await sb
      .from("profiles")
      .select("*")
      .eq(
        "id",
        currentUser.id
      )
      .single();

  if (error || !data) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    showLogin();

    setLoginMessage(
      "لم يتم العثور على ملف الحساب."
    );

    return;
  }

  currentProfile =
    data;

  showApp();

  render();

}


// =====================================================
// إظهار تسجيل الدخول
// =====================================================

function showLogin() {

  const loginView =
    document.getElementById(
      "loginView"
    );

  const app =
    document.getElementById(
      "app"
    );

  if (loginView)
    loginView.classList.remove(
      "hidden"
    );

  if (app)
    app.classList.add(
      "hidden"
    );

}


// =====================================================
// إظهار التطبيق
// =====================================================

function showApp() {

  const loginView =
    document.getElementById(
      "loginView"
    );

  const app =
    document.getElementById(
      "app"
    );

  if (loginView)
    loginView.classList.add(
      "hidden"
    );

  if (app)
    app.classList.remove(
      "hidden"
    );


  const name =
    currentProfile?.full_name ||
    "مستخدم";


  const userName =
    document.getElementById(
      "userName"
    );

  const roleLabel =
    document.getElementById(
      "roleLabel"
    );

  const userMeta =
    document.getElementById(
      "userMeta"
    );

  const avatar =
    document.getElementById(
      "avatar"
    );


  if (userName)
    userName.textContent =
      name;


  if (roleLabel)
    roleLabel.textContent =
      roleArabic(
        currentProfile?.role
      );


  if (userMeta)
    userMeta.textContent =
      currentProfile?.role || "";


  if (avatar)
    avatar.textContent =
      name[0] || "م";

}


// =====================================================
// ترجمة الصلاحيات
// =====================================================

function roleArabic(role) {

  return {

    admin:
      "مدير",

    teacher:
      "معلم",

    student:
      "طالب"

  }[role] || role || "";

}


// =====================================================
// رسالة تسجيل الدخول
// =====================================================

function setLoginMessage(message) {

  const el =
    document.getElementById(
      "loginMsg"
    );

  if (el)
    el.textContent =
      message;

}


// =====================================================
// تسجيل الدخول
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const loginForm =
      document.getElementById(
        "loginForm"
      );

    if (!loginForm)
      return;


    loginForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();


        setLoginMessage("");


        if (!sb) {

          setLoginMessage(
            "اربط Supabase أولًا."
          );

          return;
        }


        const idInput =
          document.getElementById(
            "loginId"
          );

        const passwordInput =
          document.getElementById(
            "loginPassword"
          );


        const id =
          idInput?.value
            ?.trim() || "";


        const pass =
          passwordInput?.value || "";


        if (!id) {

          setLoginMessage(
            "اكتب رقم الـ ID أو البريد الإلكتروني."
          );

          return;
        }


        if (!pass) {

          setLoginMessage(
            "اكتب كلمة المرور."
          );

          return;
        }


        const button =
          loginForm.querySelector(
            'button[type="submit"]'
          );


        const oldText =
          button?.textContent ||
          "تسجيل الدخول";


        if (button) {

          button.disabled =
            true;

          button.textContent =
            "جاري تسجيل الدخول...";

        }


        try {

          let email =
            id;


          // لو المستخدم كتب ID طالب
          // نحاول الحصول على البريد من profiles

          if (
            !id.includes("@")
          ) {

            try {

              const {
                data: studentData,
                error: studentLookupError
              } =
                await sb
                  .from("profiles")
                  .select("email")
                  .eq(
                    "student_id",
                    id
                  )
                  .maybeSingle();


              if (studentLookupError) {

                console.warn(
                  "Student email lookup:",
                  studentLookupError
                );

              }


              if (
                studentData?.email
              ) {

                email =
                  studentData.email;

              }

            } catch (lookupError) {

              console.warn(
                "Student lookup error:",
                lookupError
              );

            }

          }


          const {
            data,
            error
          } =
            await sb.auth.signInWithPassword({

              email:
                email,

              password:
                pass

            });


          if (error) {

            console.error(
              "LOGIN ERROR:",
              error
            );

            setLoginMessage(
              "بيانات الدخول غير صحيحة."
            );

            return;
          }


          currentUser =
            data.user;


          await loadProfile();


        } catch (error) {

          console.error(
            "LOGIN EXCEPTION:",
            error
          );

          setLoginMessage(
            error?.message ||
            "حدث خطأ أثناء تسجيل الدخول."
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
    );

  }
);


// =====================================================
// تسجيل الخروج
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const logoutBtn =
      document.getElementById(
        "logout"
      );

    if (!logoutBtn)
      return;


    logoutBtn.onclick =
      async () => {

        if (!sb)
          return;


        try {

          await sb.auth.signOut();

        } catch (error) {

          console.error(
            "LOGOUT ERROR:",
            error
          );

        }

      };

  }
);


// =====================================================
// Render
// =====================================================

function render() {

  if (!currentProfile)
    return;


  const pageTitle =
    document.getElementById(
      "pageTitle"
    );

  const pageSub =
    document.getElementById(
      "pageSub"
    );


  if (pageTitle)
    pageTitle.textContent =
      titles[page]?.[0] || "";


  if (pageSub)
    pageSub.textContent =
      titles[page]?.[1] || "";


  const nav =
    document.getElementById(
      "nav"
    );


  if (nav) {

    nav.innerHTML =
      (
        navByRole[
          currentProfile.role
        ] || []
      )
        .map(
          item => `

            <button
              class="${
                item[0] === page
                  ? "active"
                  : ""
              }"
              data-page="${esc(item[0])}"
            >

              ${esc(item[1])}

            </button>

          `
        )
        .join("");


    nav
      .querySelectorAll("button")
      .forEach(button => {

        button.onclick =
          () => {

            page =
              button.dataset.page;

            render();

          };

      });

  }


  const content =
    document.getElementById(
      "content"
    );


  if (!content)
    return;


  content.innerHTML =
    pageHTML(page);


  if (
    page ===
    "students"
  )
    loadStudents();


  if (
    page ===
    "groups"
  )
    loadGroups();

}


// =====================================================
// صفحات الموقع
// =====================================================

function pageHTML(p) {

  // ===================================================
  // الطلاب
  // ===================================================

  if (p === "students") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>

            ${
              currentProfile.role ===
              "student"

                ? "بياناتي"

                : "الطلاب"

            }

          </h2>


          ${
            currentProfile.role ===
            "admin"

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


  // ===================================================
  // المعلمين
  // ===================================================

  if (p === "teachers") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>
            المعلمين
          </h2>


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

      <div class="grid2">

        <div class="card">

          <div class="section-head">

            <h2>
              المجموعات الأساسية
            </h2>


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

            <h2>
              مجموعات الحل
            </h2>


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


  // ===================================================
  // الحضور
  // ===================================================

  if (p === "attendance") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>
            الحضور
          </h2>


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


  // ===================================================
  // الامتحانات
  // ===================================================

  if (p === "exams") {

    return `

      <div class="card">

        <div class="section-head">

          <h2>
            الامتحانات
          </h2>


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


  // ===================================================
  // المحادثات
  // ===================================================

  if (p === "messages") {

    return `

      <div class="grid2">

        <div class="card">

          <h2>
            المحادثات
          </h2>


          <div
            id="chatList"
            class="empty"
          >

            جاري التحميل...

          </div>

        </div>


        <div class="card">

          <h2>
            المحادثة
          </h2>


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

        <h2>
          إرسال إشعار
        </h2>


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


          <button
            class="btn"
            type="submit"
          >

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
          نظام النقاط
        </h2>


        <p>

          النقاط مبنية على الحضور
          والامتحانات والتقييم الشهري.

        </p>

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

          <h2>
            بيانات الحساب
          </h2>


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


            <button
              class="btn"
              type="submit"
            >

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


  return dashboardHTML();

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
              currentProfile?.role ===
              "student"

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
          end_time,
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

    console.error(
      "LOAD STUDENTS ERROR:",
      error
    );


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
    currentProfile?.role ===
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
                      student.profiles?.full_name ||
                      "?"
                    )[0]
                  }

                </span>


                <b>

                  ${esc(
                    student.full_name ||
                    student.profiles?.full_name ||
                    "—"
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
                gradeArabic(
                  student.grade
                )
              )}

            </td>


            <td>

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

            </td>


            <td>

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

                            إلى

                            ${formatTime(
                              student.solution_group.end_time
                            )}

                          `

                          : ""

                      }

                    </small>

                  `

                  : ""

              }

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
                ).replace(/'/g, "&#39;")})'
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

    input.oninput =
      () => {

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

  if (!sb) {

    alert(
      "Supabase غير متصل."
    );

    return;
  }


  const {
    data: groups,
    error: groupsError
  } =
    await sb
      .from("groups")
      .select("*")
      .eq(
        "group_type",
        "main"
      )
      .order("name");


  const {
    data: solutionGroups,
    error: solutionError
  } =
    await sb
      .from("groups")
      .select("*")
      .eq(
        "group_type",
        "solution"
      )
      .order("name");


  if (groupsError)
    console.error(
      "MAIN GROUPS ERROR:",
      groupsError
    );


  if (solutionError)
    console.error(
      "SOLUTION GROUPS ERROR:",
      solutionError
    );


  const mainGroups =
    groups || [];


  const solGroups =
    solutionGroups || [];


  openModal(`

    <h2>
      إضافة طالب جديد
    </h2>


    <form
      id="createStudentForm"
      class="form"
      onsubmit="createStudent(event)"
    >

      <div class="form-grid">

        <label>

          الاسم

          <input
            id="sn"
            name="full_name"
            required
          >

        </label>


        <label>

          الهاتف

          <input
            id="sp"
            name="phone"
            required
            placeholder="مثال: 01012345678"
          >

        </label>


        <label>

          هاتف ولي الأمر

          <input
            id="sparent"
            name="parent_phone"
          >

        </label>


        <label>

          الصف

          <select
            id="sg"
            name="grade"
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
            name="group_id"
            required
          >

            <option value="">
              اختر المجموعة
            </option>


            ${
              mainGroups
                .map(
                  group => `

                    <option
                      value="${esc(group.id)}"
                    >

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


        <!-- ==========================================
             حصة الحل
             ========================================== -->

        <label>

          مجموعة الحل

          <select
            id="ssolution"
            name="solution_group_id"
            required
          >

            <option value="">
              اختر مجموعة الحل
            </option>


            ${
              solGroups
                .map(
                  group => `

                    <option
                      value="${esc(group.id)}"
                    >

                      ${esc(
                        group.name
                      )}

                      -
                      ${formatSolutionDays(
                        group
                      )}

                      -
                      ${formatTime(
                        group.start_time
                      )}

                      إلى

                      ${formatTime(
                        group.end_time
                      )}

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
            name="seat_number"
          >

        </label>

      </div>


      <div class="notice">

        سيتم إنشاء ID الطالب تلقائيًا.

        <br>

        كلمة المرور الافتراضية =
        آخر 6 أرقام من هاتف الطالب.

        <br>

        المجموعة الأساسية يومان أسبوعيًا.

        <br>

        حصة الحل يوم واحد فقط:
        الأحد أو الثلاثاء أو الخميس،
        من 10 صباحًا إلى 12 ظهرًا.

      </div>


      <button
        class="btn"
        type="submit"
      >

        حفظ الطالب

      </button>

    </form>

  `);


  // مراقبة حصة الحل

  const solutionSelect =
    document.getElementById(
      "ssolution"
    );


  if (solutionSelect) {

    solutionSelect.addEventListener(
      "change",
      function () {

        console.log(
          "تم اختيار حصة الحل:",
          this.value
        );

      }
    );

  }

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


  const form =
    e.target;


  // ===================================================
  // قراءة البيانات
  // ===================================================

  const fullName =
    form.querySelector("#sn")
      ?.value
      ?.trim() || "";


  const phone =
    form.querySelector("#sp")
      ?.value
      ?.trim() || "";


  const parentPhone =
    form.querySelector("#sparent")
      ?.value
      ?.trim() || "";


  const grade =
    form.querySelector("#sg")
      ?.value || "";


  const groupId =
    form.querySelector("#sgrp")
      ?.value || "";


  // ===================================================
  // حصة الحل
  // مهم:
  // تم تعريف المتغيرين مرة واحدة فقط
  // ===================================================

  const solutionSelect =
    form.querySelector(
      "#ssolution"
    );


  if (!solutionSelect) {

    alert(
      "خطأ: لم يتم العثور على خانة حصة الحل."
    );

    console.error(
      "ELEMENT #ssolution NOT FOUND"
    );

    return;
  }


  const solutionGroupId =
    String(
      solutionSelect.value || ""
    ).trim();


  const seatNumber =
    form.querySelector("#seat")
      ?.value
      ?.trim() || "";


  console.log(
    "========== CREATE STUDENT =========="
  );


  console.log(
    "fullName:",
    fullName
  );


  console.log(
    "phone:",
    phone
  );


  console.log(
    "grade:",
    grade
  );


  console.log(
    "groupId:",
    groupId
  );


  console.log(
    "solutionGroupId:",
    solutionGroupId
  );


  console.log(
    "seatNumber:",
    seatNumber
  );


  // ===================================================
  // التحقق
  // ===================================================

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


  // ===================================================
  // التحقق من حصة الحل
  // ===================================================

  if (!solutionGroupId) {

    alert(
      "يجب اختيار حصة الحل."
    );

    solutionSelect.focus();

    return;
  }


  // ===================================================
  // التأكد أن حصة الحل موجودة
  // ===================================================

  const {
    data: selectedSolutionGroup,
    error: solutionCheckError
  } =
    await sb
      .from("groups")
      .select(
        "id, name, group_type, grade, day1, start_time, end_time"
      )
      .eq(
        "id",
        solutionGroupId
      )
      .eq(
        "group_type",
        "solution"
      )
      .maybeSingle();


  if (solutionCheckError) {

    console.error(
      "SOLUTION GROUP CHECK ERROR:",
      solutionCheckError
    );


    alert(
      "حدث خطأ أثناء التأكد من حصة الحل."
    );


    return;
  }


  if (!selectedSolutionGroup) {

    alert(
      "حصة الحل التي اخترتها غير موجودة أو تم حذفها."
    );


    return;
  }


  console.log(
    "حصة الحل المؤكدة:",
    selectedSolutionGroup
  );


  // ===================================================
  // التأكد من عدم تكرار الهاتف
  // ===================================================

  const {
    data: existingStudent,
    error: studentCheckError
  } =
    await sb
      .from("students")
      .select("id")
      .eq(
        "phone",
        phone
      )
      .maybeSingle();


  if (studentCheckError) {

    console.error(
      "خطأ أثناء فحص الطالب:",
      studentCheckError
    );

  }


  if (existingStudent) {

    alert(
      "رقم هاتف الطالب مسجل بالفعل."
    );

    return;
  }


  // ===================================================
  // التأكد من عدم تكرار هاتف ولي الأمر
  // ===================================================

  if (parentPhone) {

    const {
      data: existingParent,
      error: parentCheckError
    } =
      await sb
        .from("students")
        .select("id")
        .eq(
          "parent_phone",
          parentPhone
        )
        .maybeSingle();


    if (parentCheckError) {

      console.error(
        "خطأ أثناء فحص هاتف ولي الأمر:",
        parentCheckError
      );

    }


    if (existingParent) {

      alert(
        "رقم هاتف ولي الأمر مسجل بالفعل لطالب آخر."
      );

      return;
    }

  }


  // ===================================================
  // الحصول على الجلسة
  // ===================================================

  const {
    data: sessionData,
    error: sessionError
  } =
    await sb.auth.getSession();


  if (
    sessionError ||
    !sessionData?.session
  ) {

    alert(
      "انتهت جلسة تسجيل الدخول."
    );

    return;
  }


  // ===================================================
  // تعطيل زر الحفظ
  // ===================================================

  const button =
    form.querySelector(
      'button[type="submit"]'
    );


  const oldText =
    button?.textContent ||
    "حفظ الطالب";


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "جاري إنشاء الطالب...";

  }


  // ===================================================
  // إرسال البيانات
  // ===================================================

  try {

    const payload = {

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

    };


    console.log(
      "البيانات المرسلة:",
      payload
    );


    const response =
      await fetch(
        `${window.SUPABASE_URL}/functions/v1/create-student`,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${sessionData.session.access_token}`,

            "apikey":
              window.SUPABASE_ANON_KEY

          },

          body:
            JSON.stringify(
              payload
            )

        }
      );


    const result =
      await response
        .json()
        .catch(
          () => ({})
        );


    console.log(
      "رد السيرفر:",
      result
    );


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
      result.student ||
      {};


    closeModal();


    openModal(`

      <div
        style="text-align:center"
      >

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
              student.name ||
              student.full_name ||
              fullName
            )}

          </p>


          <p>

            <strong>
              ID الطالب:
            </strong>

            ${esc(
              student.student_id ||
              "—"
            )}

          </p>


          <p>

            <strong>
              كلمة المرور:
            </strong>

            ${esc(
              student.password ||
              "—"
            )}

          </p>


          <p>

            <strong>
              حصة الحل:
            </strong>

            ${esc(
              selectedSolutionGroup.name ||
              "—"
            )}

          </p>

        </div>


        <button
          class="btn"
          onclick="closeModal(); loadStudents()"
        >

          تم

        </button>

      </div>

    `);


    await loadStudents();


  } catch (error) {

    console.error(
      "CREATE STUDENT ERROR:",
      error
    );


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
// تحميل المجموعات
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
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  const mainList =
    document.getElementById(
      "groupList"
    );


  const solutionList =
    document.getElementById(
      "solutionGroupList"
    );


  if (error) {

    console.error(
      "LOAD GROUPS ERROR:",
      error
    );


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
    (data || [])
      .filter(
        group =>
          group.group_type ===
          "main"
      );


  const solutionGroups =
    (data || [])
      .filter(
        group =>
          group.group_type ===
          "solution"
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
          currentProfile?.role ===
          "admin"

            ? `

              <button
                class="btn secondary"
                onclick='editGroup(${JSON.stringify(
                  group
                ).replace(/'/g, "&#39;")})'
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
          (isSolution
            ? 120
            : 60)
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

        الصف

        <select
          id="groupGrade"
          required
        >

          <option value="">
            اختر الصف
          </option>


          ${
            isSolution

              ? `

                <option value="third_secondary">

                  الثالث الثانوي

                </option>

              `

              : `

                <option value="first_secondary">

                  الأول الثانوي

                </option>


                <option value="third_secondary">

                  الثالث الثانوي

                </option>

              `

          }

        </select>

      </label>


      ${
        isSolution

          ? `

            <label>

              يوم حصة الحل

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


            <input
              type="hidden"
              id="groupDay2"
              value=""
            >


            <input
              type="hidden"
              id="groupDay3"
              value=""
            >


            <input
              type="hidden"
              id="groupStart"
              value="10:00"
            >


            <input
              type="hidden"
              id="groupEnd"
              value="12:00"
            >


            <input
              type="hidden"
              id="groupDuration"
              value="120"
            >


            <div class="notice">

              مجموعة الحل للثالث الثانوي فقط.

              <br>

              تختار يومًا واحدًا فقط:

              الأحد أو الثلاثاء أو الخميس.

              <br>

              الوقت ثابت من 10:00 صباحًا
              إلى 12:00 ظهرًا.

            </div>

          `

          : `

            <label>

              أيام المجموعة الأساسية

              <select
                id="mainSchedule"
                required
              >

                <option value="">
                  اختر أيام المجموعة
                </option>

                <option value="saturday_tuesday">
                  السبت والثلاثاء
                </option>

                <option value="sunday_wednesday">
                  الأحد والأربعاء
                </option>

                <option value="monday_thursday">
                  الاثنين والخميس
                </option>

              </select>

            </label>


            <input
              type="hidden"
              id="groupDay1"
            >


            <input
              type="hidden"
              id="groupDay2"
            >


            <input
              type="hidden"
              id="groupDay3"
              value=""
            >


            <label>

              وقت بداية المجموعة

              <input
                id="groupStart"
                type="time"
                required
              >

            </label>


            <input
              type="hidden"
              id="groupDuration"
              value="60"
            >


            <div class="notice">

              المجموعة الأساسية يومان أسبوعيًا.

              <br>

              السبت والثلاثاء

              <br>

              الأحد والأربعاء

              <br>

              الاثنين والخميس

              <br>

              مدة الحصة ساعة واحدة.

            </div>

          `

      }


      <div
        id="generatedGroupName"
        class="notice"
      >

        سيتم إنشاء اسم المجموعة تلقائيًا.

      </div>


      <button
        class="btn"
        type="submit"
      >

        حفظ المجموعة

      </button>

    </form>

  `);


  setupGroupNamePreview(
    type
  );

}


// =====================================================
// توليد اسم المجموعة
// =====================================================

function setupGroupNamePreview(type) {

  const grade =
    document.getElementById(
      "groupGrade"
    );


  const day =
    document.getElementById(
      "groupDay1"
    );


  const schedule =
    document.getElementById(
      "mainSchedule"
    );


  const start =
    document.getElementById(
      "groupStart"
    );


  const preview =
    document.getElementById(
      "generatedGroupName"
    );


  function update() {

    if (!preview)
      return;


    const gradeText =
      gradeArabic(
        grade?.value
      );


    if (
      type ===
      "solution"
    ) {

      const dayText =
        dayArabic(
          day?.value
        );


      if (
        !grade?.value ||
        !day?.value
      ) {

        preview.textContent =
          "سيتم إنشاء اسم المجموعة تلقائيًا.";

        return;
      }


      preview.innerHTML = `

        <strong>
          اسم المجموعة:
        </strong>

        ${esc(
          `${gradeText} - مجموعة الحل - ${dayText} - 10:00 ص إلى 12:00 م`
        )}

      `;


      return;

    }


    let daysText = "";


    if (
      schedule?.value ===
      "saturday_tuesday"
    ) {

      daysText =
        "السبت والثلاثاء";

    } else if (
      schedule?.value ===
      "sunday_wednesday"
    ) {

      daysText =
        "الأحد والأربعاء";

    } else if (
      schedule?.value ===
      "monday_thursday"
    ) {

      daysText =
        "الاثنين والخميس";

    }


    if (
      !grade?.value ||
      !schedule?.value ||
      !start?.value
    ) {

      preview.textContent =
        "سيتم إنشاء اسم المجموعة تلقائيًا.";

      return;
    }


    preview.innerHTML = `

      <strong>
        اسم المجموعة:
      </strong>

      ${esc(
        `${gradeText} - ${daysText} - ${formatTime(start.value)}`
      )}

    `;

  }


  grade?.addEventListener(
    "change",
    update
  );


  day?.addEventListener(
    "change",
    update
  );


  schedule?.addEventListener(
    "change",
    () => {

      const map = {

        saturday_tuesday:
          [
            "saturday",
            "tuesday"
          ],

        sunday_wednesday:
          [
            "sunday",
            "wednesday"
          ],

        monday_thursday:
          [
            "monday",
            "thursday"
          ]

      };


      const selected =
        map[
          schedule.value
        ];


      if (selected) {

        document
          .getElementById(
            "groupDay1"
          )
          .value =
            selected[0];


        document
          .getElementById(
            "groupDay2"
          )
          .value =
            selected[1];

      }


      update();

    }
  );


  start?.addEventListener(
    "change",
    update
  );


  update();

}


// =====================================================
// حفظ المجموعة
// =====================================================

async function saveGroup(
  e,
  type
) {

  e.preventDefault();


  if (!sb) {

    alert(
      "Supabase غير متصل."
    );

    return;
  }


  const isSolution =
    type === "solution";


  const grade =
    document
      .getElementById(
        "groupGrade"
      )
      ?.value || "";


  const day1 =
    document
      .getElementById(
        "groupDay1"
      )
      ?.value || "";


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


  let startTime;
  let endTime;
  let duration;


  if (isSolution) {

    startTime =
      "10:00";

    endTime =
      "12:00";

    duration =
      120;

  } else {

    startTime =
      document
        .getElementById(
          "groupStart"
        )
        ?.value || "";

    endTime =
      null;

    duration =
      60;

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
    !isSolution &&
    !day2
  ) {

    alert(
      "اختر أيام المجموعة الأساسية."
    );

    return;
  }


  if (
    !isSolution &&
    !startTime
  ) {

    alert(
      "اختر وقت بداية المجموعة."
    );

    return;
  }


  let groupName = "";


  if (isSolution) {

    groupName =
      `${gradeArabic(grade)} - مجموعة الحل - ${dayArabic(day1)} - 10:00 ص إلى 12:00 م`;

  } else {

    groupName =
      `${gradeArabic(grade)} - ${dayArabic(day1)} و${dayArabic(day2)} - ${formatTime(startTime)}`;

  }


  const {
    data: existing
  } =
    await sb
      .from("groups")
      .select("id")
      .eq(
        "group_type",
        type
      )
      .eq(
        "grade",
        grade
      )
      .eq(
        "day1",
        day1
      )
      .eq(
        "day2",
        day2
      )
      .maybeSingle();


  if (existing) {

    alert(
      "هذه المجموعة موجودة بالفعل."
    );

    return;
  }


  const {
    error
  } =
    await sb
      .from("groups")
      .insert({

        name:
          groupName,

        grade:
          grade,

        group_type:
          type,

        day1:
          day1,

        day2:
          day2,

        day3:
          day3,

        start_time:
          startTime,

        end_time:
          endTime,

        duration_minutes:
          duration,

        active:
          true

      });


  if (error) {

    console.error(
      "SAVE GROUP ERROR:",
      error
    );


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
    group.group_type ===
    "solution";


  openModal(`

    <h2>
      تعديل المجموعة
    </h2>


    <form
      class="form"
      onsubmit="updateGroup(event, '${esc(group.id)}', '${esc(group.group_type)}')"
    >

      <label>

        الصف

        <select
          id="groupGrade"
          required
        >

          ${
            isSolution

              ? `

                <option
                  value="third_secondary"
                  selected
                >

                  الثالث الثانوي

                </option>

              `

              : `

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

              `

          }

        </select>

      </label>


      ${
        isSolution

          ? `

            <label>

              يوم حصة الحل

              <select
                id="groupDay1"
                required
              >

                <option
                  value="sunday"
                  ${
                    group.day1 ===
                    "sunday"
                      ? "selected"
                      : ""
                  }
                >

                  الأحد

                </option>


                <option
                  value="tuesday"
                  ${
                    group.day1 ===
                    "tuesday"
                      ? "selected"
                      : ""
                  }
                >

                  الثلاثاء

                </option>


                <option
                  value="thursday"
                  ${
                    group.day1 ===
                    "thursday"
                      ? "selected"
                      : ""
                  }
                >

                  الخميس

                </option>

              </select>

            </label>


            <input
              type="hidden"
              id="groupDay2"
              value=""
            >


            <input
              type="hidden"
              id="groupDay3"
              value=""
            >


            <input
              type="hidden"
              id="groupStart"
              value="10:00"
            >


            <input
              type="hidden"
              id="groupEnd"
              value="12:00"
            >


            <input
              type="hidden"
              id="groupDuration"
              value="120"
            >


            <div class="notice">

              مجموعة الحل:

              يوم واحد فقط.

              <br>

              من 10:00 صباحًا
              إلى 12:00 ظهرًا.

            </div>

          `

          : `

            <label>

              أيام المجموعة الأساسية

              <select
                id="mainSchedule"
                required
              >

                <option value="">
                  اختر أيام المجموعة
                </option>


                <option
                  value="saturday_tuesday"
                  ${
                    group.day1 === "saturday" &&
                    group.day2 === "tuesday"
                      ? "selected"
                      : ""
                  }
                >

                  السبت والثلاثاء

                </option>


                <option
                  value="sunday_wednesday"
                  ${
                    group.day1 === "sunday" &&
                    group.day2 === "wednesday"
                      ? "selected"
                      : ""
                  }
                >

                  الأحد والأربعاء

                </option>


                <option
                  value="monday_thursday"
                  ${
                    group.day1 === "monday" &&
                    group.day2 === "thursday"
                      ? "selected"
                      : ""
                  }
                >

                  الاثنين والخميس

                </option>

              </select>

            </label>


            <input
              type="hidden"
              id="groupDay1"
              value="${esc(
                group.day1 || ""
              )}"
            >


            <input
              type="hidden"
              id="groupDay2"
              value="${esc(
                group.day2 || ""
              )}"
            >


            <input
              type="hidden"
              id="groupDay3"
              value=""
            >


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


            <input
              type="hidden"
              id="groupDuration"
              value="60"
            >

          `
      }


      <div
        id="generatedGroupName"
        class="notice"
      >

        اسم المجموعة يتولد تلقائيًا.

      </div>


      <button
        class="btn"
        type="submit"
      >

        حفظ التعديلات

      </button>

    </form>

  `);


  setupGroupNamePreview(
    group.group_type
  );

}


// =====================================================
// تحديث المجموعة
// =====================================================

async function updateGroup(
  e,
  id,
  type
) {

  e.preventDefault();


  const isSolution =
    type === "solution";


  const grade =
    document
      .getElementById(
        "groupGrade"
      )
      ?.value || "";


  const day1 =
    document
      .getElementById(
        "groupDay1"
      )
      ?.value || "";


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


  let startTime;
  let endTime;
  let duration;


  if (isSolution) {

    startTime =
      "10:00";

    endTime =
      "12:00";

    duration =
      120;

  } else {

    startTime =
      document
        .getElementById(
          "groupStart"
        )
        ?.value || "";

    endTime =
      null;

    duration =
      60;

  }


  let groupName;


  if (isSolution) {

    groupName =
      `${gradeArabic(grade)} - مجموعة الحل - ${dayArabic(day1)} - 10:00 ص إلى 12:00 م`;

  } else {

    groupName =
      `${gradeArabic(grade)} - ${dayArabic(day1)} و${dayArabic(day2)} - ${formatTime(startTime)}`;

  }


  const updates = {

    name:
      groupName,

    grade:
      grade,

    group_type:
      type,

    day1:
      day1,

    day2:
      day2,

    day3:
      day3,

    start_time:
      startTime,

    end_time:
      endTime,

    duration_minutes:
      duration

  };


  const {
    error
  } =
    await sb
      .from("groups")
      .update(
        updates
      )
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(
      "UPDATE GROUP ERROR:",
      error
    );


    alert(
      error.message
    );


    return;
  }


  closeModal();

  await loadGroups();

}


// =====================================================
// أسماء الأيام
// =====================================================

function dayArabic(day) {

  return {

    saturday:
      "السبت",

    sunday:
      "الأحد",

    monday:
      "الاثنين",

    tuesday:
      "الثلاثاء",

    wednesday:
      "الأربعاء",

    thursday:
      "الخميس"

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


  return (
    result.join(" - ") ||
    "—"
  );

}


// =====================================================
// أيام حصة الحل
// =====================================================

function formatSolutionDays(group) {

  if (!group)
    return "—";


  if (group.day1)
    return dayArabic(
      group.day1
    );


  return "—";

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
      .substring(
        0,
        5
      )
      .split(":");


  let hour =
    Number(
      parts[0]
    );


  const minute =
    parts[1] ||
    "00";


  const period =
    hour >= 12
      ? "م"
      : "ص";


  hour =
    hour % 12 ||
    12;


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

  }[grade] ||
  grade ||
  "—";

}


// =====================================================
// إعدادات الحساب
// =====================================================

async function saveProfile(e) {

  e.preventDefault();


  if (!sb || !currentUser)
    return;


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
            ?.value || "",

        phone:
          document
            .getElementById(
              "profilePhone"
            )
            ?.value || ""

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


      <button
        class="btn"
        type="submit"
      >

        تحديث

      </button>

    </form>

  `);

}


async function doPassword(e) {

  e.preventDefault();


  if (
    currentProfile?.role ===
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
      ?.value || "";


  const b =
    document
      .getElementById(
        "newPass2"
      )
      ?.value || "";


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

      password:
        a

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

      إضافة ${esc(title)}

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
// الحضور
// =====================================================

async function saveAttendance() {

  alert(
    "سيتم ربط نظام الحضور تلقائيًا حسب أيام المجموعة."
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
              s.full_name ||
              s.profiles?.full_name ||
              ""
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
              s.phone ||
              ""
            ],

            [
              "ولي الأمر",
              s.parent_phone ||
              ""
            ],

            [
              "المجموعة الأساسية",
              s.groups?.name ||
              "—"
            ],

            [
              "أيام المجموعة",
              formatGroupDays(
                s.groups
              )
            ],

            [
              "حصة الحل",
              s.solution_group?.name ||
              "—"
            ],

            [
              "يوم الحل",
              formatSolutionDays(
                s.solution_group
              )
            ],

            [
              "وقت الحل",
              s.solution_group

                ? `${formatTime(
                    s.solution_group.start_time
                  )} إلى ${formatTime(
                    s.solution_group.end_time
                  )}`

                : "—"

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
              "UploadedFont, Arial";


            alert(
              "تم تطبيق الخط على الجلسة الحالية."
            );

          }
        )
        .catch(
          error => {

            console.error(
              "FONT ERROR:",
              error
            );


            alert(
              "تعذر تحميل الخط."
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
    char => {

      return {

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        '"':
          "&quot;",

        "'":
          "&#039;"

      }[char];

    }
  );

}


// =====================================================
// تشغيل الموقع
// =====================================================

boot();
