# System Design Document — KasJersey (React Native + SQLite)

**Nama Produk:** KasJersey  
**Versi Document:** 1.0.0  
**Target Platform:** Android (Offline-First Mobile App via Expo)  
**Tech Stack Utama:** React Native (Expo), Native SQLite (`expo-sqlite` / `react-native-quick-sqlite`), Zustand / Context API, React Native Paper / Tailwind (NativeWind)  
**Tanggal Update:** November 2026  

---

## 1. Arsitektur Tingkat Tinggi (High-Level Architecture)

KasJersey mengadopsi pola **Offline-First Architecture** berbasis **Clean Architecture** (Layered Architecture). Seluruh manipulasi data, transaksi keuangan, perhitungan upah borongan, dan pelaporan dilakukan secara lokal di dalam perangkat Android tanpa ketergantungan pada server eksternal/cloud API.

```
+-----------------------------------------------------------------------+
|                         PRESENTATION LAYER                            |
|  - React Native Components (Screens, Modals, Forms)                   |
|  - UI Library (React Native Paper / NativeWind)                       |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                         APPLICATION LAYER                             |
|  - State Management (Zustand / React Context)                         |
|  - Custom Hooks (usePayroll, useKasbon, useLedger, useReports)        |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                            DOMAIN LAYER                               |
|  - Business Logic & Calculations (Piece-Rate Engine, Kasbon Deduct)  |
|  - Data Validators (Yup / Zod)                                        |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                      DATA LAYER & PERSISTENCE                         |
|  - SQLite Database Driver (`expo-sqlite` / `react-native-quick-sqlite`)|
|  - Data Access Objects (DAOs / Repositories)                          |
|  - Local File System (PDF / CSV Export Engine)                        |
|  - Secure Storage (Encrypted Key / PIN Storage)                       |
+-----------------------------------------------------------------------+
```

---

## 2. Diagram Alir Data & Komponen Utama

### 2.1 Modul Pengolahan Transaksi Upah Borongan (Piece-Rate Engine)

```
[ Form Upah Jahit ]
        |
        v
[ Input: Employee ID, Multi-Line Items (Qty x Rate), Potongan Kasbon ]
        |
        v
[ Domain Business Logic ]
   ├── Calc Gross Pay = ∑ (Qty_i * Rate_i)
   ├── Validate Kasbon Deduction (Deduction <= Sisa Kasbon && Deduction <= Gross Pay)
   └── Calc Net Pay (Kas Keluar) = Gross Pay - Deduction
        |
        v
[ SQLite Transaction Block (ACID Guarantee) ]
   ├── 1. INSERT INTO transactions (amount = Net Pay, type = 'EXPENSE')
   ├── 2. FOR EACH item -> INSERT INTO payroll_piece_rate_details
   ├── 3. IF Deduction > 0:
   │       ├── UPDATE kasbon (remaining_amount -= Deduction, status = PAID/PARTIAL)
   │       └── INSERT INTO kasbon_settlements
   └── 4. COMMIT TRANSACTION
        |
        v
[ Refresh Application State & UI Feedback ]
```

---

## 3. Schema Data Lengkap (SQLite Entity-Relationship Diagram & DDL)

### 3.1 Diagram Hubungan Entitas (ERD Concept)

* **`categories`** `1` --- `N` **`transactions`**
* **`employees`** `1` --- `N` **`transactions`**
* **`employees`** `1` --- `N` **`kasbon`**
* **`transactions`** `1` --- `N` **`payroll_piece_rate_details`**
* **`transactions`** `1` --- `N` **`kasbon_settlements`**
* **`kasbon`** `1` --- `N` **`kasbon_settlements`**

### 3.2 SQL Schema DDL Engine

