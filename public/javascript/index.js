import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getCountFromServer,
    doc,
    getDoc,
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

// Sidebar toggle
const toggleBtn = document.getElementById("toggleMenuBtn");
const sideNavbar = document.getElementById("sideNavbar");
const closeBtn = document.querySelector(".close-btn");

toggleBtn.addEventListener("click", () => {
    sideNavbar.classList.toggle("show");
    const isMobile = window.innerWidth < 992;
    document.querySelector('.main-content').style.marginLeft = isMobile ? '0' : (sideNavbar.classList.contains("show") ? '250px' : '0');
});
closeBtn.addEventListener("click", () => {
    sideNavbar.classList.remove("show");
    const isMobile = window.innerWidth < 992;
    if (!isMobile) {
        document.querySelector('.main-content').style.marginLeft = '0';
    }
});
window.addEventListener("resize", () => {
    const isMobile = window.innerWidth < 992;
    document.querySelector('.main-content').style.marginLeft = isMobile ? '0' : (sideNavbar.classList.contains("show") ? '250px' : '0');
});

async function updateDashboardStats() {
    try {
        const produkRef = collection(db, "produk");
        const snapshot = await getCountFromServer(produkRef);
        const totalProduk = snapshot.data().count || 0;
        document.querySelector("#totalProduk").innerText = totalProduk.toLocaleString("id-ID");

        const now = new Date();
        const tanggal = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
        const counterDoc = await getDoc(doc(db, "counters", tanggal));
        const pelangganHariIni = counterDoc.exists() ? (counterDoc.data().seq || 0) : 0;
        document.querySelector("#pelangganHariIni").innerText = pelangganHariIni.toLocaleString("id-ID");
    } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);
    }
}

async function hitungJumlahTransaksi() {
    try {
        const transaksiRef = collection(db, "transaksi");
        const snapshot = await getCountFromServer(transaksiRef);
        const totalTransaksi = snapshot.data().count || 0;

        const transaksiEl = document.querySelector("#jumlahTransaksi");
        if (transaksiEl) {
            transaksiEl.innerText = totalTransaksi.toLocaleString("id-ID");
        } else {
            console.warn("#jumlahTransaksi tidak ditemukan di DOM.");
        }
    } catch (error) {
        console.error("Gagal menghitung jumlah transaksi:", error);
    }
}

async function loadBestSellerProducts() {
    try {
        const bestSellerDoc = await getDoc(doc(db, "guest", "bestseller"));
        if (!bestSellerDoc.exists()) {
            console.warn("Dokumen bestseller tidak ditemukan.");
            return;
        }

        let idProductsRaw = bestSellerDoc.data().idproduct;

        if (typeof idProductsRaw === "string") {
            idProductsRaw = idProductsRaw.split(",").map(id => id.trim()).filter(id => id.length > 0);
        }

        if (!Array.isArray(idProductsRaw) || idProductsRaw.length === 0) {
            console.warn("Tidak ada produk best seller.");
            return;
        }

        const container = document.getElementById("bestSellerList");
        container.innerHTML = ''; // Clear dulu

        for (const productId of idProductsRaw) {
            if (typeof productId !== "string") {
                console.warn(`ID produk bukan string: ${productId}`);
                continue;
            }

            const prodDoc = await getDoc(doc(db, "produk", productId));
            if (!prodDoc.exists()) {
                console.warn(`Produk dengan ID ${productId} tidak ditemukan.`);
                continue;
            }

            const prodData = prodDoc.data();

            const card = document.createElement("div");
            card.className = "card";
            card.style.width = "12rem";

            const img = document.createElement("img");
            img.src = prodData.foto || "https://via.placeholder.com/150";
            img.className = "card-img-top";
            img.alt = prodData.nama || "Produk";
            img.style.height = "150px";
            img.style.objectFit = "cover";

            const cardBody = document.createElement("div");
            cardBody.className = "card-body p-2";

            const title = document.createElement("h6");
            title.className = "card-title mb-1";
            title.textContent = prodData.nama || "-";

            const price = document.createElement("p");
            price.className = "card-text text-success fw-bold mb-0";
            price.textContent = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
            }).format(prodData.hargajual || 0);

            cardBody.appendChild(title);
            cardBody.appendChild(price);
            card.appendChild(img);
            card.appendChild(cardBody);

            container.appendChild(card);
        }
    } catch (error) {
        console.error("Gagal memuat produk best seller:", error);
    }
}

