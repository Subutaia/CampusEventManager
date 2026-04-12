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
["usernameInput", "emailInput", "passwordInput"].forEach(id => {
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
    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    if (!username || !email || !password) {
        showError("Please fill in all fields.");
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError("Please enter a valid email address.");
        return;
    }

    if (password.length < 8) {
        showError("Password must be at least 8 characters.");
        return;
    }

    // Send registration to backend API
    // Use the global API_BASE_URL from app.js
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://campus-event-manager-worker.memelord801.workers.dev';
    fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            email,
            password,
            role: pendingRole
        })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            showError(data.error || "Registration failed");
            return;
        }

        // Registration successful
        sessionStorage.removeItem("cem_pending_role");
        
        // Store token and user info
        localStorage.setItem("cem_token", data.data.token);
        localStorage.setItem("cem_user", JSON.stringify(data.data.user));

        // Navigate to dashboard based on role
        const dashboards = {
            student: "../../Dashboard/student_dashboard.html",
            organizer: "../../Dashboard/organizer_dashboard.html",
            admin: "../../Dashboard/admin_dashboard.html"
        };

        window.location.href = dashboards[pendingRole] || dashboards.student;
    })
    .catch(err => {
        console.error("Registration error:", err);
        showError("An error occurred during registration. Please try again.");
    });
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