```sql
PRAGMA foreign_keys = ON;

-- 1. Tabel Kategori Kas (Pemasukan / Pengeluaran)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
    is_system_default INTEGER DEFAULT 0, -- 1 jika kategori bawaan (eg. Upah Borongan)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Karyawan / Penjahit
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'PENJAHIT', -- PENJAHIT, CUTTING, FINISHING, DLL.
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Preset Model & Tarif (Opsional untuk Autocomplete UI)
CREATE TABLE IF NOT EXISTS job_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL, -- Contoh: "Setelan Lengan Panjang + Kerah Polo"
    default_rate REAL NOT NULL, -- Contoh: 12000
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Kasbon Karyawan
CREATE TABLE IF NOT EXISTS kasbon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATETIME NOT NULL,
    total_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    status TEXT CHECK(status IN ('UNPAID', 'PARTIAL', 'PAID')) DEFAULT 'UNPAID',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE RESTRICT
);

-- 5. Tabel Ledger Utama Transaksi Kas
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date DATETIME NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL, -- Net Pay / Net Expense (Total Kas Keluar/Masuk Sebenarnya)
    description TEXT,
    employee_id INTEGER NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- 6. Tabel Detail Piece-Rate Payroll (Multi-line item borongan)
CREATE TABLE IF NOT EXISTS payroll_piece_rate_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    model_description TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK(qty > 0),
    rate_per_pcs REAL NOT NULL CHECK(rate_per_pcs >= 0),
    subtotal REAL NOT NULL, -- qty * rate_per_pcs
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- 7. Tabel Settlement Kasbon (Histori Potong Kasbon per Transaksi)
CREATE TABLE IF NOT EXISTS kasbon_settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kasbon_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    amount_deducted REAL NOT NULL CHECK(amount_deducted > 0),
    date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(kasbon_id) REFERENCES kasbon(id) ON DELETE RESTRICT,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- INDEXING UNTUK OPTIMASI QUERY OFFLINE
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_kasbon_employee ON kasbon(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_details_tx ON payroll_piece_rate_details(transaction_id);
```

---

## 4. Algoritma Utama & Logika Bisnis (Business Logic)

### 4.1 Pemrosesan Transaksi Payroll Borongan & Kasbon Settlement

Secara pseudocode, proses penyimpanan upah jahit dilakukan dalam satu transaksi atomic database:

