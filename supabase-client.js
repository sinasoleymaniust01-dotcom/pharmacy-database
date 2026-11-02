const SUPABASE_URL = "https://fhcfajvmlbhirxddizmx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_pJhiRET7aApo6i4kW-r36Q_IDxKR2AM";

if (!window.supabase) {
    throw new Error("کتابخانه Supabase بارگذاری نشده است.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// در دسترس بودن کلاینت برای سایر فایل‌ها
window.supabaseClient = supabaseClient;