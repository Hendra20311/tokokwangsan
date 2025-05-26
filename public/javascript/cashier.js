const firebaseConfig = {
            apiKey: "AIzaSyBC64i2iC9mbq9s8Xs9JdYNA7Xe1XQklw8",
            authDomain: "tokokelontong-9dfdb.firebaseapp.com",
            projectId: "tokokelontong-9dfdb",
            storageBucket: "tokokelontong-9dfdb.appspot.com",
            messagingSenderId: "96178115569",
            appId: "1:96178115569:web:d37bf5a01d645cc8242a50",
            measurementId: "G-LSDQMDN7V1"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        class CashierSystem {
            constructor() {
                this.transactionItems = [];
                this.currentProduct = null;
                this.initEventListeners();
            }

            initEventListeners() {
                document.getElementById('totalBayar').addEventListener('input', () => this.updateChange());
                document.getElementById('searchInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchProduct();
                });
                document.getElementById('quantity').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.addToCart();
                });
            }

            async loadProducts() {
                try {
                    const snapshot = await db.collection('produk').get();
                    return snapshot.docs.map(doc => doc.data());
                } catch (error) {
                    console.error('Error loading products:', error);
                    this.showError('Gagal memuat daftar produk');
                    return [];
                }
            }

            async searchProduct() {
                const keyword = document.getElementById('searchInput').value;
                if (!keyword) return;

                try {
                    const productRef = db.collection('produk');
                    const [byId, byName] = await Promise.all([
                        productRef.where('id', '==', keyword).get(),
                        productRef.where('nama', '==', keyword).get()
                    ]);

                    this.currentProduct = null;
                    if (!byId.empty) this.currentProduct = byId.docs[0].data();
                    else if (!byName.empty) this.currentProduct = byName.docs[0].data();

                    if (this.currentProduct) {
                        this.showProductInfo(this.currentProduct);
                    } else {
                        this.showError('Produk tidak ditemukan');
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    this.showError('Gagal mencari produk');
                }
            }

            showProductInfo(product) {
                const diskon = product.diskon || '-';
                const html = `
                    <h3>${product.nama}</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-top: 0.5rem;">
                        <div><span class="badge">ID:</span> ${product.id}</div>
                        <div><span class="badge">Harga:</span> Rp${product.hargajual}</div>
                        <div><span class="badge">Stok:</span> ${product.stock}</div>
                        <div><span class="badge">Diskon:</span> ${diskon}</div>
                    </div>
                `;
                document.getElementById('productInfo').innerHTML = html;
            }

            addToCart() {
                const quantity = parseInt(document.getElementById('quantity').value);
                if (!this.currentProduct || !quantity || quantity < 1) return;

                const existingItem = this.transactionItems.find(item => item.id === this.currentProduct.id);
                const totalQty = (existingItem?.jumlah || 0) + quantity;

                if (totalQty > this.currentProduct.stock) {
                    this.showError('Stok tidak mencukupi');
                    return;
                }

                if (existingItem) {
                    existingItem.jumlah += quantity;
                } else {
                    this.transactionItems.push({
                        ...this.currentProduct,
                        jumlah: quantity,
                        diskon: this.currentProduct.diskon || '-'
                    });
                }

                this.updateTransactionDisplay();
                document.getElementById('quantity').value = '';
            }

            removeItem(index) {
                if (confirm('Apakah anda yakin ingin menghapus item ini?')) {
                    this.transactionItems.splice(index, 1);
                    this.updateTransactionDisplay();
                }
            }

            updateTransactionDisplay() {
                const tbody = document.querySelector('#transactionItems tbody');
                tbody.innerHTML = '';
                
                let hargaAwal = 0;
                let totalDiskon = 0;

                this.transactionItems.forEach((item, index) => {
                    const diskonValue = item.diskon === '-' ? 0 : parseInt(item.diskon);
                    const subtotal = (item.hargajual * item.jumlah) - (diskonValue * item.jumlah);
                    
                    hargaAwal += item.hargajual * item.jumlah;
                    totalDiskon += diskonValue * item.jumlah;

                    tbody.innerHTML += `
                        <tr>
                            <td>${item.nama}</td>
                            <td>Rp${this.formatNumber(item.hargajual)}</td>
                            <td>${item.jumlah}</td>
                            <td>${item.diskon}</td>
                            <td>Rp${this.formatNumber(subtotal)}</td>
                            <td>
                                <button 
                                    class="danger"
                                    onclick="cashier.removeItem(${index})"
                                    title="Hapus dari keranjang"
                                >
                                    ✖
                                </button>
                            </td>
                        </tr>
                    `;
                });

                const totalHarga = hargaAwal - totalDiskon;
                document.getElementById('hargaAwal').textContent = this.formatNumber(hargaAwal);
                document.getElementById('totalDiskon').textContent = this.formatNumber(totalDiskon);
                document.getElementById('totalHarga').textContent = this.formatNumber(totalHarga);
                this.updateChange();
            }

            async processPayment() {
                const totalHarga = parseInt(document.getElementById('totalHarga').textContent.replace(/\D/g, ''));
                const totalBayar = parseInt(document.getElementById('totalBayar').value);

                if (!totalBayar || totalBayar < totalHarga) {
                    this.showError('Jumlah pembayaran tidak valid');
                    return;
                }

                try {

                    this.openReceiptModal();

                } catch (error) {
                    console.error('Payment error:', error);
                    this.showError('Gagal memproses transaksi');
                }
            }

            async saveTransaction(transactionId, totalHarga, totalBayar) {
                const transaksiData = {
                    id: this.transactionItems.map(item => item.id).join(','),
                    harga: this.transactionItems.map(item => item.hargajual).join(','),
                    jumlah: this.transactionItems.map(item => item.jumlah).join(','),
                    diskon: this.transactionItems.map(item => item.diskon).join(','),
                    hargaawal: document.getElementById('hargaAwal').textContent,
                    totaldiskon: document.getElementById('totalDiskon').textContent,
                    totalharga: totalHarga,
                    totalbayar: totalBayar,
                    totalkembalian: totalBayar - totalHarga,
                    tanggal: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('transaksi').doc(transactionId).set(transaksiData);
            }

            async updateStock() {
                const batch = db.batch();
                this.transactionItems.forEach(item => {
                    const productRef = db.collection('produk').doc(item.id);
                    batch.update(productRef, {
                        stock: firebase.firestore.FieldValue.increment(-item.jumlah)
                    });
                });
                await batch.commit();
            }

            async generateTransactionId() {
                const now = new Date();
                const dateString = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth()+1).padStart(2, '0')}${now.getFullYear()}`;
                const counterRef = db.collection('counters').doc(dateString);

                return db.runTransaction(async transaction => {
                    const doc = await transaction.get(counterRef);
                    const newNumber = doc.exists ? doc.data().seq + 1 : 1;
                    transaction.set(counterRef, { seq: newNumber });
                    return `${dateString}-${String(newNumber).padStart(3, '0')}`;
                });
            }

            updateChange() {
                const totalHarga = parseInt(document.getElementById('totalHarga').textContent.replace(/\D/g, '') || 0);
                const totalBayar = parseInt(document.getElementById('totalBayar').value || 0);
                document.getElementById('kembalian').textContent = this.formatNumber(totalBayar - totalHarga);
            }

            formatNumber(num) {
                return new Intl.NumberFormat('id-ID').format(num);
            }

            showError(message) {
                alert(`❌ ${message}`);
            }

            showSuccess(message) {
                alert(`✅ ${message}`);
            }

            resetTransaction() {
                this.transactionItems = [];
                this.currentProduct = null;
                document.querySelectorAll('#transactionItems tbody tr').forEach(row => row.remove());
                document.getElementById('hargaAwal').textContent = '0';
                document.getElementById('totalDiskon').textContent = '0';
                document.getElementById('totalHarga').textContent = '0';
                document.getElementById('totalBayar').value = '';
                document.getElementById('kembalian').textContent = '0';
                document.getElementById('productInfo').innerHTML = '';
                document.getElementById('searchInput').value = '';
            }

            openReceiptModal() {
  const modal = document.getElementById('paymentReceiptModal');
  const receiptBody = document.getElementById('receiptBody');

  // Ambil tanggal transaksi (pakai sekarang)
  const now = new Date();
  const tanggalStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');

  const tokoNama = "TOKO BERAS KWANGSAN";
  const tokoAlamat = "Jl. Mangkurejo, Kwangsan Lor, Kwangsan, Kec. Sedati, Kabupaten Sidoarjo, Jawa Timur 61253";

  let produkListHtml = '';
  let totalHargaAwal = 0;
  let totalDiskon = 0;

  this.transactionItems.forEach(item => {
    const diskonValue = item.diskon === '-' ? 0 : parseInt(item.diskon);
    const hargaSatuan = item.hargajual;
    const qty = item.jumlah;
    const subtotal = (hargaSatuan * qty) - (diskonValue * qty);

    totalHargaAwal += hargaSatuan * qty;
    totalDiskon += diskonValue * qty;

    produkListHtml += `
      <tr>
        <td style="padding: 2px 5px;">${item.nama}</td>
        <td style="padding: 2px 5px; text-align: center;">${qty}</td>
        <td style="padding: 2px 5px; text-align: right;">${this.formatNumber(hargaSatuan)}</td>
        <td style="padding: 2px 5px; text-align: right;">${this.formatNumber(diskonValue)}</td>
        <td style="padding: 2px 5px; text-align: right;">${this.formatNumber(subtotal)}</td>
      </tr>
    `;
  });

  const totalHarga = totalHargaAwal - totalDiskon;
  const totalBayar = parseInt(document.getElementById('totalBayar').value || 0);
  const totalKembalian = totalBayar - totalHarga;

  receiptBody.innerHTML = `
    <div style="font-family: monospace; font-size: 12px; white-space: pre-wrap; margin-bottom: 0;">
      ${tokoNama}\n
      ${tokoAlamat}\n
      Tanggal: ${tanggalStr}\n
      -----------------------------------------------------------------------\n
      Nama Produk                           Qty   Harga    Diskon    Subtotal\n
      -----------------------------------------------------------------------\n
      <table style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 12px;">
        <tbody>
          ${produkListHtml}
        </tbody>
      </table>
      ------------------------------------------------------------------------\n
      TOTAL      : Rp${this.formatNumber(totalHarga)}\n
      TUNAI      : Rp${this.formatNumber(totalBayar)}\n
      KEMBALI    : Rp${this.formatNumber(totalKembalian)}\n
    </div>
    <div style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 1rem;">
      <button id="btnPrintReceipt" class="btn btn-primary">Cetak</button>
      <button id="btnCancelReceipt" class="btn btn-danger">Batal</button>
    </div>
  `;

  modal.style.display = 'flex';

  // Event listener tombol Batal (close modal)
  document.getElementById('btnCancelReceipt').onclick = () => {
    modal.style.display = 'none';
  };

  // Event listener tombol Cetak (generate & download PDF)
  document.getElementById('btnPrintReceipt').onclick = () => {
    this.printReceiptPdf(totalHarga, totalBayar, totalKembalian);
    modal.style.display = 'none';
    // Setelah cetak, proses simpan transaksi dan reset
    this.finalizeTransaction(totalHarga, totalBayar);
  };
}

printReceiptPdf(totalHarga, totalBayar, totalKembalian) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const now = new Date();
  const tanggalStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');
  const tokoNama = "PT INDOMARCO PRISMATAMA";
  const tokoAlamat = "Jl. Ancol, Jkt Utara, CIDATAR - KAB GARUT";

  doc.setFont("Courier", "normal");
  doc.setFontSize(12);

  let y = 10;
  doc.text(tokoNama, 10, y); y += 7;
  doc.text(tokoAlamat, 10, y); y += 7;
  doc.text(`Tanggal: ${tanggalStr}`, 10, y); y += 7;

  doc.text("----------------------------------------", 10, y); y += 7;
  doc.text("Nama Produk     Qty   Harga  Diskon Subtotal", 10, y); y += 7;
  doc.text("----------------------------------------", 10, y); y += 7;

  this.transactionItems.forEach(item => {
    const diskonValue = item.diskon === '-' ? 0 : parseInt(item.diskon);
    const hargaSatuan = item.hargajual;
    const qty = item.jumlah;
    const subtotal = (hargaSatuan * qty) - (diskonValue * qty);

    // Format string agar rata kiri-kanan untuk tiap kolom
    const namaProduk = item.nama.length > 15 ? item.nama.substring(0, 15) + "…" : item.nama.padEnd(15, " ");
    const qtyStr = String(qty).padStart(3, " ");
    const hargaStr = this.formatNumber(hargaSatuan).padStart(6, " ");
    const diskonStr = this.formatNumber(diskonValue).padStart(6, " ");
    const subtotalStr = this.formatNumber(subtotal).padStart(7, " ");

    doc.text(`${namaProduk} ${qtyStr} ${hargaStr} ${diskonStr} ${subtotalStr}`, 10, y);
    y += 7;
  });

  doc.text("----------------------------------------", 10, y); y += 7;

  doc.text(`TOTAL   : Rp${this.formatNumber(totalHarga)}`, 10, y); y += 7;
  doc.text(`TUNAI   : Rp${this.formatNumber(totalBayar)}`, 10, y); y += 7;
  doc.text(`KEMBALI : Rp${this.formatNumber(totalKembalian)}`, 10, y); y += 7;

  doc.save(`struk-transaksi-${Date.now()}.pdf`);
}

async finalizeTransaction(totalHarga, totalBayar) {
  try {
    const transactionId = await this.generateTransactionId();
    await this.saveTransaction(transactionId, totalHarga, totalBayar);
    await this.updateStock();
    this.showSuccess(`Transaksi ${transactionId} berhasil!`);
    this.resetTransaction();
  } catch (error) {
    console.error('Finalize transaction error:', error);
    this.showError('Gagal memproses transaksi');
  }
}


        }

        

    function openProductList() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
    
    cashier.loadProducts().then(products => {
        const productList = document.getElementById('productList');
        productList.innerHTML = products.map(product => `
            <div class="product-item">
                <div>
                    <strong>${product.nama}</strong><br>
                    <small>ID: ${product.id} | Stok: ${product.stock}</small>
                </div>
                <button onclick="selectProduct('${product.id}')">Tambahkan</button>
            </div>
        `).join('');
    });
}



function closeProductList() {
    document.getElementById('productModal').style.display = 'none';
}

function selectProduct(productId) {
    document.getElementById('searchInput').value = productId;
    closeProductList();
    cashier.searchProduct();
}

// Tambahkan event listener untuk menutup modal saat klik di luar
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeProductList();
    }
}
        // Initialize the cashier system
        const cashier = new CashierSystem();

        // Global functions for HTML event handlers
        function searchProduct() { cashier.searchProduct(); }
        function addToCart() { cashier.addToCart(); }
        function processPayment() { cashier.processPayment(); }

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
window.openProductList = openProductList;
window.closeProductList = closeProductList;
window.selectProduct = selectProduct;
window.searchProduct = searchProduct;
window.addToCart = addToCart;
window.processPayment = processPayment;