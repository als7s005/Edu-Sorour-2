// =====================================================
// إنشاء الطالب
// =====================================================

async function createStudent(e) {
  e.preventDefault();

  if (!sb || !currentUser) {
    alert("يجب تسجيل الدخول أولًا.");
    return;
  }

  const form = e.target;

  // قراءة البيانات من الفورم نفسه
  const fullName =
    form.querySelector("#sn")?.value.trim() || "";

  const phone =
    form.querySelector("#sp")?.value.trim() || "";

  const parentPhone =
    form.querySelector("#sparent")?.value.trim() || "";

  const grade =
    form.querySelector("#sg")?.value || "";

  const groupId =
    form.querySelector("#sgrp")?.value || "";

  const solutionGroupElement =
    form.querySelector("#ssolution");

  const solutionGroupId =
    solutionGroupElement?.value || "";

  const seatNumber =
    form.querySelector("#seat")?.value.trim() || "";

  // ================================================
  // التحقق من البيانات
  // ================================================

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
    alert("يجب اختيار المجموعة الأساسية.");
    return;
  }

  // حل مشكلة مجموعة الحل
  if (!solutionGroupElement) {
    alert("لم يتم العثور على خانة مجموعة الحل.");
    console.error(
      "العنصر #ssolution غير موجود داخل الفورم"
    );
    return;
  }

  if (!solutionGroupId) {
    alert("يجب اختيار مجموعة الحل.");
    console.log(
      "قيمة مجموعة الحل الحالية:",
      solutionGroupElement.value
    );
    return;
  }

  // ================================================
  // التأكد من عدم تكرار رقم الهاتف
  // ================================================

  const {
    data: existingStudent,
    error: studentCheckError
  } = await sb
    .from("students")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (studentCheckError) {
    console.error(
      "خطأ أثناء فحص الطالب:",
      studentCheckError
    );
  }

  if (existingStudent) {
    alert("رقم هاتف الطالب مسجل بالفعل.");
    return;
  }

  // ================================================
  // التأكد من عدم تكرار هاتف ولي الأمر
  // ================================================

  if (parentPhone) {
    const {
      data: existingParent,
      error: parentCheckError
    } = await sb
      .from("students")
      .select("id")
      .eq("parent_phone", parentPhone)
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

  // ================================================
  // الحصول على الجلسة
  // ================================================

  const {
    data: sessionData,
    error: sessionError
  } = await sb.auth.getSession();

  if (
    sessionError ||
    !sessionData?.session
  ) {
    alert("انتهت جلسة تسجيل الدخول.");
    return;
  }

  // ================================================
  // تعطيل زر الحفظ
  // ================================================

  const button =
    form.querySelector(
      'button[type="submit"]'
    );

  const oldText =
    button?.textContent || "حفظ الطالب";

  if (button) {
    button.disabled = true;
    button.textContent =
      "جاري إنشاء الطالب...";
  }

  // ================================================
  // إرسال البيانات
  // ================================================

  try {

    console.log("بيانات الطالب قبل الإرسال:", {
      fullName,
      phone,
      parentPhone,
      grade,
      groupId,
      solutionGroupId,
      seatNumber
    });

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

    // محاولة قراءة الرد بأمان
    const result =
      await response.json().catch(
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
      result.student || {};

    // ================================================
    // إغلاق فورم الإضافة
    // ================================================

    closeModal();

    // ================================================
    // عرض بيانات الطالب
    // ================================================

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
              student.name ||
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
      button.disabled = false;
      button.textContent =
        oldText;
    }

  }
}
