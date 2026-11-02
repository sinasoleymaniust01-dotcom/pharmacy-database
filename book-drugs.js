
(() => {
    "use strict";

    const DATA_URL = "./book-drugs.json";
    const ITEMS_PER_PAGE = 40;
    const NOTES_TABLE = "book_drug_notes";
    const IMPORTANT_TABLE = "book_drug_important";

    const searchInput = document.getElementById("bookSearchInput");
    const chapterFilter = document.getElementById("bookChapterFilter");
    const countElement = document.getElementById("bookDrugCount");
    const listElement = document.getElementById("bookDrugList");

    if (!searchInput || !chapterFilter || !countElement || !listElement) return;

    let allBookDrugs = [];
    let visibleDrugs = [];
    let currentPage = 1;
    let importantIds = new Set();
    let bookNotes = new Map();

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[ch]);
    }

    function isEditor() {
        return window.canEditPharmacyData === true;
    }

    function getSupabaseClient() {
        return window.supabaseClient || null;
    }

    function getBookDrugId(drug, index) {
        if (drug.id !== undefined && drug.id !== null && drug.id !== "") {
            return String(drug.id);
        }

        if (Array.isArray(drug.sourceRows) && drug.sourceRows.length) {
            return `book-row-${drug.sourceRows.join("-")}`;
        }

        if (drug.sourceRow !== undefined && drug.sourceRow !== null) {
            return `book-row-${drug.sourceRow}`;
        }

        return `book-${index}`;
    }

    function chapterNumber(value) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        const match = String(value ?? "").match(/\d+/);
        return match ? Number(match[0]) : null;
    }

    function chapterLabel(number, chapters) {
        const item = chapters.find(
            ch => Number(ch.number) === Number(number)
        );

        return item?.title || `فصل ${number}`;
    }

    function asList(value) {
        if (Array.isArray(value)) {
            return value.map(String).filter(Boolean);
        }

        if (!value) return [];

        return String(value)
            .split(/[,،;\n]+/)
            .map(x => x.trim())
            .filter(Boolean);
    }

    function renderChapterOptions(chapters) {
        const numbers = new Set(
            chapters.map(ch => Number(ch.number))
        );

        allBookDrugs.forEach(drug => {
            const n = chapterNumber(drug.chapter);
            if (n !== null) numbers.add(n);
        });

        const sorted = [...numbers]
            .filter(Number.isFinite)
            .sort((a, b) => a - b);

        chapterFilter.innerHTML =
            '<option value="">همه فصل‌ها</option>';

        sorted.forEach(number => {
            const option = document.createElement("option");
            option.value = String(number);
            option.textContent = chapterLabel(number, chapters);
            chapterFilter.appendChild(option);
        });
    }

    // دریافت توضیحات مشترک از Supabase
    async function loadBookNotes() {
        const client = getSupabaseClient();

        if (!client) {
            console.error("Supabase client در دسترس نیست.");
            return;
        }

        try {
            const { data, error } = await client
                .from(NOTES_TABLE)
                .select("drug_id, notes");

            if (error) throw error;

            bookNotes.clear();

            (data || []).forEach(item => {
                bookNotes.set(String(item.drug_id), item.notes || "");
            });

        } catch (error) {
            console.error("خطا در دریافت توضیحات داروها:", error);
        }
    }

    // دریافت وضعیت ستاره‌های مشترک از Supabase
    async function loadBookImportant() {
        const client = getSupabaseClient();

        if (!client) {
            console.error("Supabase client در دسترس نیست.");
            return;
        }

        try {
            const { data, error } = await client
                .from(IMPORTANT_TABLE)
                .select("drug_id, is_important");

            if (error) throw error;

            importantIds.clear();

            (data || []).forEach(item => {
                if (item.is_important === true) {
                    importantIds.add(String(item.drug_id));
                }
            });

        } catch (error) {
            console.error("خطا در دریافت وضعیت ستاره‌ها:", error);
        }
    }

    // نمایش یادداشت‌ها
    function notesHTML(id) {
        const note = bookNotes.get(id) || "";

        if (isEditor()) {
            return `
                <div class="book-notes-box">
                    <label class="book-notes-title"
                           for="book-note-${escapeHTML(id)}">
                        توضیحات
                    </label>

                    <textarea
                        id="book-note-${escapeHTML(id)}"
                        class="book-notes-input"
                        data-note-id="${escapeHTML(id)}"
                        placeholder="..."
                        rows="3"
                    >${escapeHTML(note)}</textarea>

                    <div class="book-notes-actions">
                        <button
                            type="button"
                            class="book-notes-save"
                            data-save-note="${escapeHTML(id)}"
                        >
                            ذخیره توضیحات
                        </button>

                        <span
                            class="book-notes-status"
                            data-note-status="${escapeHTML(id)}"
                            role="status"
                        ></span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="book-notes-box">
                <strong class="book-notes-title">توضیحات</strong>

                <div class="book-notes-display">${
                    note
                        ? escapeHTML(note).replace(/\n/g, "<br>")
                        : "..."
                }</div>
            </div>
        `;
    }

    // نمایش ستاره برای همه؛ امکان تغییر فقط برای ویرایشگران
    function importantHTML(id, important) {
        if (isEditor()) {
            return `
                <button
                    type="button"
                    class="book-important-toggle ${
                        important ? "is-important" : ""
                    }"
                    data-book-drug-id="${escapeHTML(id)}"
                    aria-pressed="${important}"
                    title="${
                        important
                            ? "حذف از داروهای مهم کتاب"
                            : "افزودن به داروهای مهم کتاب"
                    }"
                >
                    ${important ? "★" : "☆"}
                </button>
            `;
        }

        return `
            <span
                class="book-important-view ${
                    important ? "is-important" : ""
                }"
                aria-label="${
                    important ? "داروی مهم" : "داروی عادی"
                }"
                title="${
                    important ? "داروی مهم" : "داروی عادی"
                }"
            >
                ${important ? "★" : "☆"}
            </span>
        `;
    }

    // ساخت کارت دارو
    function cardHTML(drug, index) {
        const id = getBookDrugId(drug, index);

        const brands = asList(
            drug.brandNames || drug.brandNamesRaw
        );

        const important = importantIds.has(id);

        return `
            <article class="book-drug-card">

                <div class="book-drug-card-top">

                    <span class="book-chapter-badge">
                        ${escapeHTML(
                            `فصل ${
                                chapterNumber(drug.chapter) ??
                                drug.chapter ??
                                "نامشخص"
                            }`
                        )}
                    </span>

                    ${importantHTML(id, important)}

                </div>

                <h3 dir="ltr">
                    ${escapeHTML(
                        drug.genericName || "نام ژنریک ثبت نشده"
                    )}
                </h3>

                <p>
                    <strong>نام فارسی:</strong>
                    ${escapeHTML(drug.persianName || "")}
                </p>

                <p>
                    <strong>نام تجاری:</strong>
                    <span dir="ltr" class="book-english">${
                        brands.length
                            ? escapeHTML(brands.join("، "))
                            : ""
                    }</span>
                </p>

                <p>
                    <strong>کاربرد:</strong>
                    ${escapeHTML(drug.uses || "")}
                </p>

                ${
                    drug.dosageForms
                        ? `
                            <p>
                                <strong>دوز و شکل دارویی:</strong>
                                <span class="book-dose">
                                    ${escapeHTML(drug.dosageForms)}
                                </span>
                            </p>
                        `
                        : ""
                }

                <small class="book-source-row">
                    ردیف اکسل:
                    ${escapeHTML(
                        (drug.sourceRows || []).join("، ") ||
                        drug.sourceRow ||
                        "—"
                    )}
                </small>

                ${notesHTML(id)}

            </article>
        `;
    }

    // ذخیره توضیحات در Supabase
    async function saveBookNote(button) {
        if (!isEditor()) {
            alert("اجازه ویرایش توضیحات را ندارید.");
            return;
        }

        const id = button.dataset.saveNote;
        const card = button.closest(".book-drug-card");

        const textarea = card?.querySelector(".book-notes-input");
        const status = card?.querySelector(".book-notes-status");

        if (!textarea || !id) return;

        const client = getSupabaseClient();

        if (!client) {
            if (status) {
                status.textContent = "اتصال به پایگاه داده برقرار نیست.";
            }
            return;
        }

        const noteText = textarea.value;
        const email = window.currentPharmacyUser?.email || null;

        button.disabled = true;

        if (status) {
            status.textContent = "در حال ذخیره...";
        }

        try {
            const { error } = await client
                .from(NOTES_TABLE)
                .upsert(
                    {
                        drug_id: id,
                        notes: noteText,
                        updated_at: new Date().toISOString(),
                        updated_by: email
                    },
                    {
                        onConflict: "drug_id"
                    }
                );

            if (error) throw error;

            bookNotes.set(id, noteText);

            if (status) {
                status.textContent = "ذخیره شد";
            }

        } catch (error) {
            console.error("خطا در ذخیره توضیحات:", error);

            if (status) {
                status.textContent =
                    "ذخیره ناموفق بود؛ اتصال و مجوزها را بررسی کن.";
            }

        } finally {
            button.disabled = false;
        }
    }

    // ذخیره یا حذف ستاره در Supabase
    async function saveBookImportant(button) {
        if (!isEditor()) return;

        const id = button.dataset.bookDrugId;
        if (!id) return;

        const client = getSupabaseClient();

        if (!client) {
            alert("اتصال به پایگاه داده برقرار نیست.");
            return;
        }

        const newStatus = !importantIds.has(id);
        const email = window.currentPharmacyUser?.email || null;

        button.disabled = true;

        try {
            const { error } = await client
                .from(IMPORTANT_TABLE)
                .upsert(
                    {
                        drug_id: id,
                        is_important: newStatus,
                        updated_at: new Date().toISOString(),
                        updated_by: email
                    },
                    {
                        onConflict: "drug_id"
                    }
                );

            if (error) throw error;

            if (newStatus) {
                importantIds.add(id);
            } else {
                importantIds.delete(id);
            }

            renderList();

        } catch (error) {
            console.error("خطا در ذخیره وضعیت ستاره:", error);
            alert("تغییر وضعیت ستاره ذخیره نشد. اتصال و مجوزها را بررسی کن.");

        } finally {
            button.disabled = false;
        }
    }

    function renderPagination(totalPages) {
        let pagination = document.getElementById("bookPagination");

        if (!pagination) {
            pagination = document.createElement("div");
            pagination.id = "bookPagination";
            pagination.className = "book-pagination";

            listElement.insertAdjacentElement(
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
                id="bookPrevious"
                ${currentPage === 1 ? "disabled" : ""}
            >
                صفحه قبل
            </button>

            <span>
                صفحه ${currentPage} از ${totalPages}
            </span>

            <button
                type="button"
                id="bookNext"
                ${currentPage === totalPages ? "disabled" : ""}
            >
                صفحه بعد
            </button>
        `;

        document.getElementById("bookPrevious")
            .addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderList();
                }
            });

        document.getElementById("bookNext")
            .addEventListener("click", () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderList();
                }
            });
    }

    function renderList() {
        const total = visibleDrugs.length;

        const totalPages = Math.max(
            1,
            Math.ceil(total / ITEMS_PER_PAGE)
        );

        currentPage = Math.min(
            Math.max(currentPage, 1),
            totalPages
        );

        countElement.textContent =
            `تعداد داروها: ${total.toLocaleString("fa-IR")} از ${allBookDrugs.length.toLocaleString("fa-IR")}`;

        if (!total) {
            listElement.innerHTML =
                '<p class="no-result">دارویی با این مشخصات پیدا نشد.</p>';

            renderPagination(0);
            return;
        }

        const start = (currentPage - 1) * ITEMS_PER_PAGE;

        listElement.innerHTML = visibleDrugs
            .slice(start, start + ITEMS_PER_PAGE)
            .map((drug, i) => cardHTML(drug, start + i))
            .join("");

        renderPagination(totalPages);
    }

    function applyFilters() {
        const query = searchInput.value
            .trim()
            .toLocaleLowerCase();

        const selectedChapter = chapterFilter.value;

        visibleDrugs = allBookDrugs.filter(drug => {
            const brands = asList(
                drug.brandNames || drug.brandNamesRaw
            );

            const searchable = [
                drug.genericName,
                drug.persianName,
                ...brands,
                drug.uses,
                drug.dosageForms
            ].join(" ").toLocaleLowerCase();

            const matchesText =
                !query || searchable.includes(query);

            const matchesChapter =
                !selectedChapter ||
                String(chapterNumber(drug.chapter)) === selectedChapter;

            return matchesText && matchesChapter;
        });

        currentPage = 1;
        renderList();
    }

    async function loadBookDrugs() {
        try {
            countElement.textContent =
                "در حال بارگذاری داروهای کتاب...";

            const response = await fetch(DATA_URL, {
                cache: "no-cache"
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();

            const chapters = Array.isArray(payload.chapters)
                ? payload.chapters
                : [];

            const data = Array.isArray(payload)
                ? payload
                : payload.drugs;

            if (!Array.isArray(data)) {
                throw new Error(
                    "ساختار book-drugs.json معتبر نیست؛ باید آرایه داروها یا شیء دارای drugs باشد."
                );
            }

            allBookDrugs = [...data].sort((a, b) => {
                const nameA = String(a.genericName || "").trim();
                const nameB = String(b.genericName || "").trim();

                return nameA.localeCompare(nameB, "en", {
                    sensitivity: "base",
                    numeric: true
                });
            });

            renderChapterOptions(chapters);

            await Promise.all([
                loadBookNotes(),
                loadBookImportant()
            ]);

            applyFilters();

        } catch (error) {
            console.error("خطا در بارگذاری داروهای کتاب:", error);

            countElement.textContent =
                "بارگذاری اطلاعات داروهای کتاب ناموفق بود.";

            listElement.innerHTML = `
                <p class="no-result">
                    فایل book-drugs.json پیدا نشد یا ساختار آن معتبر نیست.
                    مطمئن شو فایل در کنار index.html قرار دارد و با Live Server سایت را اجرا می‌کنی.
                </p>
            `;
        }
    }

    searchInput.addEventListener("input", applyFilters);
    chapterFilter.addEventListener("change", applyFilters);

    listElement.addEventListener("click", async event => {
        const saveButton = event.target.closest(".book-notes-save");

        if (saveButton) {
            await saveBookNote(saveButton);
            return;
        }

        const importantButton = event.target.closest(
            ".book-important-toggle"
        );

        if (importantButton) {
            await saveBookImportant(importantButton);
        }
    });

    // با تغییر سطح دسترسی، کارت‌ها دوباره نمایش داده می‌شوند.
    window.addEventListener(
        "book-editor-permission-changed",
        () => {
            if (allBookDrugs.length) {
                renderList();
            }
        }
    );

    // با ورود دوباره به بانک، اطلاعات تازه از Supabase دریافت می‌شوند.
    window.addEventListener("book-bank-opened", async () => {
        if (!allBookDrugs.length) {
            await loadBookDrugs();
        } else {
            await Promise.all([
                loadBookNotes(),
                loadBookImportant()
            ]);

            renderList();
        }
    });

})();
