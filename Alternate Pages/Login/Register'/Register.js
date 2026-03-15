// Register Controller
// Loaded from Login_page/HTML/Register.html

// Show the selected role
const pendingRole = sessionStorage.getItem("cem_pending_role") || "student";
const roleLabel   = document.getElementById("roleLabel");
if (roleLabel) {
    roleLabel.textContent = "Registering as: " + pendingRole.charAt(0).toUpperCase() + pendingRole.slice(1);
}

document.getElementById("Register").addEventListener("click", handleRegister);
document.getElementById("confirmInput").addEventListener("keydown", e => {
    if (e.key === "Enter") handleRegister();
});

function handleRegister() {
    const username = document.getElementById("usernameInput").value.trim();
    const password = document.getElementById("passwordInput").value;
    const confirm  = document.getElementById("confirmInput").value;
    const errorEl  = document.getElementById("registerError");

    if (!username || !password || !confirm) {
        showError("Please fill in all fields.");
        return;
    }
    if (password !== confirm) {
        showError("Passwords do not match.");
        return;
    }
    if (password.length < 8) {
        showError("Password must be at least 8 characters.");
        return;
    }
    if (CampusData.getUserByUsername(username)) {
        showError("That username is already taken.");
        return;
    }

    const user = CampusData.addUser({ username, password, role: pendingRole });
    sessionStorage.removeItem("cem_pending_role");
    CampusData.setCurrentUser(user);

    const dashboards = {
        student:   "../../../Dashboard/student_dashboard.html",
        organizer: "../../../Dashboard/organizer_dashboard.html",
        admin:     "../../../Dashboard/admin_dashboard.html"
    };
    window.location.href = dashboards[user.role] || dashboards.student;
}

function showError(msg) {
    const el = document.getElementById("registerError");
    el.textContent = msg;
    el.style.display = "block";
}

document.getElementById("Have").addEventListener("click", () => {
    window.location.href = "Login.html";
});