let drugs = [];
let sortedDrugs = [];

const drugList = document.getElementById("drugList");
const searchInput = document.getElementById("searchInput");
const groupFilter = document.getElementById("groupFilter");
const drugCount = document.getElementById("drugCount");
const importantPageButton = document.getElementById("importantPageButton");

let showImportantOnly = false;

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


// تبدیل اعداد انگلیسی به فارسی
function toPersianNumber(value) {
    return String(value).replace(
        /\d/g,
        digit => "۰۱۲۳۴۵۶۷۸۹"[digit]
    );
}


// جلوگیری از ورود کد HTML ناخواسته
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// بزرگ کردن حرف اول نام انگلیسی
function capitalizeFirstLetter(name) {
    if (!name) return "";

    return String(name).charAt(0).toUpperCase()
        + String(name).slice(1);
}


// ساخت کلید یکتای دارو
function getDrugKey(drug) {
    return String(
        drug.genericName || drug.generic_name || ""
    ).trim().toLowerCase();
}


// دریافت اطلاعات تکمیلی هر دارو
function getAnnotation(drug) {
    return annotationsByGenericName[getDrugKey(drug)] || {
        is_important: false,
        assigned_groups: [],
        teacher_notes: ""
    };
}


// ساخت گزینه‌های فیلتر گروه دارویی
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


