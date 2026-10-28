
let drugs = [];

const drugList = document.getElementById("drugList");
const searchInput = document.getElementById("searchInput");
const groupFilter = document.getElementById("groupFilter");
const drugCount = document.getElementById("drugCount");

const GROUP_KEY = "drugGroupAssignments";
const IMPORTANT_KEY = "importantDrugs";

const drugGroupNames = {
    1: "قلبی و عروقی",
    2: "گوارشی",
    3: " آنتی بیوتیک‌ها و ضد قارچ و ضد ویروس",
    4: "اعصاب و روان",
    5: "هورمونی و تناسلی",
    6: "تنفسی و آنتی هیستامین",
    7: "ضد درد و التهاب",
    8: "ویتامین‌ها و مکمل‌ها",
    9: " غدد درون ریز ",
    10: "سایر داروها و گروه‌های تخصصی"
};

let currentDisplayedDrugs = [];

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// دریافت شماره گروه‌های ذخیره‌شده
function getDrugGroups() {
    try {
        return JSON.parse(
            localStorage.getItem(GROUP_KEY) || "{}"
        );
    } catch {
        return {};
    }
}

// ذخیره شماره گروه‌ها
function saveDrugGroups(groups) {
    localStorage.setItem(
        GROUP_KEY,
        JSON.stringify(groups)
    );
}

// دریافت شناسه هر دارو
function getDrugKey(drug) {
    return drug.genericName || drug.persianName || "";
}

// دریافت داروهای مهم
function getImportantDrugs() {
    try {
        return JSON.parse(
            localStorage.getItem(IMPORTANT_KEY) || "[]"
        );
    } catch {
        return [];
    }
}

// ذخیره داروهای مهم
function saveImportantDrugs(ids) {
    localStorage.setItem(
        IMPORTANT_KEY,
        JSON.stringify(ids)
    );
}

// ساخت گزینه‌های فیلتر گروه‌ها
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

// ساخت کارت هر دارو
function renderDrugCard(drug, importantDrugs, groupAssignments) {
    const key = getDrugKey(drug);
    const isImportant = importantDrugs.includes(key);

    const brands = Array.isArray(drug.brandNames)
        ? drug.brandNames
        : drug.brandNames
            ? [drug.brandNames]
            : [];

    return `
        <article class="drug-card">
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
    value="${escapeHTML(
        Array.isArray(groupAssignments[key])
            ? groupAssignments[key].join("-")
            : groupAssignments[key] || ""
    )}"
    data-drug-key="${escapeHTML(key)}"
    placeholder="_"
    aria-label="شماره گروه دارو"
>
                </label>
            </div>


            <p>
                <strong class="persian">نام ژنریک:</strong>
                <span class="english" dir="ltr">
                    ${escapeHTML(capitalizeFirstLetter(drug.genericName || ""))}
                </span>
            </p>

            <p>
                <strong class="persian">نام تجاری:</strong>
                <span class="english" dir="ltr">
                   ${brands.map(brand => escapeHTML(capitalizeFirstLetter(brand))).join(", ")}
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

<div class="teacher-notes">
    <label
        class="persian"
        for="notes-${escapeHTML(key)}"
    >
        توضیحات :
    </label>

    <textarea
        id="notes-${escapeHTML(key)}"
        class="teacher-notes-input persian"
        data-drug-key="${escapeHTML(key)}"
        placeholder="توضیحات تکمیلی ..."
        rows="3"
    >${escapeHTML(getDrugNotes(key))}</textarea>

    <small class="notes-status persian">
    </small>
</div>
</article>
`;
}

const NOTES_STORAGE_KEY = "teacherDrugNotes";

function getDrugNotes(key) {
    const notes = JSON.parse(
        localStorage.getItem(NOTES_STORAGE_KEY) || "{}"
    );

    return notes[key] || "";
}

function saveDrugNotes(key, value) {
    const notes = JSON.parse(
        localStorage.getItem(NOTES_STORAGE_KEY) || "{}"
    );

    notes[key] = value;
    localStorage.setItem(
        NOTES_STORAGE_KEY,
        JSON.stringify(notes)
    );
}

drugList.addEventListener("input", function (event) {
    if (!event.target.matches(".teacher-notes-input")) {
        return;
    }

    const key = event.target.dataset.drugKey;

    saveDrugNotes(key, event.target.value);
});


