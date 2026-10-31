let drugs = [];

const drugList = document.getElementById("drugList");
const searchInput = document.getElementById("searchInput");
const groupFilter = document.getElementById("groupFilter");
const drugCount = document.getElementById("drugCount");
const importantPageButton = document.getElementById("importantPageButton");

const drugGroupNames = {
    1: "قلبی و عروقی",
    2: "گوارشی",
    3: "آنتی‌بیوتیک‌ها و ضد قارچ و ضد ویروس",
    4: "اعصاب و روان",
    5: "هورمونی و تناسلی",
    6: "تنفسی و آنتی‌هیستامین",
    7: "ضد درد و التهاب",
    8: "ویتامین‌ها و مکمل‌ها",
    9: "غدد درون‌ریز",
    10: "سایر داروها و گروه‌های تخصصی"
};

const ITEMS_PER_PAGE = 50;

const EDITOR_EMAILS = [
    "sina.soleymaniust01@gmail.com",
    "hooman.movahed@gmail.com"
];

let currentDisplayedDrugs = [];
let currentPage = 1;
let annotationsByGenericName = {};
let canEditDrugs = false;
let showingImportantDrugs = false;


// ایمن‌سازی متن‌ها
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// بزرگ کردن حرف اول نام
function capitalizeFirstLetter(name) {
    if (!name) return "";
    return String(name).charAt(0).toUpperCase() + String(name).slice(1);
}


// شناسه دارو
function getDrugKey(drug) {
    return String(
        drug.genericName || drug.generic_name || ""
    ).trim().toLowerCase();
}


// دریافت اطلاعات تکمیلی دارو
function getAnnotation(drug) {
    return annotationsByGenericName[getDrugKey(drug)] || {
        is_important: false,
        assigned_groups: [],
        teacher_notes: ""
    };
}


// ساخت فیلتر گروه‌ها
function createGroupOptions() {
    groupFilter.innerHTML =
        '<option value="">همه گروه‌ها</option>';

    Object.entries(drugGroupNames).forEach(([number, name]) => {
        const option = document.createElement("option");
        option.value = number;
        option.textContent = `گروه ${number}: ${name}`;
        groupFilter.appendChild(option);
    });
}


// به‌روزرسانی دکمه داروهای مهم
function updateImportantPageButton() {
    if (!importantPageButton) return;

    if (showingImportantDrugs) {
        importantPageButton.classList.add("active");

        importantPageButton.innerHTML = `
            <span class="important-page-star"></span>
            <span class="important-page-text">بازگشت به همه داروها</span>
        `;
    } else {
        importantPageButton.classList.remove("active");

        importantPageButton.innerHTML = `
            <span class="important-page-star">★</span>
            <span class="important-page-text">داروهای مهم</span>
        `;
    }
}


