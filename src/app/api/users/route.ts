import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 0. التحقق من إن الطالب مسجل دخول أصلاً وله دور "admin" — قبل أي حاجة تانية
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authCheckError } = await supabaseAuth.auth.getUser();

    if (authCheckError || !user) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً." }, { status: 401 });
    }

    const { data: requesterProfile } = await supabaseAuth
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح لك بإنشاء مستخدمين جدد." }, { status: 403 });
    }

    const { email, password, name, mobile, role } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "يرجى توفير البريد الإلكتروني، كلمة المرور، الاسم، والصلاحية." }, { status: 400 });
    }

    // 1. إنشاء عميل سوبابيز ذو الصلاحيات الخارقة (Service Role) للتحكم في معالجة الحسابات
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 2. إنشاء المستخدم الفعلي في نظام المصادقة الرئيسي auth.users بكلمة مرور مؤقتة وتأكيد بريده فورياً
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("فشل إنشاء حساب المستخدم في نظام المصادقة.");

    // 3. حفظ بيانات الموظف وصلاحياته في جدول المستخدمين العام لدينا
    const { error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id, // ربطه بمعرّف المصادقة الفريد
        name,
        email,
        mobile: mobile || null,
        role
      });

    if (profileError) {
      // صمام الأمان: في حال فشل إدخال بروفايل الموظف، نمسح حساب الـ Auth تلقائياً لضمان اتساق البيانات
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin User Creation Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}