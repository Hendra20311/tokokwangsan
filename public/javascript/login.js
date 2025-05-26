import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBC64i2iC9mbq9s8Xs9JdYNA7Xe1XQklw8",
    authDomain: "tokokelontong-9dfdb.firebaseapp.com",
    projectId: "tokokelontong-9dfdb",
    storageBucket: "tokokelontong-9dfdb.appspot.com",
    messagingSenderId: "96178115569",
    appId: "1:96178115569:web:d37bf5a01d645cc8242a50",
    measurementId: "G-LSDQMDN7V1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Toggle Password
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.querySelector('.eye-icon').style.display = isPassword ? 'none' : 'block';
    togglePassword.querySelector('.eye-off-icon').style.display = isPassword ? 'block' : 'none';
});

// Handle Login Admin
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("errorMsg");

    try {
        console.log("Memulai proses login...");

        // Cek semua role
        const roles = ['admin', 'cashier', 'staff'];
        let loggedIn = false;
        let userRole = null;
        let userData = null;

        // Loop melalui semua role
        for (const role of roles) {
            const userRef = doc(db, "users", role);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.username === username && data.password === password) {
                    loggedIn = true;
                    userRole = role;
                    userData = data;
                    break;
                }
            }
        }

        if (loggedIn) {
            console.log("Login berhasil sebagai:", userRole);

            // Simpan session sesuai role
            sessionStorage.setItem(`${userRole}Session`, JSON.stringify({
                username: userData.username,
                nama: userData.nama,
                role: userRole,
                terakhir_login: new Date().toISOString()
            }));

            // Redirect sesuai role
            switch (userRole) {
                case 'admin':
                    window.location.href = 'homeadmin.html';
                    break;
                case 'cashier':
                    window.location.href = 'homecashier.html';
                    break;
                case 'staff':
                    window.location.href = 'homestaff.html';
                    break;
                default:
                    throw new Error('Role tidak valid');
            }

            return;
        }

        console.log("Login gagal - Kredensial tidak valid");
        errorMsg.textContent = "Username atau password salah!";
        errorMsg.style.display = 'block';

    } catch (error) {
        console.error("Error detail:", error);
        errorMsg.textContent = `Gagal login: ${error.message}`;
        errorMsg.style.display = 'block';
    }
});