// ساخت کارت دارو
function renderDrugCard(drug, index) {
    const key = getDrugKey(drug);
    const annotation = getAnnotation(drug);

    const isImportant = annotation.is_important === true;

    const assignedGroups = Array.isArray(annotation.assigned_groups)
        ? annotation.assigned_groups.map(Number)
        : [];

    const brands = Array.isArray(drug.brandNames)
        ? drug.brandNames
        : drug.brandNames
            ? [drug.brandNames]
            : [];

    // کنترل‌های مخصوص استاد و ویرایشگر
    const controls = canEditDrugs ? `
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
    ` : (isImportant || assignedGroups.length ? `
        <div class="drug-card-controls">

            ${isImportant
                ? '<span class="important-display" title="داروی مهم">✓</span>'
                : ""}

            ${assignedGroups.length
                ? `<span class="assigned-groups-display">گروه: ${escapeHTML(assignedGroups.join("، "))}</span>`
                : ""}

        </div>
    ` : "");

    // یادداشت استاد
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

            <div class="drug-card-number">
                ${toPersianNumber(index + 1)}
            </div>

            ${controls}

            <p>
                <strong class="persian">نام ژنریک:</strong>

                <span class="english" dir="ltr">
                    ${escapeHTML(capitalizeFirstLetter(drug.genericName || drug.generic_name || ""))}
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


// دریافت اطلاعات تکمیلی از Supabase
async function loadAnnotations() {
    const pageSize = 1000;
    let allRows = [];
    let from = 0;

    while (true) {
        const { data, error } = await supabaseClient
            .from("Drugs")
            .select("generic_name, is_important, assigned_groups, teacher_notes")
            .range(from, from + pageSize - 1);

        if (error) {
            console.error(
                "خطا در دریافت اطلاعات تکمیلی از Supabase:",
                error
            );

            throw error;
        }

        if (data && data.length > 0) {
            allRows = allRows.concat(data);
        }

        if (!data || data.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    annotationsByGenericName = {};

    allRows.forEach(row => {
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
}


// ذخیره تغییرات دارو در Supabase
async function updateDrugAnnotation(key, changes) {
    if (!canEditDrugs) {
        throw new Error("اجازه ویرایش ندارید.");
    }

    const normalizedKey = String(key).trim().toLowerCase();

    const { data, error } = await supabaseClient
        .from("Drugs")
        .update(changes)
        .ilike("generic_name", normalizedKey)
        .select("generic_name");

    if (error) {
        console.error("خطا در ذخیره تغییرات:", error);
        throw error;
    }

    if (!data || data.length === 0) {
        throw new Error(
            "ردیفی با این نام ژنریک در جدول پیدا نشد یا اجازه ویرایش وجود ندارد."
        );
    }

    annotationsByGenericName[normalizedKey] = {
        ...getAnnotation({ genericName: normalizedKey }),
        ...changes
    };
}


// بررسی مجوز ویرایش کاربر
async function refreshEditorStatus() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("خطا در بررسی نشست کاربر:", error);
        canEditDrugs = false;
        return;
    }

    const email = data.session?.user?.email?.toLowerCase() || "";

    canEditDrugs = EDITOR_EMAILS.includes(email);
}


// فیلتر داروها بر اساس جست‌وجو، گروه و اهمیت
function getFilteredDrugs() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const selectedGroup = groupFilter.value;

    const filtered = sortedDrugs.filter(drug => {
        const key = getDrugKey(drug);
        const annotation = getAnnotation(drug);

        const brands = Array.isArray(drug.brandNames)
            ? drug.brandNames
            : drug.brandNames
                ? [drug.brandNames]
                : [];

        const allInfo = [
            drug.genericName,
            drug.generic_name,
            drug.persianName,
            ...brands,
            drug.drugGroup,
            drug.uses,
            drug.category,
            drug.commonDoses,
            drug.dosageForms
        ].join(" ").toLocaleLowerCase();

        const matchesSearch = allInfo.includes(query);

        const assignedGroups = Array.isArray(annotation.assigned_groups)
            ? annotation.assigned_groups.map(Number)
            : [];

        const matchesGroup =
            selectedGroup === "" ||
            assignedGroups.includes(Number(selectedGroup));

        const matchesImportant =
            !showImportantOnly ||
            annotation.is_important === true;

        return matchesSearch && matchesGroup && matchesImportant;
    });

    return filtered;
}


// نمایش داروها با صفحه‌بندی
function displayDrugs(drugArray) {
    currentDisplayedDrugs = drugArray;

    const totalDrugs = drugArray.length;

    // در حالت داروهای مهم، همه نتایج در یک صفحه نمایش داده می‌شوند
    const pageSize = showImportantOnly
        ? Math.max(totalDrugs, 1)
        : ITEMS_PER_PAGE;

    const totalPages = Math.max(
        1,
        Math.ceil(totalDrugs / pageSize)
    );

    currentPage = Math.min(
        Math.max(currentPage, 1),
        totalPages
    );

    drugCount.textContent =
        `تعداد داروها: ${toPersianNumber(totalDrugs)} از ${toPersianNumber(drugs.length)}`;

    if (totalDrugs === 0) {
        drugList.innerHTML = showImportantOnly
            ? '<p class="no-result">هنوز دارویی به فهرست داروهای مهم اضافه نشده است.</p>'
            : '<p class="no-result">دارویی پیدا نشد.</p>';

        renderPagination(0);
        return;
    }

    const startIndex = (currentPage - 1) * pageSize;

    const pageDrugs = drugArray.slice(
        startIndex,
        startIndex + pageSize
    );

    drugList.innerHTML = pageDrugs
        .map((drug, index) =>
            renderDrugCard(drug, startIndex + index)
        )
        .join("");

    renderPagination(totalPages);
}


// رفتن مستقیم به صفحه موردنظر
function goToPage(totalPages) {
    const input = document.getElementById("pageNumberInput");

    if (!input) return;

    const requestedPage = Number(input.value);

    if (
        input.value.trim() === "" ||
        !Number.isInteger(requestedPage) ||
        requestedPage < 1 ||
        requestedPage > totalPages
    ) {
        alert(
            `لطفاً شماره‌ای بین ۱ تا ${toPersianNumber(totalPages)} وارد کن.`
        );

        input.value = currentPage;
        return;
    }

    currentPage = requestedPage;

    displayDrugs(currentDisplayedDrugs);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ساخت صفحه‌بندی
function renderPagination(totalPages) {
    let pagination = document.getElementById("pagination");

    if (!pagination) {
        pagination = document.createElement("div");
        pagination.id = "pagination";
        pagination.className = "pagination";

        drugList.insertAdjacentElement(
            "afterend",
            pagination
        );
    }

    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    pagination.innerHTML = `
        <button
            type="button"
            id="previousPage"
            ${currentPage === 1 ? "disabled" : ""}
        >
            صفحه قبل
        </button>

        <div class="page-jump">

            <span class="page-info">
                صفحه ${toPersianNumber(currentPage)}
                از ${toPersianNumber(totalPages)}
            </span>

            <div class="page-search">

                <input
                    type="number"
                    id="pageNumberInput"
                    min="1"
                    max="${totalPages}"
                    value="${currentPage}"
                    aria-label="شماره صفحه"
                    placeholder="شماره صفحه"
                >

                <button
                    type="button"
                    id="goToPageButton"
                >
                    برو
                </button>

            </div>

        </div>

        <button
            type="button"
            id="nextPage"
            ${currentPage === totalPages ? "disabled" : ""}
        >
            صفحه بعد
        </button>
    `;

    document
        .getElementById("previousPage")
        .addEventListener("click", () => {

            if (currentPage > 1) {
                currentPage--;

                displayDrugs(currentDisplayedDrugs);

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        });

    document
        .getElementById("nextPage")
        .addEventListener("click", () => {

            if (currentPage < totalPages) {
                currentPage++;

                displayDrugs(currentDisplayedDrugs);

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        });

    document
        .getElementById("goToPageButton")
        .addEventListener("click", () => {
            goToPage(totalPages);
        });

    document
        .getElementById("pageNumberInput")
        .addEventListener("keydown", event => {

            if (event.key === "Enter") {
                goToPage(totalPages);
            }
        });
}


// جست‌وجو و فیلتر داروها
function filterDrugs() {
    currentPage = 1;
    displayDrugs(getFilteredDrugs());
}


// دکمه داروهای مهم
importantPageButton.addEventListener("click", function () {
    showImportantOnly = !showImportantOnly;

    importantPageButton.classList.toggle(
        "active",
        showImportantOnly
    );

    importantPageButton.querySelector(
        ".important-page-text"
    ).textContent = showImportantOnly
        ? "نمایش همه داروها"
        : "داروهای مهم";

    currentPage = 1;
    filterDrugs();
});


// جست‌وجو و فیلتر گروه
searchInput.addEventListener("input", filterDrugs);
groupFilter.addEventListener("change", filterDrugs);


// ذخیره گروه‌بندی و یادداشت استاد
drugList.addEventListener("change", async event => {

    // ذخیره شماره گروه‌ها
    if (event.target.matches(".drug-group-input")) {

        if (!canEditDrugs) return;

        const input = event.target;
        const key = input.dataset.drugKey;
        const rawValue = input.value.trim();

        if (rawValue === "") {
            try {
                await updateDrugAnnotation(key, {
                    assigned_groups: []
                });

                filterDrugs();

            } catch (error) {
                console.error(error);

                alert(
                    "ذخیره گروه‌بندی ناموفق بود. اتصال اینترنت را بررسی کن."
                );
            }

            return;
        }

        const parts = rawValue
            .split("-")
            .map(part => part.trim());

        const numbers = parts.map(Number);

        const valid =
            parts.every(part => /^\d+$/.test(part)) &&
            numbers.every(number =>
                Number.isInteger(number) &&
                number >= 1 &&
                number <= 10
            ) &&
            new Set(numbers).size === numbers.length;

        if (!valid) {
            alert(
                "شماره گروه‌ها باید بین ۱ تا ۱۰ باشند و با خط تیره جدا شوند؛ مثلاً 1-3-5"
            );

            const previous =
                getAnnotation({ genericName: key }).assigned_groups || [];

            input.value = previous.join("-");

            return;
        }

        try {
            await updateDrugAnnotation(key, {
                assigned_groups: numbers
            });

            filterDrugs();

        } catch (error) {
            console.error(error);

            alert(
                "ذخیره گروه‌بندی ناموفق بود. اتصال اینترنت را بررسی کن."
            );
        }
    }


    // ذخیره توضیحات استاد
    if (event.target.matches(".teacher-notes-input")) {

        if (!canEditDrugs) return;

        const textarea = event.target;
        const key = textarea.dataset.drugKey;

        const status =
            textarea.parentElement.querySelector(".notes-status");

        if (status) {
            status.textContent = "در حال ذخیره...";
        }

        try {
            await updateDrugAnnotation(key, {
                teacher_notes: textarea.value
            });

            if (status) {
                status.textContent = "ذخیره شد";
            }

        } catch (error) {
            console.error(error);

            if (status) {
                status.textContent = "ذخیره ناموفق بود";
            }

            alert(
                "ذخیره توضیحات ناموفق بود. اتصال اینترنت را بررسی کن."
            );
        }
    }
});


// علامت‌گذاری یا برداشتن علامت داروی مهم
drugList.addEventListener("click", async event => {

    const button = event.target.closest(".important-toggle");

    if (!button || !canEditDrugs) return;

    const key = button.dataset.drugKey;

    const current =
        getAnnotation({ genericName: key }).is_important === true;

    button.disabled = true;

    try {
        await updateDrugAnnotation(key, {
            is_important: !current
        });

        // فهرست را دوباره فیلتر می‌کنیم تا اگر علامت برداشته شد،
        // دارو فوراً از صفحه داروهای مهم حذف شود.
        filterDrugs();

    } catch (error) {
        console.error(error);

        alert(
            "ذخیره وضعیت دارو ناموفق بود. اتصال اینترنت را بررسی کن."
        );

        button.disabled = false;
    }
});


// بارگذاری اطلاعات داروها
async function loadDrugs() {
    try {
        await refreshEditorStatus();

        const response = await fetch("./drugs.json");

        if (!response.ok) {
            throw new Error("فایل drugs.json پیدا نشد.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "محتوای drugs.json باید آرایه‌ای از داروها باشد."
            );
        }

        drugs = data;

        // دریافت اطلاعات تکمیلی از Supabase
        await loadAnnotations();

        // ایجاد فیلتر گروه‌ها
        createGroupOptions();

        // مرتب‌سازی الفبایی داروها
        sortedDrugs = [...drugs].sort((a, b) =>
            (a.persianName || a.genericName || "").localeCompare(
                b.persianName || b.genericName || "",
                "fa"
            )
        );

        currentPage = 1;

        // نمایش فهرست مرتب‌شده
        displayDrugs(sortedDrugs);

    } catch (error) {
        console.error("خطا در بارگذاری اطلاعات:", error);

        drugCount.textContent =
            "بارگذاری اطلاعات ناموفق بود.";

        drugList.innerHTML = `
            <p class="no-result">
                اطلاعات داروها بارگذاری نشد.
                اتصال اینترنت، فایل drugs.json و تنظیمات Supabase را بررسی کن.
            </p>
        `;
    }
}


// بررسی تغییر وضعیت ورود کاربر
supabaseClient.auth.onAuthStateChange((event, session) => {

    const previousEditorState = canEditDrugs;

    const email =
        session?.user?.email?.toLowerCase() || "";

    canEditDrugs = EDITOR_EMAILS.includes(email);

    if (
        previousEditorState !== canEditDrugs &&
        drugs.length
    ) {
        displayDrugs(currentDisplayedDrugs);
    }
});


// اجرای برنامه
loadDrugs();


// ==========================================
// ناوبری بین صفحه انتخاب بانک و دو بانک مستقل
// ==========================================
(function setupBankNavigation() {
    const bankHome = document.getElementById("bankHome");
    const comprehensiveView = document.getElementById("comprehensiveBankView");
    const bookView = document.getElementById("bookBankView");
    const openComprehensiveButton = document.getElementById("openComprehensiveBank");
    const openBookButton = document.getElementById("openBookBank");
    const backButtons = document.querySelectorAll(".back-to-bank-home");

    function showView(viewName) {
        if (!bankHome || !comprehensiveView || !bookView) return;

        bankHome.hidden = viewName !== "home";
        comprehensiveView.hidden = viewName !== "comprehensive";
        bookView.hidden = viewName !== "book";

        window.scrollTo({ top: 0, behavior: "smooth" });

        if (viewName === "comprehensive" && typeof filterDrugs === "function") {
            currentPage = 1;
            filterDrugs();
        }

        if (viewName === "book") {
            window.dispatchEvent(new CustomEvent("book-bank-opened"));
        }
    }

    openComprehensiveButton?.addEventListener("click", () => {
        showView("comprehensive");
    });

    openBookButton?.addEventListener("click", () => {
        showView("book");
    });

    backButtons.forEach(button => {
        button.addEventListener("click", () => showView("home"));
    });

    // پس از ورود موفق، صفحه انتخاب بانک نمایش داده می‌شود.
    showView("home");
})();