```typescript
interface PieceRateItem {
  modelDescription: string;
  qty: number;
  ratePerPcs: number;
}

interface PayrollPayload {
  employeeId: number;
  categoryId: number; // ID Kategori "Upah Borongan"
  transactionDate: string;
  items: PieceRateItem[];
  kasbonDeduction: number; // Nominal potongan kasbon yang dimasukkan user
  notes?: string;
}

async function processPieceRatePayroll(payload: PayrollPayload): Promise<void> {
  const db = await getDatabaseConnection();

  // 1. Hitung Gross Pay
  const grossPay = payload.items.reduce((acc, item) => {
    return acc + (item.qty * item.ratePerPcs);
  }, 0);

  // 2. Validasi Logika Bisnis
  if (payload.kasbonDeduction > grossPay) {
    throw new Error("Potongan kasbon tidak boleh melebihi total upah kotor.");
  }

  const netPay = grossPay - payload.kasbonDeduction;

  await db.transactionAsync(async (tx) => {
    // A. Insert ke Ledger Utama (Kas Keluar sebesar Net Pay)
    const txResult = await tx.executeSqlAsync(
      `INSERT INTO transactions (transaction_date, type, category_id, amount, description, employee_id)
       VALUES (?, 'EXPENSE', ?, ?, ?, ?)`,
      [payload.transactionDate, payload.categoryId, netPay, payload.notes || 'Pembayaran Upah Borongan', payload.employeeId]
    );
    const transactionId = txResult.insertId;

    // B. Insert Multi-line Items Detail Borongan
    for (const item of payload.items) {
      const subtotal = item.qty * item.ratePerPcs;
      await tx.executeSqlAsync(
        `INSERT INTO payroll_piece_rate_details (transaction_id, model_description, qty, rate_per_pcs, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, item.modelDescription, item.qty, item.ratePerPcs, subtotal]
      );
    }

    // C. Jika Ada Potongan Kasbon, Lakukan Pelunasan Kasbon Karyawan
    if (payload.kasbonDeduction > 0) {
      let remainingDeductionToApply = payload.kasbonDeduction;

      // Ambil daftar kasbon Karyawan yang belum lurus (FIFO: First In First Out)
      const activeKasbons = await tx.executeSqlAsync(
        `SELECT id, remaining_amount FROM kasbon 
         WHERE employee_id = ? AND status IN ('UNPAID', 'PARTIAL') 
         ORDER BY date ASC`,
        [payload.employeeId]
      );

      for (let i = 0; i < activeKasbons.rows.length; i++) {
        if (remainingDeductionToApply <= 0) break;

        const currentKasbon = activeKasbons.rows.item(i);
        const kasbonId = currentKasbon.id;
        const currentRemaining = currentKasbon.remaining_amount;

        let deductAmountForThisKasbon = 0;

        if (remainingDeductionToApply >= currentRemaining) {
          deductAmountForThisKasbon = currentRemaining;
          remainingDeductionToApply -= currentRemaining;

          // Update Kasbon Lunas
          await tx.executeSqlAsync(
            `UPDATE kasbon SET remaining_amount = 0, status = 'PAID' WHERE id = ?`,
            [kasbonId]
          );
        } else {
          deductAmountForThisKasbon = remainingDeductionToApply;
          const newRemaining = currentRemaining - remainingDeductionToApply;
          remainingDeductionToApply = 0;

          // Update Kasbon Sebagian
          await tx.executeSqlAsync(
            `UPDATE kasbon SET remaining_amount = ?, status = 'PARTIAL' WHERE id = ?`,
            [newRemaining, kasbonId]
          );
        }

        // Catat Histori Settlement Kasbon
        await tx.executeSqlAsync(
          `INSERT INTO kasbon_settlements (kasbon_id, transaction_id, amount_deducted, date)
           VALUES (?, ?, ?, ?)`,
          [kasbonId, transactionId, deductAmountForThisKasbon, payload.transactionDate]
        );
      }
    }
  });
}
```

---

## 5. Struktur Folder & Komponen Aplikasi (Modular Project Structure)

```
kasjersey-app/
├── assets/                  # Images, fonts, icons
├── src/
│   ├── config/              # Constant configurations (DB Name, Formats)
│   ├── database/            # Database initialization & migrations
│   │   ├── migrations/      # DB Schema versioning
│   │   ├── db.ts            # Connection SQLite provider
│   │   └── seed.ts          # Initial data (Categories default)
│   ├── repositories/        # SQLite Data Layer Access (DAOs)
│   │   ├── ledgerRepo.ts
│   │   ├── payrollRepo.ts
│   │   ├── kasbonRepo.ts
│   │   └── employeeRepo.ts
│   ├── services/            # Business & Export logic
│   │   ├── payrollEngine.ts # Logika kalkulasi & FIFO kasbon
│   │   ├── pdfExporter.ts   # HTML to PDF converter lokal
│   │   └── csvExporter.ts   # CSV exporter file System
│   ├── store/               # State Management (Zustand Stores)
│   │   ├── useLedgerStore.ts
│   │   ├── usePayrollStore.ts
│   │   └── useKasbonStore.ts
│   ├── screens/             # UI Views / Screens
│   │   ├── DashboardScreen.tsx
│   │   ├── LedgerScreen.tsx
│   │   ├── PayrollFormScreen.tsx  # Dynamic Multi-Line Form
│   │   ├── KasbonScreen.tsx
│   │   └── ReportsScreen.tsx
│   ├── components/          # Reusable UI Widgets
│   │   ├── PieceRateItemRow.tsx
│   │   ├── KasbonSummaryCard.tsx
│   │   └── MetricCard.tsx
│   ├── utils/               # Currency, Date, & String Helpers
│   └── types/               # TypeScript Models & Interfaces
├── App.tsx                  # Root Entry Point & DB Initialization
└── app.json                 # Expo Build Configuration
```

---

## 6. Integrasi Ekspor Data & Keamanan Lokasi (Offline Security & Reporting)

### 6.1 Modul Ekspor Laporan Lokal (PDF & CSV)
* **Teknologi Ekspor:** `expo-print` (untuk HTML to PDF conversion) dan `expo-file-system` + `expo-sharing` (untuk menyimpan dan membagikan dokumen via WhatsApp/Email).
* **Format Laporan PDF:** Slip Upah Jahit Borongan mencakup detail nama penjahit, rincian per model ($Qty \times Rate$), rincian total upah kotor, pemotongan kasbon, serta total bersih yang dibayarkan.

### 6.2 Strategi Keamanan Data & Biometrik
* **Keamanan Akses Perangkat:** Penggunaan `expo-local-authentication` (Biometrik / Fingerprint & PIN App Level) sebelum bendahara membuka aplikasi.
* **Backup & Restore Data Lokal:** Fitur *Export Database Backup* (`.db` atau `.json`) ke penyimpanan internal perangkat Android atau Google Drive lokal milik bendahara secara manual untuk proteksi terhadap kerusakan perangkat (*device loss/damage*).

---

## 7. Rencana Pengujian (Testing Strategy)

1. **Unit Testing (Jest):**
   * Pengujian presisi *Payroll Engine*: Memastikan hasil perhitungan matematis $Qty \times Rate$, total gross, pemotongan kasbon FIFO, dan nominal net pay akurat tanpa sisa presisi desimal.
2. **Database Integration Testing:**
   * Pengujian sifat *ACID Transaction*: Memastikan rollback terjadi jika salah satu query *insert/update* gagal (misal gagal saat memotong kasbon, maka pencatatan transaksi kas juga dibatalkan).
3. **UI & Usability Testing (Manual Edge-Cases):**
   * Skenario *Form Dinamis*: Penambahan & penghapusan baris item model jahit secara *real-time*.
   * Skenario Penjahit tanpa Kasbon vs Penjahit dengan Kasbon Aktif.