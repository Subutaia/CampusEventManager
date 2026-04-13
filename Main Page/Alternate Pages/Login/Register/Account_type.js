// Account Type Controller
// This script is loaded from Login_page/HTML/Account_type.html,
// so all href paths are relative to that HTML file's location.

document.getElementById("Organizer").addEventListener("click", () => {
    sessionStorage.setItem("cem_pending_role", "organizer");
    window.location.href = "Register.html";
});

document.getElementById("User").addEventListener("click", () => {
    sessionStorage.setItem("cem_pending_role", "student");
    window.location.href = "Register.html";
});

document.getElementById("Back").addEventListener("click", () => {
    window.location.href = "Login.html";
});
