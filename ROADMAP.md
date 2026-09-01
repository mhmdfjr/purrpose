# Roadmap

Milestone disusun berdasarkan dependency teknis (fondasi dulu, baru fitur yang bergantung padanya), bukan berdasarkan estimasi waktu — velocity tim belum diketahui, jadi setiap milestone diberi label **ukuran relatif** (S/M/L) untuk membantu prioritisasi, bukan komitmen tanggal.

## M0 — Project Setup & Infrastructure (S)

**Tujuan**: fondasi teknis siap sebelum fitur apa pun ditulis.

- Init Next.js App Router project, Tailwind, install neobrutalism.dev components lewat shadcn CLI.
- Setup Firebase project **terpisah untuk dev dan production** (best practice, jangan develop langsung di project yang sama dengan production data).
- Aktifkan Firebase Auth providers: email/password, Google, GitHub, X (`twitter.com` provider ID — verifikasi ulang sesuai catatan di `ARCHITECTURE.md` Section 5).
- Setup Cloud Functions project (TypeScript) + Firebase Emulator Suite untuk local development.
- Struktur folder sesuai `ARCHITECTURE.md` Section 11 (`/app`, `/functions`, `/shared`).
- Terapkan design tokens dari `DESIGN.md` Section 2 ke `globals.css`.
- CI/CD dasar: Vercel untuk frontend, Firebase CLI deploy untuk functions.

**Exit criteria**: "Hello world" page ter-deploy ke Vercel, Cloud Function dummy bisa dipanggil dari emulator, login page tampil dengan styling neo brutalism dasar.

## M1 — Authentication & Onboarding (M)

**Tujuan**: user bisa register, login, dan profil awal ter-setup.

- Login/register page (email + 3 OAuth provider).
- Session cookie verification di Server Component untuk auth guard (`ARCHITECTURE.md` Section 5).
- Onboarding flow: buat dokumen `users/{uid}` saat first login, auto-detect timezone di client, kirim ke `updateProfile`.
- Resolve city awal saat onboarding (bukan tunggu weekly cycle pertama) lewat panggilan ke ip2location.io dari Cloud Function, supaya profile user sudah punya `city` sebelum leaderboard cycle pertama jalan.
- Implementasi `updateProfile` callable function (termasuk compute `utcResetHour`).

**Depends on**: M0.

**Exit criteria**: user baru bisa register lewat semua provider, profil ter-buat otomatis dengan `city` dan `timezone` terisi, bisa edit profil dari halaman Profile.

## M2 — Task Management Core (M)

**Tujuan**: fitur inti Home page: create, edit, delete, complete task.

- Firestore schema `users/{uid}/tasks` sesuai `DATABASE.md`.
- Callable functions: `createTask`, `updateTask`, `deleteTask`, `completeTask`, termasuk validasi daily aggregate cap (aggregation query `sum()`).
- Security rules: deny semua direct write ke `tasks`.
- Home page UI: dua kolom Hustle/Humble, task card, dialog create/edit, checkbox complete (`DESIGN.md` Section 6.1).
- Realtime listener untuk task list hari berjalan.

**Depends on**: M1 (butuh auth untuk scope task ke user).

**Exit criteria**: user bisa membuat, mengedit, menghapus, dan menyelesaikan task; skor muncul benar sesuai formula `level x durasi`; input yang melanggar daily cap ditolak dengan pesan yang jelas.

## M3 — Task Lifecycle & Daily Report (S)

**Tujuan**: task yang tidak diselesaikan bertransisi jadi `missed`, dan daily report bisa dilihat.

- `taskCutoverJob` scheduled function (hourly, filter `utcResetHour`).
- Daily report page: query task hari tertentu, tampilkan status per task dan total skor per kategori.
- UI state untuk task `missed` (`DESIGN.md` Section 6.1).

**Depends on**: M2.

**Exit criteria**: task yang tidak di-complete sebelum hari berakhir otomatis jadi `missed` dalam waktu maksimal 1 jam setelah local midnight user; daily report menampilkan data yang akurat.

## M4 — Weekly Report (M)

**Tujuan**: user bisa melihat weekly report dengan balance index dan saran rule-based.

- Bagian pertama dari `weeklyCycleJob`: hitung `hustleScore`, `humbleScore`, `balanceIndex`, `completionRate` per user, tulis ke `users/{uid}/weeklyReports/{weekId}`.
- Rule-based suggestion generator (threshold-based, sesuai `PRD.md` Section 7.2).
- Setup Remote Config untuk `dailyDurationCapHours` dan konstanta lain yang relevan di tahap ini.
- Weekly report UI: gauge balance index, breakdown skor, card suggestion (`DESIGN.md` Section 6.2).