async function loadDiscountProducts() {
    try {
        const discountDoc = await getDoc(doc(db, "guest", "discount"));
        if (!discountDoc.exists()) {
            console.warn("Dokumen discount tidak ditemukan.");
            return;
        }

        let idProductsRaw = discountDoc.data().idproduct;

        if (typeof idProductsRaw === "string") {
            idProductsRaw = idProductsRaw.split(",").map(id => id.trim()).filter(id => id.length > 0);
        }

        if (!Array.isArray(idProductsRaw) || idProductsRaw.length === 0) {
            console.warn("Tidak ada produk diskon.");
            document.getElementById("discountList").innerHTML = '<p class="text-muted">Produk diskon tidak tersedia.</p>';
            return;
        }

        const container = document.getElementById("discountList");
        container.innerHTML = ''; // Clear dulu

        let produkDitemukan = 0;

        for (const productId of idProductsRaw) {
            if (typeof productId !== "string") {
                console.warn(`ID produk bukan string: ${productId}`);
                continue;
            }

            const prodDoc = await getDoc(doc(db, "produk", productId));
            if (!prodDoc.exists()) {
                console.warn(`Produk dengan ID ${productId} tidak ditemukan.`);
                continue;
            }

            produkDitemukan++;

            const prodData = prodDoc.data();

            // Hitung harga diskon
            let hargaDiskon = prodData.hargajual || 0;
            if (prodData.diskon && prodData.diskonType) {
                if (prodData.diskonType.toLowerCase() === "persen") {
                    hargaDiskon = hargaDiskon * (1 - prodData.diskon / 100);
                } else if (prodData.diskonType.toLowerCase() === "fixed") {
                    hargaDiskon = hargaDiskon - prodData.diskon;
                }
                if (hargaDiskon < 0) hargaDiskon = 0;
            }

            // Buat card produk
            const card = document.createElement("div");
            card.className = "card";
            card.style.width = "12rem";

            const img = document.createElement("img");
            img.src = prodData.foto || "https://via.placeholder.com/150";
            img.className = "card-img-top";
            img.alt = prodData.nama || "Produk";
            img.style.height = "150px";
            img.style.objectFit = "cover";

            const cardBody = document.createElement("div");
            cardBody.className = "card-body p-2";

            const title = document.createElement("h6");
            title.className = "card-title mb-1";
            title.textContent = prodData.nama || "-";

            const hargaNormal = document.createElement("p");
            hargaNormal.className = "card-text text-muted mb-0";
            hargaNormal.style.textDecoration = "line-through";
            hargaNormal.textContent = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
            }).format(prodData.hargajual || 0);

            const hargaDiskonEl = document.createElement("p");
            hargaDiskonEl.className = "card-text text-danger fw-bold mb-0";
            hargaDiskonEl.textContent = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
            }).format(hargaDiskon);

            cardBody.appendChild(title);
            cardBody.appendChild(hargaNormal);
            cardBody.appendChild(hargaDiskonEl);

            card.appendChild(img);
            card.appendChild(cardBody);

            container.appendChild(card);
        }

        if (produkDitemukan === 0) {
            container.innerHTML = '<p class="text-muted">Produk diskon tidak tersedia.</p>';
        }
    } catch (error) {
        console.error("Gagal memuat produk diskon:", error);
    }
}


window.addEventListener("DOMContentLoaded", () => {
    updateDashboardStats();
    hitungJumlahTransaksi();
    loadBestSellerProducts();
    loadDiscountProducts();
});