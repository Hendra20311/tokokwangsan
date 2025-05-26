import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    setDoc,
    doc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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


// Sidebar Toggle
const toggleBtn = document.getElementById("toggleMenuBtn");
const sideNavbar = document.getElementById("sideNavbar");
const closeBtn = document.querySelector(".close-btn");

function toggleSidebar() {
    const isMobile = window.innerWidth < 992;
    sideNavbar.classList.toggle("show");

    if (!isMobile && sideNavbar.classList.contains("show")) {
        document.querySelector('.main-content').style.marginLeft = '250px';
    } else {
        document.querySelector('.main-content').style.marginLeft = '0';
    }
}

function closeSidebar() {
    sideNavbar.classList.remove("show");
    document.querySelector('.main-content').style.marginLeft = '0';
}

// Event Listeners
toggleBtn.addEventListener("click", toggleSidebar);
closeBtn.addEventListener("click", closeSidebar);

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminSession');
    window.location.href = '/';
});

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

async function validateProductId(id) {
    const produkRef = collection(db, "produk");
    const snapshot = await getDocs(produkRef);
    return !snapshot.docs.some(doc => doc.id === id);
}

document.getElementById('id').addEventListener('input', async function (e) {
    const id = e.target.value.trim();
    if (id) {
        const isValid = await validateProductId(id);
        if (!isValid) {
            showError('id-error', 'ID sudah digunakan');
        } else {
            document.getElementById('id-error').style.display = 'none';
        }
    }
});

async function uploadToCloudinary(file) {
    const url = "https://api.cloudinary.com/v1_1/deurqtzjb/upload";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "product_upload");

    const res = await fetch(url, {
        method: "POST",
        body: formData
    });

    if (!res.ok) throw new Error("Upload ke Cloudinary gagal");
    return await res.json();
}

function readURL(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const preview = document.getElementById('imagePreview');
            const removeBtn = document.querySelector('.remove-image');
            const uploadLabel = document.querySelector('.upload-label');

            preview.style.display = 'block';
            preview.src = e.target.result;
            removeBtn.style.display = 'flex';
            uploadLabel.style.opacity = '0.3';
        }

        reader.onerror = function (error) {
            console.error('Error reading file:', error);
        }

        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage() {
    const fileInput = document.getElementById('foto');
    const previewImage = document.getElementById('imagePreview');
    const removeBtn = document.querySelector('.remove-image');
    const uploadLabel = document.querySelector('.upload-label');

    fileInput.value = '';
    previewImage.src = '';
    previewImage.style.display = 'none';
    removeBtn.style.display = 'none';
    uploadLabel.style.opacity = '1';
}

document.getElementById('foto').addEventListener('change', function () {
    if (this.files[0]?.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        this.value = '';
        return;
    }
    readURL(this);
});

document.querySelector('.remove-image').addEventListener('click', removeImage);

document.getElementById("submitBtn").addEventListener("click", async () => {
    const userInputId = document.getElementById('id').value.trim();
    const kategori = document.getElementById('kategori').value;
    const nama = document.getElementById('nama').value.trim();
    const satuan = document.getElementById('satuan').value;
    const stock = document.getElementById('stock').value;
    const hargabeli = document.getElementById('hargabeli').value;
    const hargajual = document.getElementById('hargajual').value;
    const diskon = document.getElementById('diskon').value;
    const diskonType = document.getElementById('diskon-type').value;
    const expired = document.getElementById('expired').value;
    const file = document.getElementById('foto').files[0];

    // Validasi tambahan untuk diskon
    if (diskon && diskon < 0) {
        showError('harga-error', 'Diskon tidak valid');
        valid = false;
    }

    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
    });

    let valid = true;

    if (userInputId && !(await validateProductId(userInputId))) {
        showError('id-error', 'ID sudah digunakan');
        valid = false;
    }

    if (!nama) {
        showError('nama-error', 'Nama produk wajib diisi');
        valid = false;
    }

    if (!stock || stock < 0) {
        showError('stock-error', 'Stok tidak valid');
        valid = false;
    }

    if (!hargabeli || hargabeli < 0 || !hargajual || hargajual < 0) {
        showError('harga-error', 'Harga tidak valid');
        valid = false;
    }

    if (!valid) return;

    try {
        let productId = userInputId;
        if (!productId) {
            const snapshot = await getDocs(collection(db, "produk"));
            productId = `produk${snapshot.size + 1}`;
        }

        let publicid = null;
        let imageUrl = null;
        if (file) {
            const data = await uploadToCloudinary(file);
            imageUrl = data.secure_url;
            publicid = data.public_id;
        }

        await setDoc(doc(db, "produk", productId), {
            id: productId,
            kategori,
            nama,
            satuan,
            stock: parseInt(stock),
            hargabeli: parseInt(hargabeli),
            hargajual: parseInt(hargajual),
            diskon: diskon ? parseInt(diskon) : 0,
            diskonType,
            expired: expired || null,
            publicid,
            foto: imageUrl,
            timestamp: new Date()
        });

        window.location.href = "warehouse.html";
    } catch (e) {
        console.error("Error:", e);
        alert("Gagal menyimpan produk: " + e.message);
    }
});