// کلیک روی دکمه صفحه داروهای مهم
importantPageButton.addEventListener("click", () => {
    showingImportantDrugs = !showingImportantDrugs;

    currentPage = 1;

    updateImportantPageButton();
    filterDrugs();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


// ساخت کارت دارو
function renderDrugCard(drug) {
    const key = getDrugKey(drug);
    const annotation = getAnnotation(drug);

    const isImportant = annotation.is_important === true;

    const assignedGroups = Array.isArray(annotation.assigned_groups)
        ? annotation.assigned_groups.map(Number)
        : [];

    const brands = Array.isArray(drug.brandNames)
        ? drug.brandNames
        : drug.brandNames ? [drug.brandNames] : [];

    const controls = canEditDrugs
        ? `
            <div class="drug-card-controls">

                <button
                    type="button"
                    class="important-toggle ${isImportant ? "is-important" : ""}"
                    data-drug-key="${escapeHTML(key)}"
                    aria-label="علامت‌گذاری داروی مهم"
                    title="مهم کردن دارو"
                >${isImportant ? "✓" : ""}</button>

                <label class="drug-group-control">
                    <span>شماره گروه </span>
                    <input
                        type="text"
                        class="drug-group-input"
                        value="${escapeHTML(assignedGroups.join("-"))}"
                        data-drug-key="${escapeHTML(key)}"
                        placeholder="_"
                        aria-label="شماره گروه دارو"
                    >
                </label>

            </div>
        `
        : `
            <div class="drug-card-controls">
                ${isImportant
                    ? '<span class="important-display">✓</span>'
                    : ""
                }

                ${assignedGroups.length
                    ? `<span>گروه: ${escapeHTML(assignedGroups.join("، "))}</span>`
                    : ""
                }
            </div>
        `;

    const notes = canEditDrugs
        ? `
            <div class="teacher-notes">
                <label
                    class="persian"
                    for="notes-${escapeHTML(key)}"
                >توضیحات :</label>

                <textarea
                    id="notes-${escapeHTML(key)}"
                    class="teacher-notes-input persian"
                    data-drug-key="${escapeHTML(key)}"
                    placeholder="توضیحات تکمیلی ..."
                    rows="3"
                >${escapeHTML(annotation.teacher_notes || "")}</textarea>

                <small class="notes-status persian"></small>
            </div>
        `
        : (
            annotation.teacher_notes
                ? `
                    <div class="teacher-notes">
                        <strong class="persian">توضیحات استاد:</strong>
                        <p class="persian">${escapeHTML(annotation.teacher_notes)}</p>
                    </div>
                `
                : ""
        );

    return `
        <article class="drug-card">
            ${controls}

            <p>
                <strong class="persian">نام ژنریک:</strong>
                <span class="english" dir="ltr">
                    ${escapeHTML(capitalizeFirstLetter(drug.genericName || ""))}
                </span>
            </p>

            <p>
                <strong class="persian">نام تجاری:</strong>
                <span class="english" dir="ltr">
                    ${brands.map(brand =>
                        escapeHTML(capitalizeFirstLetter(brand))
                    ).join(", ")}
                </span>
            </p>

            <p>
                <strong class="persian">گروه دارویی :</strong>
                <span class="persian">
                    ${escapeHTML(drug.drugGroup || "")}
                </span>
            </p>

            <p>
                <strong class="persian">کاربرد:</strong>
                <span class="persian">
                    ${escapeHTML(drug.uses || "")}
                </span>
            </p>

            ${notes}
        </article>
    `;
}


// دریافت تمام اطلاعات تکمیلی داروها از Supabase
async function loadAnnotations() {
    console.log("در حال دریافت اطلاعات داروها از Supabase...");

    const pageSize = 1000;
    let allData = [];
    let from = 0;

    while (true) {
        const { data, error } = await supabaseClient
            .from("Drugs")
            .select("generic_name, is_important, assigned_groups, teacher_notes")
            .range(from, from + pageSize - 1);

        if (error) {
            console.error("خطا در دریافت اطلاعات:", error);
            throw error;
        }

        allData = allData.concat(data || []);

        if (!data || data.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    annotationsByGenericName = {};

    allData.forEach(row => {
        const key = String(row.generic_name || "")
            .trim()
            .toLowerCase();

        if (!key) return;

        annotationsByGenericName[key] = {
            is_important: row.is_important === true,
            assigned_groups: Array.isArray(row.assigned_groups)
                ? row.assigned_groups
                : [],
            teacher_notes: row.teacher_notes || ""
        };
    });

    console.log("تعداد کل اطلاعات دریافت‌شده:", allData.length);
}


// بررسی ورود و مجوز ویرایش
async function refreshEditorStatus() {
    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error("خطا در بررسی ورود:", error);
        canEditDrugs = false;
        return;
    }

    const email =
        data.session?.user?.email?.toLowerCase() || "";

    canEditDrugs = EDITOR_EMAILS.includes(email);

    console.log("کاربر واردشده:", email || "بدون ورود");
    console.log("اجازه ویرایش:", canEditDrugs);
}


// ذخیره تغییرات در Supabase
async function updateDrugAnnotation(key, changes) {
    console.log("تابع ذخیره اجرا شد:", { key, changes });

    if (!canEditDrugs) {
        throw new Error("اجازه ویرایش ندارید.");
    }

    const normalizedKey = String(key || "")
        .trim()
        .toLowerCase();

    if (!normalizedKey) {
        throw new Error("شناسه دارو خالی است.");
    }

    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        throw new Error("نشست کاربری معتبر نیست.");
    }

    const email =
        sessionData.session.user.email?.toLowerCase() || "";

    if (!EDITOR_EMAILS.includes(email)) {
        throw new Error("این حساب اجازه ویرایش ندارد.");
    }

    console.log("ارسال درخواست به Supabase...");

    const { data, error } = await supabaseClient
        .from("Drugs")
        .update(changes)
        .ilike("generic_name", normalizedKey)
        .select("generic_name");

    if (error) {
        console.error("خطای Supabase هنگام ذخیره:", error);
        throw error;
    }

    console.log("پاسخ Supabase:", data);

    if (!data || data.length === 0) {
        throw new Error(
            "هیچ ردیفی به‌روزرسانی نشد. نام دارو یا Policy را بررسی کن."
        );
    }

    annotationsByGenericName[normalizedKey] = {
        ...getAnnotation({ genericName: normalizedKey }),
        ...changes
    };

    console.log("ذخیره با موفقیت انجام شد.");

    return data;
}


// نمایش داروها
function displayDrugs(drugArray) {
    currentDisplayedDrugs = drugArray;

    const totalDrugs = drugArray.length;

    const totalPages = Math.max(
        1,
        Math.ceil(totalDrugs / ITEMS_PER_PAGE)
    );

    currentPage = Math.min(
        Math.max(currentPage, 1),
        totalPages
    );

    drugCount.textContent = showingImportantDrugs
        ? `تعداد داروهای مهم: ${totalDrugs}`
        : `تعداد داروها: ${totalDrugs} از ${drugs.length}`;

    if (totalDrugs === 0) {
        drugList.innerHTML =
            '<p class="no-result">دارویی پیدا نشد.</p>';

        renderPagination(0);
        return;
    }

    const startIndex =
        (currentPage - 1) * ITEMS_PER_PAGE;

    const pageDrugs = drugArray.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
    );

    drugList.innerHTML = pageDrugs
        .map(drug => renderDrugCard(drug))
        .join("");

    renderPagination(totalPages);
}


// صفحه‌بندی
function renderPagination(totalPages) {
    let pagination = document.getElementById("pagination");

    if (!pagination) {
        pagination = document.createElement("div");
        pagination.id = "pagination";
        pagination.className = "pagination";

        drugList.insertAdjacentElement("afterend", pagination);
    }

    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    pagination.innerHTML = `
        <button type="button" id="previousPage"
            ${currentPage === 1 ? "disabled" : ""}>
            صفحه قبل
        </button>

        <span class="page-info">
            صفحه ${currentPage} از ${totalPages}
        </span>

        <button type="button" id="nextPage"
            ${currentPage === totalPages ? "disabled" : ""}>
            صفحه بعد
        </button>
    `;

    document.getElementById("previousPage")
        .addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                displayDrugs(currentDisplayedDrugs);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });

    document.getElementById("nextPage")
        .addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                displayDrugs(currentDisplayedDrugs);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
}


