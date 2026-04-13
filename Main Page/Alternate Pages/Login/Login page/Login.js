// Login Controller
// Paths are relative to Login_page/HTML/Login.html

document.getElementById("LoginBtn").addEventListener("click", handleLogin);
document.getElementById("passwordInput").addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
});

function handleLogin() {
    const username = document.getElementById("usernameInput").value.trim();
    const password = document.getElementById("passwordInput").value;
    const errorEl  = document.getElementById("loginError");

    if (!username || !password) {
        showError("Please enter your username and password.");
        return;
    }

    const user = CampusData.getUserByUsername(username);
    if (!user || user.password !== password) {
        showError("Invalid username or password.");
        return;
    }

    CampusData.setCurrentUser(user);

    const dashboards = {
        student:   "../../Dashboard/student_dashboard.html",
        organizer: "../../Dashboard/organizer_dashboard.html",
        admin:     "../../Dashboard/admin_dashboard.html"
    };

    window.location.href = dashboards[user.role] || dashboards.student;
}

function showError(msg) {
    const el = document.getElementById("loginError");
    el.textContent = msg;
    el.style.display = "block";
}

document.getElementById("Register").addEventListener("click", () => {
    window.location.href = "Account_type.html";
});

document.getElementById("Forgot").addEventListener("click", () => {
    window.location.href = "Forgot_pass.html";
});

