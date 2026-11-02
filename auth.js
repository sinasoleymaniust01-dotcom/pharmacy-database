(() => {
    "use strict";

    const authSection = document.getElementById("authSection");
    const loginForm = document.getElementById("loginForm");
    const authMessage = document.getElementById("authMessage");
    const userInfo = document.getElementById("userInfo");
    const currentUserEmail = document.getElementById("currentUserEmail");
    const logoutButton = document.getElementById("logoutButton");
    const recoveryButton = document.getElementById("recoveryButton");
    const main = document.getElementById("appMain");

    const client = window.supabaseClient;

    const EDITOR_EMAILS = [
        "sina.soleymaniust01@gmail.com",
        "hooman.movahed@gmail.com"
    ];

    function showAuthMessage(message) {
        if (authMessage) {
            authMessage.textContent = message || "";
        }
    }

    function isEditor(user) {
        const email = (user?.email || "").trim().toLowerCase();

        return EDITOR_EMAILS.includes(email);
    }

    function updateEditorPermission(user) {
        const permission = isEditor(user);

        window.currentPharmacyUser = user || null;
        window.canEditPharmacyData = permission;

        window.dispatchEvent(
            new CustomEvent("pharmacy-permission-changed", {
                detail: {
                    user: user || null,
                    canEdit: permission
                }
            })
        );

        window.dispatchEvent(
            new Event("book-editor-permission-changed")
        );
    }

    function setLoggedIn(user) {
        if (!user) {
            setLoggedOut();
            return;
        }

        if (loginForm) {
            loginForm.hidden = true;
        }

        if (userInfo) {
            userInfo.hidden = false;
        }

        if (currentUserEmail) {
            currentUserEmail.textContent = user.email || "";
        }

        if (main) {
            main.hidden = false;
        }

        if (authSection) {
            authSection.classList.add("is-logged-in");
        }

        showAuthMessage("");

        updateEditorPermission(user);
    }

    function setLoggedOut() {
        if (loginForm) {
            loginForm.hidden = false;
        }

        if (userInfo) {
            userInfo.hidden = true;
        }

        if (currentUserEmail) {
            currentUserEmail.textContent = "";
        }

        // مشاهده بانک برای کاربران بدون ورود هم باز می‌ماند.
        if (main) {
            main.hidden = false;
        }

        if (authSection) {
            authSection.classList.remove("is-logged-in");
        }

        updateEditorPermission(null);
    }

    if (!client) {
        showAuthMessage(
            "اتصال به Supabase برقرار نیست. فایل supabase-client.js را بررسی کن."
        );

        setLoggedOut();
        return;
    }

    // ورود
    if (loginForm) {
        loginForm.addEventListener("submit", async event => {
            event.preventDefault();

            const email = document
                .getElementById("loginEmail")
                .value.trim()
                .toLowerCase();

            const password = document
                .getElementById("loginPassword")
                .value;

            if (!email || !password) {
                showAuthMessage("ایمیل و رمز عبور را وارد کن.");
                return;
            }

            const submitButton = loginForm.querySelector(
                'button[type="submit"]'
            );

            if (submitButton) {
                submitButton.disabled = true;
            }

            showAuthMessage("در حال بررسی اطلاعات ورود...");

            try {
                const { data, error } =
                    await client.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) {
                    throw error;
                }

                setLoggedIn(data.user);

                showAuthMessage("ورود با موفقیت انجام شد.");

            } catch (error) {
                console.error("Login error:", error);

                showAuthMessage(
                    "ورود ناموفق بود. ایمیل و رمز عبور را بررسی کن."
                );

            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }

    // بازیابی رمز عبور
    if (recoveryButton) {
        recoveryButton.addEventListener("click", async () => {
            const email = document
                .getElementById("loginEmail")
                .value.trim()
                .toLowerCase();

            if (!email) {
                showAuthMessage("ابتدا ایمیل خود را وارد کن.");
                return;
            }

            showAuthMessage("در حال ارسال لینک بازیابی...");

            try {
                const { error } =
                    await client.auth.resetPasswordForEmail(email, {
                        redirectTo:
                            "https://sinasoleymaniust01-dotcom.github.io/pharmacy-database/reset-password.html"
                    });

                if (error) {
                    throw error;
                }

                showAuthMessage(
                    "در صورت معتبر بودن ایمیل، لینک بازیابی برای شما ارسال می‌شود."
                );

            } catch (error) {
                console.error("Recovery error:", error);

                showAuthMessage(
                    "ارسال لینک بازیابی ناموفق بود."
                );
            }
        });
    }

    // خروج
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            showAuthMessage("در حال خروج...");

            const { error } = await client.auth.signOut();

            if (error) {
                console.error("Logout error:", error);
                showAuthMessage("خروج ناموفق بود.");
                return;
            }

            setLoggedOut();
            showAuthMessage("با موفقیت خارج شدید.");
        });
    }

    // بررسی نشست هنگام باز شدن سایت
    async function initializeAuth() {
        setLoggedOut();

        try {
            const { data, error } = await client.auth.getSession();

            if (error) {
                throw error;
            }

            if (data.session?.user) {
                setLoggedIn(data.session.user);
            }

        } catch (error) {
            console.error("Session error:", error);

            showAuthMessage(
                "بررسی وضعیت ورود ناموفق بود."
            );
        }
    }

    // همگام‌سازی وضعیت ورود و خروج
    client.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
            if (session?.user) {
                setLoggedIn(session.user);
            } else {
                setLoggedOut();
            }
        }, 0);
    });

    initializeAuth();
})();