// جست‌وجو و فیلتر داروها
function filterDrugs() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const selectedGroup = groupFilter.value;

    const filtered = drugs.filter(drug => {
        const brands = Array.isArray(drug.brandNames)
            ? drug.brandNames
            : drug.brandNames ? [drug.brandNames] : [];

        const annotation = getAnnotation(drug);

        const allInfo = [
            drug.genericName,
            drug.persianName,
            ...brands,
            drug.drugGroup,
            drug.uses,
            drug.category,
            drug.commonDoses,
            drug.dosageForms
        ].join(" ").toLocaleLowerCase();

        const matchesSearch = allInfo.includes(query);

        // صفحه مستقل داروهای مهم
        if (showingImportantDrugs) {
            return matchesSearch &&
                annotation.is_important === true;
        }

        // فیلتر عادی گروه‌ها
        const assignedGroups =
            Array.isArray(annotation.assigned_groups)
                ? annotation.assigned_groups.map(Number)
                : [];

        const matchesGroup =
            selectedGroup === "" ||
            assignedGroups.includes(Number(selectedGroup));

        return matchesSearch && matchesGroup;
    });

    currentPage = 1;
    displayDrugs(filtered);
}


searchInput.addEventListener("input", filterDrugs);
groupFilter.addEventListener("change", filterDrugs);