**Depends on**: M3 (butuh data `missed` yang akurat untuk `completionRate`).

**Catatan**: ini baru **sebagian** dari `weeklyCycleJob` — bagian matching leaderboard menyusul di M6. Fungsi yang sama akan diperluas, bukan dibuat function baru.

**Exit criteria**: setiap Senin, weekly report ter-generate otomatis untuk semua user dengan angka yang bisa diverifikasi manual dari task minggu tersebut.

## M5 — AI-Enhanced Suggestion (S)

**Tujuan**: opsi saran yang lebih personalized lewat LLM.

- Service abstraction untuk LLM API call, dengan timeout dan fallback ke rule-based (`ARCHITECTURE.md` Section 4.4).
- `regenerateWeeklySuggestion` callable function dengan cooldown per user.
- Toggle `aiReportEnabled` di Profile settings, terhubung ke suggestion generation di `weeklyCycleJob`.

**Depends on**: M4.

**Exit criteria**: user dengan `aiReportEnabled = true` mendapat saran tambahan dari AI di weekly report; kalau API gagal, report tetap tampil dengan rule-based suggestion tanpa error yang terlihat user.

## M6 — Leaderboard & Badges (L)

**Tujuan**: fitur kompetitif mingguan lengkap dengan badge.

- Perluas `weeklyCycleJob`: matching city -> province fallback, hitung `leaderboardScore` (formula di `PRD.md`/`ARCHITECTURE.md`), assign rank, assign badge top 3.
- Quota monitoring untuk ip2location.io (alert sebelum mendekati limit bulanan) dan graceful degradation kalau quota habis (`ARCHITECTURE.md` Section 4.4 poin 4).
- Denormalisasi `currentGroupId` ke `users/{uid}` setelah matching selesai.
- Leaderboard page UI: tabel, highlight baris user sendiri, indikator fallback lokasi, icon medali top 3 (`DESIGN.md` Section 6.3).
- Badge showcase di Profile (`DESIGN.md` Section 6.4).

**Depends on**: M4 (butuh `weeklyReports` sebagai input skor).

**Ini milestone paling berisiko** — kompleksitas matching bertingkat, formula weighting, dan interaksi dengan external API (quota, error handling) berkumpul di satu tempat. Sisihkan waktu review lebih untuk milestone ini dibanding estimasi awal.

**Exit criteria**: leaderboard grup ter-bentuk otomatis tiap awal minggu, skor dan rank akurat sesuai formula, badge top 3 ter-assign dan tampil di profil masing-masing pemenang.

## M7 — Hardening & Edge Cases (M)

**Tujuan**: menutup risiko yang sudah diketahui dari `ARCHITECTURE.md` sebelum dianggap production-ready.

- Desain dan implementasi idempotency/resume untuk `weeklyCycleJob` (risk yang dicatat di `ARCHITECTURE.md` Section 12 — belum diselesaikan di level dokumen, harus selesai di sini).
- Firebase App Check di seluruh callable function.
- Firestore Security Rules test suite (`@firebase/rules-unit-testing`).
- Unit test Cloud Functions untuk logic scoring, cap validation, balance formula (bagian paling kritis untuk correctness).
- Verifikasi ToS ip2location.io terkait commercial use sebelum lanjut ke M8.

**Depends on**: M6.

**Exit criteria**: simulasi kegagalan di tengah `weeklyCycleJob` (misal kill function di tengah proses) bisa di-recover dengan re-run tanpa duplikasi skor/badge; test suite hijau.

## M8 — Polish & Launch Prep (S)

**Tujuan**: siap dipakai user nyata.

- Empty state dan microcopy pass sesuai tone di `DESIGN.md` Section 8.
- Responsive QA di seluruh halaman.
- Review composite index yang benar-benar terpakai vs yang didefinisikan di `DATABASE.md` Section 8, deploy index yang kurang.
- Setup production Firebase project (kalau belum), pisah dari dev sepenuhnya.
- Final review upgrade ip2location.io ke paid plan kalau hasil verifikasi ToS di M7 mengharuskan.

**Depends on**: M7.

**Exit criteria**: aplikasi bisa diakses publik dengan seluruh fitur di scope PRD berfungsi, tanpa known blocker dari risk list di `ARCHITECTURE.md`.

## Di Luar Roadmap Ini

Fitur yang sengaja tidak masuk milestone manapun karena eksplisit out-of-scope di `PRD.md` Section 13 (recurring task template, notifikasi push, social feature di luar leaderboard, monetisasi). Kalau prioritas berubah dan salah satu ini masuk scope, perlu revisit `PRD.md` dulu sebelum ditambahkan ke roadmap — supaya requirement dan implementasi tidak diverge.