// نمایش داروها
function displayDrugs(drugArray) {
    currentDisplayedDrugs = drugArray;

    drugCount.textContent =
        `تعداد داروها :${drugArray.length} از ${drugs.length}`;

    if (drugArray.length === 0) {
        drugList.innerHTML =
            '<p class="no-result">دارویی پیدا نشد.</p>';
        return;
    }

    const importantDrugs = getImportantDrugs();
    const groupAssignments = getDrugGroups();

    drugList.innerHTML = drugArray
        .map(drug =>
            renderDrugCard(drug, importantDrugs, groupAssignments)
        )
        .join("");
}

// جست‌وجو و فیلتر هم‌زمان
function filterDrugs() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const selectedGroup = groupFilter.value;
    const groupAssignments = getDrugGroups();

    const filtered = drugs.filter(drug => {
        const brands = Array.isArray(drug.brandNames)
            ? drug.brandNames
            : drug.brandNames
                ? [drug.brandNames]
                : [];

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

       const assigned = groupAssignments[getDrugKey(drug)];

const assignedGroups = Array.isArray(assigned)
    ? assigned.map(Number)
    : assigned
        ? [Number(assigned)]
        : [];

const matchesGroup =
    selectedGroup === "" ||
    assignedGroups.includes(Number(selectedGroup));

        return matchesSearch && matchesGroup;
    });

    displayDrugs(filtered);
}

// جست‌وجو هنگام تایپ
searchInput.addEventListener("input", filterDrugs);

// فیلتر هنگام تغییر گروه
groupFilter.addEventListener("change", filterDrugs);

// ذخیره شماره گروه واردشده


drugList.addEventListener("change", function (event) {
    const input = event.target.closest(".drug-group-input");

    if (!input) return;

    const key = input.dataset.drugKey;
    const rawValue = input.value.trim();
    const groups = getDrugGroups();

    // پاک کردن همه گروه‌های دارو
    if (rawValue === "") {
        delete groups[key];
        saveDrugGroups(groups);
        input.value = "";
        return;
    }

    // تبدیل ورودی مثل 1-3-5 به آرایه شماره‌ها
    const parts = rawValue.split("-").map(part => part.trim());

    const numbers = parts.map(Number);

    const valid =
        parts.every(part => /^\d+$/.test(part)) &&
        numbers.every(number =>
            Number.isInteger(number) && number >= 1 && number <= 10
        ) &&
        new Set(numbers).size === numbers.length;

    if (!valid) {
        alert(
            "شماره گروه‌ها باید بین ۱ تا ۱۰ باشند و با خط تیره جدا شوند؛ مثلاً 1-3-5"
        );

        const previous = groups[key];
        input.value = Array.isArray(previous)
            ? previous.join("-")
            : previous || "";

        return;
    }

    groups[key] = numbers;
    saveDrugGroups(groups);
});



// علامت‌گذاری داروهای مهم
drugList.addEventListener("click", function (event) {
    const button = event.target.closest(".important-toggle");

    if (!button) return;

    const key = button.dataset.drugKey;
    const importantDrugs = getImportantDrugs();
    const index = importantDrugs.indexOf(key);

    if (index === -1) {
        importantDrugs.push(key);
    } else {
        importantDrugs.splice(index, 1);
    }

    saveImportantDrugs(importantDrugs);

    const isImportant = importantDrugs.includes(key);

    button.textContent = isImportant ? "✓" : "";
    button.classList.toggle("is-important", isImportant);
});

// بارگذاری اطلاعات از فایل JSON
fetch("./drugs.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("فایل drugs.json پیدا نشد.");
        }

        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data)) {
            throw new Error(
                "محتوای drugs.json باید آرایه‌ای از داروها باشد."
            );
        }

        drugs = data;

        createGroupOptions();

        const sortedDrugs = [...drugs].sort((a, b) =>
            (a.persianName || "").localeCompare(
                b.persianName || "",
                "fa"
            )
        );

        displayDrugs(sortedDrugs);
    })
    .catch(error => {
        console.error("خطا در بارگذاری داروها:", error);

        drugCount.textContent = "بارگذاری داروها ناموفق بود.";

        drugList.innerHTML = `
            <p class="no-result">
                اطلاعات داروها بارگذاری نشد.
                مطمئن شو فایل drugs.json کنار index.html است
                و برنامه را با Live Server اجرا می‌کنی.
            </p>
        `;
    });

    function capitalizeFirstLetter(name) {
    if (!name) return "";

    return name.charAt(0).toUpperCase() + name.slice(1);
}

