# Product Requirement Document (PRD) — KasJersey (React Native + SQLite)

**Nama Produk:** KasJersey  
**Versi:** 1.1.0 (Offline-First Mobile App — Piece-Rate Payroll Support)  
**Tech Stack Utama:** React Native (Expo) + Native SQLite (`react-native-quick-sqlite` / `expo-sqlite`)  
**Tipe Aplikasi:** Android Standalone Application (`.apk`)  
**Target Pengguna:** Bendahara / Penanggung Jawab Keuangan Toko Apparel KasJersey  
**Tanggal Update:** November 2026  

---

## 1. Ringkasan Eksekutif (Executive Summary)

**KasJersey** adalah aplikasi pencatatan keuangan operasional toko apparel (konveksi & jersey) yang dibangun secara **100% offline-first** menggunakan **React Native (Expo)** dan **SQLite**. 

Aplikasi ini ditujukan khusus untuk perangkat Android milik bendahara toko. Sistem ini mengintegrasikan seluruh arus pencatatan keuangan harian—termasuk penjualan jersey, belanja bahan baku, pemeliharaan mesin printing, token listrik, hingga **skema upah jahit borongan (piece-rate) per pcs berdasarkan kerumitan model** yang terhubung secara otomatis dengan pelunasan kasbon karyawan.

---

## 2. Masalah & Tujuan (Problem & Goals)

### 2.1 Masalah (Problem Statement)
* **Pencatatan Upah Jahit Borongan yang Rumit:** Penjahit tidak dibayar bulanan tetap, melainkan per pcs dengan tarif yang bervariasi (lengan panjang, kerah polo, celana, kancing). Perhitungan manual sering memicu kekeliruan nominal upah.
* **Ketersediaan Internet di Konveksi:** Lokasi produksi/konveksi sering kali minim sinyal, sehingga aplikasi cloud-based lambat atau tidak bisa digunakan.
* **Perhitungan Kasbon & Upah Bersih:** Pemotongan kasbon saat pembayaran upah jahit borongan sering membingungkan jika dihitung terpisah di kalkulator.

### 2.2 Tujuan Utama (Goals)
* Menghadirkan modul **Kalkulator Upah Borongan Per Pcs** fleksibel yang mendukung *multi-line item* dalam satu kali transaksi pembayaran.
* Otomatisasi pengurangan kas toko dan pelunasan kasbon karyawan secara *real-time* saat upah jahit dibayarkan.
* Menjamin keamanan data internal toko melalui enkripsi data lokal dan otentikasi biometrik/PIN.

---

## 3. Profil Pengguna (User Persona)

* **Peran:** Bendahara / Admin Keuangan Toko Apparel KasJersey
* **Perangkat Target:** Smartphone Android (Minimum RAM 3GB, Android 8.0+)
* **Ekspektasi Pengguna:**
  * Form input upah jahit yang intuitif: isi jumlah *qty (pcs)* dan harga per *pcs* (bisa input manual / preset model), langsung keluar total upah.
  * Opsi potong kasbon otomatis saat pencatatan upah borongan.
  * Laporan bersih harian/bulanan siap cetak atau di-share dalam format file `.pdf` / `.csv` lokal.

---

## 4. Kebutuhan Fungsional Spesifik (Functional Requirements)

### 4.1 Modul Upah Jahit Borongan (Piece-Rate Payroll Engine)
1. **Multi-Item Model per Transaksi:**
   Dalam 1 pencatatan pembayaran penjahit, bendahara dapat menambahkan beberapa baris rincian pekerjaan:
   * *Item 1:* 20 pcs $\times$ Rp 12.000 (Setelan Lengan Panjang + Kerah Polo) = Rp 240.000
   * *Item 2:* 15 pcs $\times$ Rp 9.000 (Jersey Short Sleeve Oblong) = Rp 135.000
2. **Kalkulasi Upah Kotor (Gross Pay):**
   

   $$
   \text{Total Upah Kotor Borongan} = \sum_{i=1}^{n} (\text{Qty Pcs}_i \times \text{Tarif per Pcs}_i)
   $$

3. **Integrasi Potong Kasbon & Upah Bersih (Net Pay):**
   

   $$
   \text{Upah Bersih Dibayar (Kas Keluar)} = \text{Total Upah Kotor Borongan} - \text{Potongan Kasbon}
   $$

   * Kas toko **hanya berkurang sebesar Upah Bersih Dibayar**.
   * Status sisa kasbon karyawan diupdate secara otomatis.

---

## 5. Skema Database SQLite Relevan (Upah Borongan & Kasbon)

```sql
-- Tabel Transaksi Kas (Ledger Utama)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date DATETIME NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL, -- Merupakan Upah Bersih Dibayar (Net Amount)
    description TEXT,
    employee_id INTEGER NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(employee_id) REFERENCES employees(id)
);

-- Tabel Detail Borongan Jahit (Rincian Pcs & Model)
CREATE TABLE IF NOT EXISTS payroll_piece_rate_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    model_description TEXT NOT NULL, -- Misal: "Lengan Panjang Polo + Kancing"
    qty INTEGER NOT NULL,            -- Jumlah pcs
    rate_per_pcs REAL NOT NULL,      -- Harga per pcs
    subtotal REAL NOT NULL,          -- qty * rate_per_pcs
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Tabel Kasbon Karyawan
CREATE TABLE IF NOT EXISTS kasbon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATETIME NOT NULL,
    total_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    status TEXT CHECK(status IN ('UNPAID', 'PARTIAL', 'PAID')) DEFAULT 'UNPAID',
    notes TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
);

-- Tabel Histori Pemotongan Kasbon
CREATE TABLE IF NOT EXISTS kasbon_settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kasbon_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    amount_deducted REAL NOT NULL,
    date DATETIME NOT NULL,
    FOREIGN KEY(kasbon_id) REFERENCES kasbon(id),
    FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);
```

---

## 6. Development Roadmap Update
* **Modul Borongan Jahit:** Form dinamis add/remove item rincian pcs + perkalian otomatis.
* **Integrasi Kasbon:** Auto fetch sisa kasbon karyawan saat nama penjahit dipilih.