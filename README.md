# KasJersey

Aplikasi pencatatan keuangan toko apparel (konveksi & jersey) — 100% offline-first.
React Native (Expo SDK 58) + SQLite. Target: Android APK.

## Fitur

- **Ledger kas** — pemasukan/pengeluaran dengan kategori.
- **Upah borongan (piece-rate)** — form multi-line (qty × tarif per pcs), kalkulasi otomatis, slip PDF.
- **Kasbon karyawan** — pencatatan kasbon & potong otomatis (FIFO) saat bayar upah.
- **Laporan** — ringkasan periode + ekspor CSV (kas, kasbon).
- **Keamanan** — PIN/biometrik (dedicated screen belum di-wire; service siap).

## Perintah

```sh
npm start          # dev server
npm run android    # jalankan di Android
npm test           # unit test (Jest)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Struktur

```
src/
├── app/            # Expo Router — route tiap file
│   ├── (tabs)/     # Dashboard, Kas, Kasbon, Laporan
│   ├── payroll.tsx       # form upah borongan (modal)
│   ├── transaction.tsx   # transaksi kas (modal)
│   ├── kasbon-new.tsx    # kasbon baru (modal)
│   └── employee-new.tsx  # karyawan baru (modal)
├── components/     # UI reusable (Card, ui styles)
├── config/         # konstanta + formatter mata uang/tanggal
├── database/       # koneksi + migrasi + seed
├── repositories/   # akses data (DAO)
├── services/       # payrollMath (pure), payrollEngine, reportBuilder, exportService, authService
├── store/          # Zustand
└── types/          # model TypeScript
```

## Catatan arsitektur

- **Mutasi uang di satu tempat**: `services/payrollEngine.ts` (`processPieceRatePayroll`)
  mencatat ledger + rincian + pelunasan kasbon dalam satu transaksi SQLite (`withTransactionAsync`).
- **Logika murni terpisah**: `services/payrollMath.ts` bebas dependensi native agar bisa di-unit-test.
- **Migrasi**: berbasis `PRAGMA user_version` di `database/db.ts`.

## Belum dikerjakan

- Layar kunci PIN/biometrik (service `authService` sudah ada, tinggal UI gate di root layout).
- Backup/restore file `.db`.
- Edit/hapus karyawan dari UI (repo sudah ada).
