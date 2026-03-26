// Set role label
const pendingRole = sessionStorage.getItem("cem_pending_role") || "student";
const roleLabel = document.getElementById("roleLabel");

if (roleLabel) {
    roleLabel.textContent =
        "Registering as: " +
        pendingRole.charAt(0).toUpperCase() +
        pendingRole.slice(1);
}

// Register button
document.getElementById("Register").addEventListener("click", handleRegister);

// Enter key support + clear error
["usernameInput", "passwordInput"].forEach(id => {
    const el = document.getElementById(id);

    if (el) {
        el.addEventListener("keydown", e => {
            if (e.key === "Enter") handleRegister();
        });

        el.addEventListener("input", clearError);
    }
});

// 🔥 Already have account button (YOUR WAY)
document.getElementById("HaveAccount").addEventListener("click", () => {
    sessionStorage.removeItem("cem_pending_role");
    window.location.href = "../Login page/Login.html"; // adjust if needed
});

// ==========================
// Register logic
// ==========================
function handleRegister() {
    const username = document.getElementById("usernameInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    if (!username || !password) {
        showError("Please fill in all fields.");
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

    const user = CampusData.addUser({
        username,
        password,
        role: pendingRole
    });

    sessionStorage.removeItem("cem_pending_role");
    CampusData.setCurrentUser(user);

    const dashboards = {
        student: "../../Dashboard/student_dashboard.html",
        organizer: "../../Dashboard/organizer_dashboard.html",
        admin: "../../Dashboard/admin_dashboard.html"
    };

    window.location.href = dashboards[user.role] || dashboards.student;
}

// ==========================
// Error handling
// ==========================
function showError(message) {
    const errorEl = document.getElementById("registerError");
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = "block";
    }
}

function clearError() {
    const errorEl = document.getElementById("registerError");
    if (errorEl) {
        errorEl.textContent = "";
        errorEl.style.display = "none";
    }
}