// ذخیره یا پاک کردن گروه‌بندی
drugList.addEventListener("change", async function (event) {
    if (!event.target.matches(".drug-group-input")) return;

    const input = event.target;
    const key = input.dataset.drugKey;
    const rawValue = input.value.trim();

    if (!canEditDrugs) {
        alert("اجازه ویرایش ندارید.");
        return;
    }

    let numbers = [];

    if (rawValue !== "") {
        const parts = rawValue.split("-").map(part => part.trim());

        const valid =
            parts.every(part => /^\d+$/.test(part)) &&
            parts.every(part => {
                const number = Number(part);
                return Number.isInteger(number) &&
                    number >= 1 &&
                    number <= 10;
            }) &&
            new Set(parts.map(Number)).size === parts.length;

        if (!valid) {
            alert("شماره گروه‌ها باید بین ۱ تا ۱۰ باشند؛ مثال: 1-3-5");

            input.value = (
                getAnnotation({ genericName: key }).assigned_groups || []
            ).join("-");

            return;
        }

        numbers = parts.map(Number);
    }

    try {
        await updateDrugAnnotation(key, {
            assigned_groups: numbers
        });

        filterDrugs();

    } catch (error) {
        console.error("خطای ذخیره گروه‌بندی:", error);

        alert("ذخیره گروه‌بندی ناموفق بود: " + error.message);

        input.value = (
            getAnnotation({ genericName: key }).assigned_groups || []
        ).join("-");
    }
});


// ذخیره یادداشت استاد
drugList.addEventListener("change", async function (event) {
    if (!event.target.matches(".teacher-notes-input")) return;

    const textarea = event.target;
    const key = textarea.dataset.drugKey;

    const status =
        textarea.parentElement.querySelector(".notes-status");

    if (status) status.textContent = "در حال ذخیره...";

    try {
        await updateDrugAnnotation(key, {
            teacher_notes: textarea.value
        });

        if (status) status.textContent = "ذخیره شد";

    } catch (error) {
        console.error("خطای ذخیره یادداشت:", error);

        if (status) status.textContent = "ذخیره ناموفق بود";

        alert("ذخیره توضیحات ناموفق بود: " + error.message);
    }
});


// کلیک روی دایره مهم‌کردن
drugList.addEventListener("click", async function (event) {
    const button = event.target.closest(".important-toggle");

    if (!button) return;

    if (!canEditDrugs) {
        alert("برای ویرایش باید با حساب مجاز وارد شوی.");
        return;
    }

    const key = button.dataset.drugKey;

    const current =
        getAnnotation({ genericName: key }).is_important === true;

    button.disabled = true;

    try {
        await updateDrugAnnotation(key, {
            is_important: !current
        });

        // به‌روزرسانی فهرست فعلی
        // اگر دارو در صفحه مهم‌ها از حالت مهم خارج شود،
        // از فهرست همان صفحه حذف خواهد شد.
        filterDrugs();

    } catch (error) {
        console.error("خطای تغییر وضعیت دارو:", error);
        alert("ذخیره وضعیت دارو ناموفق بود: " + error.message);
    }
});


// بارگذاری اطلاعات داروها
async function loadDrugs() {
    try {
        console.log("شروع بارگذاری برنامه...");

        await refreshEditorStatus();

        const response = await fetch("./drugs.json");

        if (!response.ok) {
            throw new Error("فایل drugs.json پیدا نشد.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("ساختار drugs.json معتبر نیست.");
        }

        drugs = data;

        await loadAnnotations();

        createGroupOptions();
        updateImportantPageButton();

        const sortedDrugs = [...drugs].sort((a, b) =>
            (a.persianName || a.genericName || "").localeCompare(
                b.persianName || b.genericName || "",
                "fa"
            )
        );

        currentPage = 1;
        displayDrugs(sortedDrugs);

        console.log("برنامه با موفقیت بارگذاری شد.");

    } catch (error) {
        console.error("خطا در بارگذاری اطلاعات:", error);

        drugCount.textContent = "بارگذاری اطلاعات ناموفق بود.";

        drugList.innerHTML = `
            <p class="no-result">
                اطلاعات داروها بارگذاری نشد.
                اتصال اینترنت، فایل drugs.json و تنظیمات Supabase را بررسی کن.
            </p>
        `;
    }
}


// تغییر وضعیت ورود و خروج
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("تغییر وضعیت ورود:", event);

    const email = session?.user?.email?.toLowerCase() || "";

    canEditDrugs = EDITOR_EMAILS.includes(email);

    console.log("حساب فعلی:", email || "بدون ورود");
    console.log("اجازه ویرایش:", canEditDrugs);

    if (drugs.length) {
        loadAnnotations()
            .then(() => {
                filterDrugs();
            })
            .catch(error => {
                console.error("خطا در دریافت مجدد اطلاعات:", error);
            });
    }
});


// شروع برنامه
loadDrugs();