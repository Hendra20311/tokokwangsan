const toggleBtn = document.getElementById("toggleMenuBtn");
const sideNavbar = document.getElementById("sideNavbar");
const closeBtn = document.querySelector(".close-btn");
toggleBtn.addEventListener("click", () => sideNavbar.classList.toggle("show"));
closeBtn.addEventListener("click", () => sideNavbar.classList.remove("show"));
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminSession');
    window.location.href = 'index.html';
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
const firebaseConfig = { apiKey: "AIzaSyBC64i2iC9mbq9s8Xs9JdYNA7Xe1XQklw8", authDomain: "tokokelontong-9dfdb.firebaseapp.com", projectId: "tokokelontong-9dfdb", storageBucket: "tokokelontong-9dfdb.appspot.com", messagingSenderId: "96178115569", appId: "1:96178115569:web:d37bf5a01d645cc8242a50", measurementId: "G-LSDQMDN7V1" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
let publicId = "";
async function loadProduct() {
    try {
        const docRef = doc(db, "produk", productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('productId').textContent = productId;
            document.getElementById('namaProduk').textContent = data.nama;
            document.getElementById('kategoriProduk').textContent = data.kategori;
            document.getElementById('stockProduk').textContent = `${data.stock} ${data.satuan}`;
            document.getElementById('hargaBeli').textContent = `Rp${data.hargabeli.toLocaleString()}`;
            document.getElementById('hargaJual').textContent = `Rp${data.hargajual.toLocaleString()}`;
            document.getElementById('diskon').textContent = data.diskon ? `${data.diskon}${data.diskontype === 'persen' ? '%' : 'Rp'}` : '-';
            document.getElementById('tipeDiskon').textContent = data.diskontype || '-';
            document.getElementById('expired').textContent = data.expired || '-';
            if (data.foto) document.getElementById('preview').src = data.foto;
            publicId = data.publicid || "";
        } else throw new Error("Produk tidak ditemukan");
    } catch (error) {
        alert(error.message);
        window.location.href = "warehouse.html";
    }
}
async function deleteFromCloudinary(publicId) {
    try {
        const response = await fetch('/api/delete-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId }) });
        if (!response.ok) throw new Error('Gagal menghapus gambar dari Cloudinary');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
async function deleteProduct() {
    try {
        await deleteDoc(doc(db, "produk", productId));
        if (publicId) await deleteFromCloudinary(publicId);
        alert("Produk berhasil dihapus!");
        window.location.href = "warehouse.html";
    } catch (error) {
        console.error("Gagal menghapus produk:", error);
        alert("Terjadi kesalahan saat menghapus produk");
    }
}
document.getElementById("btnYes").addEventListener("click", deleteProduct);
loadProduct();