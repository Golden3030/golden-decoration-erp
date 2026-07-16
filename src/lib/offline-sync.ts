import { supabase } from "@/lib/supabaseClient";

interface PendingTransaction {
  id: string;
  table: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  timestamp: number;
}

// دالة فحص وقراءة الذاكرة الدفاعية الآمنة لمنع انهيارات معالجة الـ JSON التالفة بالمتصفح
function getOfflineQueueSafe(): PendingTransaction[] {
  if (typeof window === "undefined") return [];
  const rawData = localStorage.getItem("offline_sync_queue");
  
  if (!rawData || rawData.trim() === "" || rawData === "undefined") {
    return [];
  }

  try {
    return JSON.parse(rawData);
  } catch (e) {
    // صمام الأمان: إذا تلف الكاش يمسحه الكود تلقائياً وينشئ طابوراً جديداً نظيفاً
    localStorage.removeItem("offline_sync_queue");
    return [];
  }
}

export function saveTransactionOffline(
  table: string, 
  action: "INSERT" | "UPDATE" | "DELETE", 
  payload: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  const pending: PendingTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    table,
    action,
    payload,
    timestamp: Date.now()
  };

  const currentQueue = getOfflineQueueSafe();
  currentQueue.push(pending);
  localStorage.setItem("offline_sync_queue", JSON.stringify(currentQueue));
  
  console.warn(`⚠️ انقطاع اتصال الإنترنت: تم حفظ المعاملة محلياً بجدول ${table} وسوف يتم مزامنتها فور العودة أونلاين.`);
}

export async function syncOfflineTransactionsToCloud() {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const currentQueue = getOfflineQueueSafe();

  if (currentQueue.length === 0) return;

  console.log(`🔄 جاري مزامنة ورفع ${currentQueue.length} معاملات معلقة محلياً إلى قاعدة البيانات...`);

  const failedTransactions: PendingTransaction[] = [];

  for (const tx of currentQueue) {
    try {
      let resultError = null;

      if (tx.action === "INSERT") {
        const { error } = await supabase.from(tx.table).insert(tx.payload);
        resultError = error;
      } else if (tx.action === "UPDATE") {
        const { error } = await supabase.from(tx.table).update(tx.payload).eq("id", tx.payload.id);
        resultError = error;
      } else if (tx.action === "DELETE") {
        const { error } = await supabase.from(tx.table).delete().eq("id", tx.payload.id);
        resultError = error;
      }

      if (resultError) throw resultError;

    } catch (err) {
      console.error(`فشلت مزامنة المعاملة ${tx.id} بجدول ${tx.table}:`, err);
      failedTransactions.push(tx);
    }
  }

  localStorage.setItem("offline_sync_queue", JSON.stringify(failedTransactions));
  
  if (failedTransactions.length === 0) {
    console.log("✅ تمت مزامنة كافة المعاملات المتأخرة بنجاح وتحديث السحابة بالكامل!");
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncOfflineTransactionsToCloud();
  });
}

/**
 * دالة موحدة وذكية لتنفيذ عمليات الإضافة/التعديل/الحذف
 * تحاول التنفيذ المباشر على Supabase، وإذا فشل بسبب انقطاع الشبكة (لا خطأ في البيانات نفسها)
 * تحفظ العملية تلقائياً في طابور المزامنة المحلي بدل فقدها.
 *
 * الاستخدام في أي شاشة:
 *   const result = await executeWithOfflineSupport("tasks", "INSERT", { title: "..." });
 *   إذا كانت result.offline تساوي true: أظهر رسالة "تم الحفظ مؤقتاً"
 */
export async function executeWithOfflineSupport(
  table: string,
  action: "INSERT" | "UPDATE" | "DELETE",
  payload: Record<string, unknown>
): Promise<{ success: boolean; offline: boolean; error?: unknown }> {
  // لو الجهاز أصلاً أوفلاين، احفظ مباشرة بدون محاولة اتصال فاشلة
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    saveTransactionOffline(table, action, payload);
    return { success: true, offline: true };
  }

  try {
    let error = null;

    if (action === "INSERT") {
      const res = await supabase.from(table).insert(payload);
      error = res.error;
    } else if (action === "UPDATE") {
      const res = await supabase.from(table).update(payload).eq("id", payload.id);
      error = res.error;
    } else if (action === "DELETE") {
      const res = await supabase.from(table).delete().eq("id", payload.id);
      error = res.error;
    }

    if (error) throw error;
    return { success: true, offline: false };

  } catch (err: any) {
    // التمييز بين خطأ شبكة حقيقي (نحفظ أوفلاين) وخطأ منطقي في البيانات (لا نحفظ، نرجع الخطأ كما هو)
    const isNetworkError =
      err?.message?.includes("fetch") ||
      err?.message?.includes("network") ||
      (typeof navigator !== "undefined" && !navigator.onLine);

    if (isNetworkError) {
      saveTransactionOffline(table, action, payload);
      return { success: true, offline: true };
    }

    return { success: false, offline: false, error: err };
  }
}

/**
 * دالة فحص حالة الاتصال بالإنترنت الحالية للجهاز.
 * تُستخدم في الشاشات للتحقق قبل اتخاذ قرار الحفظ المباشر أو الحفظ المحلي.
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * دالة مباشرة لإضافة عملية إلى طابور المزامنة المحلي.
 * هي اسم بديل (alias) يربط بنفس منطق saveTransactionOffline الأساسي،
 * لإتاحة استخدام نفس الواجهة بأسلوب (table, action, payload) في كل الشاشات.
 */
export function addToOfflineQueue(
  table: string,
  action: "INSERT" | "UPDATE" | "DELETE",
  payload: Record<string, unknown>
): void {
  saveTransactionOffline(table, action, payload);
}