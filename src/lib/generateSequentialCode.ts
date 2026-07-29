import { supabase } from "@/lib/supabaseClient";

/**
 * بتولد كود تسلسلي (زي P-1005 أو CUST-2031) بناءً على أعلى رقم مسجل فعلياً
 * فى العمود المطلوب بنفس البادئة، وترجع الرقم اللي بعده مباشرة.
 *
 * ملحوظة: لو المشروع فيه أكتر من مستخدم بيضيفوا سجلات فى نفس اللحظة بالظبط،
 * فيه احتمال ضئيل جداً يتولد نفس الكود مرتين (race condition). الحل الأضمن
 * على المدى الطويل هو عمل sequence حقيقي فى قاعدة البيانات نفسها (Postgres SEQUENCE)،
 * لكن الطريقة دي كافية جداً لحجم الاستخدام الحالي وأفضل بمراحل من الترقيم العشوائي.
 */
export async function generateSequentialCode(
  table: string,
  column: string,
  prefix: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .ilike(column, `${prefix}-%`);

    if (error) throw error;

    let maxNum = 1000;
    (data || []).forEach((row: any) => {
      const val = row[column] as string;
      const match = val?.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `${prefix}-${maxNum + 1}`;
  } catch (err) {
    console.error(`تعذر توليد كود متسلسل لـ ${prefix}، سيتم استخدام رقم عشوائي احتياطي:`, err);
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
