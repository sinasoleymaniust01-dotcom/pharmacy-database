
const SUPABASE_URL = "https://fhcfajvmlbhirxddizmx.supabase.co";

// کلید Publishable پروژه را از پنل Supabase جایگزین کن
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pJhiRET7aApo6i4kW-r36Q_IDxKR2AM";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
