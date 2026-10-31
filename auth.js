const authSection = document.getElementById("authSection");
const loginForm = document.getElementById("loginForm");
const authMessage = document.getElementById("authMessage");
const userInfo = document.getElementById("userInfo");
const currentUserEmail = document.getElementById("currentUserEmail");
const logoutButton = document.getElementById("logoutButton");


const allowedEmails = [
    "sina.soleymaniust01@gmail.com",
    "hooman.movahed@gmail.com"
];


function showAuthMessage(message) {

    if (authMessage) {
        authMessage.textContent = message;
    }

}


// نمایش وضعیت ورود موفق
function setLoggedIn(user) {

    const email = (user.email || "").toLowerCase();


    if (!allowedEmails.includes(email)) {

        showAuthMessage(
            "این حساب اجازه ورود به سامانه را ندارد."
        );

        supabaseClient.auth.signOut();

        return;
    }


    if (loginForm) {
        loginForm.hidden = true;
    }

    if (userInfo) {
        userInfo.hidden = false;
    }

    if (currentUserEmail) {
        currentUserEmail.textContent = email;
    }


    showAuthMessage("");


    // بانک دارویی برای همه قابل مشاهده است
    const main = document.querySelector("main");

    if (main) {
        main.hidden = false;
    }

}


// نمایش وضعیت خروج
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


    // دانشجویان بدون ورود هم می‌توانند داروها را ببینند
    const main = document.querySelector("main");

    if (main) {
        main.hidden = false;
    }

}


// ورود به سامانه
if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            showAuthMessage(
                "در حال بررسی اطلاعات ورود..."
            );


            const email = document
                .getElementById("loginEmail")
                .value.trim()
                .toLowerCase();

            const password = document
                .getElementById("loginPassword")
                .value;


            if (!allowedEmails.includes(email)) {

                showAuthMessage(
                    "این ایمیل مجاز به ورود نیست."
                );

                return;
            }


            const { data, error } =
                await supabaseClient.auth.signInWithPassword({

                    email,
                    password

                });


            if (error) {

                showAuthMessage(
                    "ورود ناموفق بود. ایمیل و رمز عبور را بررسی کن."
                );

                console.error(
                    "Login error:",
                    error
                );

                return;
            }


            if (data.user) {

                setLoggedIn(data.user);

            }

        }
    );

}


// بازیابی رمز عبور
const recoveryButton =
    document.getElementById("recoveryButton");


if (recoveryButton) {

    recoveryButton.addEventListener(
        "click",
        async function () {

            const email = document
                .getElementById("loginEmail")
                .value.trim()
                .toLowerCase();


            if (!allowedEmails.includes(email)) {

                showAuthMessage(
                    "ابتدا ایمیل مجاز خود را وارد کن."
                );

                return;
            }


            showAuthMessage(
                "در حال ارسال لینک بازیابی..."
            );


            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo:
                            "https://sinasoleymaniust01-dotcom.github.io/pharmacy-database/reset-password.html"
                    }
                );


            if (error) {

                showAuthMessage(
                    "ارسال لینک بازیابی ناموفق بود."
                );

                console.error(
                    "Recovery error:",
                    error
                );

                return;
            }


            showAuthMessage(
                "اگر ارسال ایمیل موفق باشد، لینک بازیابی به ایمیل شما فرستاده می‌شود."
            );

        }
    );

}


// خروج از سامانه
if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            const { error } =
                await supabaseClient.auth.signOut();


            if (error) {

                showAuthMessage(
                    "خروج ناموفق بود."
                );

                console.error(error);

                return;
            }


            setLoggedOut();

        }
    );

}


// بررسی وضعیت ورود هنگام باز شدن سایت
async function initializeAuth() {

    setLoggedOut();


    const { data, error } =
        await supabaseClient.auth.getSession();


    if (error) {

        showAuthMessage(
            "بررسی وضعیت ورود ناموفق بود."
        );

        console.error(error);

        return;
    }


    if (data.session?.user) {

        setLoggedIn(data.session.user);

    }

}


// بررسی تغییر وضعیت ورود
supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        if (event === "SIGNED_OUT" || !session) {

            setLoggedOut();

        }

    }
);


// اجرای اولیه
initializeAuth();