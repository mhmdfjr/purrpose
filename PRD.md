# Product Requirements Document (PRD)

## 1. Overview

Web application untuk tracking produktivitas dan kesehatan mental pengguna menggunakan prinsip gamifikasi. Pengguna mengelola daily to-do list yang dibagi menjadi dua kategori task: **Hustle** (produktivitas: kerja, pendidikan, aktivitas lain yang menambah tekanan) dan **Humble** (recovery: makan, tidur, olahraga, hiburan, aktivitas yang menurunkan tekanan). Setiap task menghasilkan skor saat diselesaikan, mendorong user menyeimbangkan output produktivitas dengan pemulihan mental.

Kompetisi sosial dihadirkan lewat weekly leaderboard berbasis lokasi (city-level), dengan badge collectible sebagai reward jangka panjang.

## 2. Problem Statement

Aplikasi productivity tracker pada umumnya hanya mengukur output (task selesai) tanpa mempertimbangkan burnout risk. User yang hustle terus-menerus tanpa recovery time tidak mendapat sinyal peringatan apa pun dari tools yang ada. Aplikasi ini secara eksplisit men-track dua sisi: produktivitas dan recovery, lalu memberi insight tentang keseimbangan keduanya.

## 3. Target User

Individu produktif (pekerja, mahasiswa, freelancer) yang ingin membangun kebiasaan kerja sekaligus menjaga kesehatan mental, dan termotivasi oleh elemen kompetitif/gamifikasi (skor, leaderboard, badge).

## 4. Core Concept: Hustle & Humble

| Aspek | Hustle | Humble |
|---|---|---|
| Tujuan | Produktivitas | Recovery / stress management |
| Contoh | Kerja, belajar, meeting, project | Tidur, makan, olahraga, nonton, journaling |
| Skala skor | 5 level tekanan (1 = ringan, 5 = berat) | 5 level relaksasi (1 = ringan, 5 = sangat memulihkan) |

Task bersifat **manual, non-recurring**. User re-add task setiap hari secara eksplisit. Tidak ada task template/recurring generator di scope awal ini — keputusan ini menyederhanakan data model karena setiap task adalah dokumen independen dengan field `date`, tanpa perlu sinkronisasi antara template dan instance harian.

## 5. Scoring System

### 5.1 Formula

```
score = level (1-5) x durasi (jam)
```

- `level` diisi user saat create task: tingkat tekanan (hustle) atau tingkat relaksasi (humble).
- `durasi` diisi user dalam satuan jam (bisa desimal, misal 1.5).

### 5.2 Anti-abuse: Duration Cap

Tanpa batas atas, user bisa memanipulasi skor (misal input durasi 20 jam untuk satu task). Dua lapis cap diterapkan:

- **Flat per-task cap**: setiap task tunggal, apa pun kategorinya, maksimum **16 jam**. Angka ini dipilih cukup generous untuk kasus durasi terpanjang yang wajar (tidur ekstrem, kerja maraton) tapi tetap menangkap input yang jelas tidak masuk akal. Berlaku sama untuk hustle maupun humble — **bukan per-tipe task** (tidur/olahraga/kerja beda cap), karena title task bersifat free-text di skema (lihat `DATABASE.md`), bukan enum yang bisa dipetakan ke cap berbeda-beda. Memaksakan cap per-tipe berarti harus menambah field klasifikasi baru yang belum ada nilainya buat fase MVP — flat cap adalah trade-off yang disengaja untuk kesederhanaan.
- **Daily aggregate cap (confirmed)**: total durasi seluruh task (hustle + humble digabung) dalam satu tanggal tidak boleh melebihi **24 jam**.

Validasi dilakukan saat create/update task: cek durasi task itu sendiri terhadap flat cap, lalu hitung total durasi task existing di tanggal yang sama, tolak input kalau salah satu dari dua threshold ini terlampaui.

Implikasi implementasi: validasi cap harian butuh read existing tasks di tanggal tersebut sebelum write, idealnya dilakukan dalam Firestore transaction untuk menghindari race condition kalau user membuat beberapa task hampir bersamaan (misal dari multiple tab/device). Kedua angka cap (16 jam per-task, 24 jam per-hari) ditaruh di Firebase Remote Config, bukan hardcoded, supaya bisa di-tune tanpa redeploy (`ARCHITECTURE.md` Section 4.3).

### 5.3 Skor tidak dikurangi

Task yang tidak diselesaikan tidak mengurangi skor secara langsung (tidak ada skor negatif per task). Efeknya tetap ada lewat `completion_rate` sebagai salah satu komponen weighting leaderboard score (`ARCHITECTURE.md` Section 8.1) — jadi task yang sering `missed` tetap berdampak ke daya saing user di leaderboard, hanya tidak dalam bentuk pengurangan skor langsung. Keputusan non-punitive ini konsisten dipakai di seluruh dokumen turunan (`DESIGN.md` Section 8 microcopy tone), dianggap final.

## 6. Task Management (Home Page)

- User membuat task baru: pilih kategori (Hustle/Humble), title, level (1-5), durasi (jam), tanggal.
- Task tampil dalam list harian, dikelompokkan per kategori.
- User menandai task sebagai selesai (mark as complete) untuk mendapat skor.
- User bisa edit/delete task yang belum selesai.
- Task yang sudah completed bersifat read-only (tidak bisa diedit untuk mencegah manipulasi skor setelah fakta).

### 6.1 Task Lifecycle

Task punya 3 status: `pending` -> `completed` atau `missed`.

- `pending`: default saat dibuat, masih dalam window hari berjalan.
- `completed`: user menandai selesai sebelum hari berakhir, menghasilkan skor.
- `missed`: otomatis di-assign saat hari berakhir dan task masih `pending`. Tidak menghasilkan skor, tapi tercatat untuk dihitung di completion rate leaderboard (lihat Section 8.1).

**Implikasi arsitektur**: transisi `pending` -> `missed` butuh scheduled job (Cloud Scheduler + Cloud Function) yang berjalan di akhir hari. Perlu diputuskan apakah cutover ini berbasis timezone per-user (lebih akurat, lebih kompleks karena harus query user berdasarkan timezone masing-masing) atau satu cutover global (misal UTC 00:00, lebih simpel tapi tidak akurat untuk user di timezone yang jauh dari UTC). Ini akan dibahas di ARCHITECTURE.md.

## 7. Report

### 7.1 Daily Report

- List seluruh task yang dibuat pada hari itu, dikelompokkan Hustle/Humble.
- Status masing-masing: completed / not completed.
- Total skor harian per kategori.
- Tidak ada analisis mendalam atau saran di level harian — cukup summary faktual.

### 7.2 Weekly Report

- Rekap seluruh task dalam 7 hari terakhir.
- **Balance Score**: metrik 0-100 yang merepresentasikan keseimbangan antara hustle dan humble. Target rasio ideal dikonfirmasi **50:50**.

```
humble_percentage = humble_score / (hustle_score + humble_score) x 100
balance_index = 100 - abs(50 - humble_percentage) x 2
```

Balance index = 100 saat rasio hustle:humble tepat 50:50. Semakin skewed ke salah satu sisi (all hustle atau all humble), index turun mendekati 0.

`balance_index` ini dipakai dua kali: ditampilkan di weekly report, dan menjadi salah satu komponen weighting di leaderboard score (Section 8.1).

- **Saran perbaikan**: kombinasi rule-based dan AI-enhanced.
  - Rule-based (default): threshold-based logic, misal jika `humble_percentage < 20%` maka tampilkan saran standar terkait risiko burnout dan rekomendasi menambah task recovery. Static, cepat, tanpa dependency eksternal.
  - AI enhancement (optional): jika enabled, kirim data ringkasan minggu tersebut ke LLM API untuk menghasilkan saran yang lebih personalized dan kontekstual. Fallback ke rule-based jika API call gagal atau timeout.

## 8. Leaderboard

### 8.1 Weekly Cycle

- Setiap awal minggu, sistem mencari 14 user lain berdasarkan lokasi (city-level) untuk membentuk grup kompetisi.
- Lokasi diperoleh otomatis dari **IP geolocation** (bukan manual input). Konsekuensi teknis:
  - Butuh third-party IP geolocation service untuk resolve IP ke city — **diputuskan pakai ip2location.io** (lihat `ARCHITECTURE.md` Section 4.4 untuk detail limitasi free plan).
  - Akurasi IP geolocation tidak sempurna, khususnya untuk user yang browsing lewat mobile data (sering resolve ke city ISP, bukan city aktual user) atau VPN. Risiko: user bisa salah grup, atau sengaja pakai VPN untuk masuk grup yang lebih mudah menang. Ini perlu diterima sebagai known limitation di fase awal, atau ditambah fallback manual override di profile settings kalau user merasa city-nya salah deteksi.
  - IP di-resolve saat apa: setiap login, atau sekali saat weekly cycle start? Disarankan resolve dan cache city di awal weekly cycle saja (bukan tiap request) untuk mengurangi API call ke geolocation service.

- **Skor leaderboard** bukan raw score, tapi weighted score yang menggabungkan tiga komponen: total skor mingguan, balance ratio, dan completion rate.

```
weekly_raw_score   = total skor completed task (hustle + humble) dalam seminggu
completion_rate    = completed_tasks / (completed_tasks + missed_tasks)
balance_weight     = 0.5 + (balance_index / 100) x 0.5      -> range 0.5 - 1.0
completion_weight  = 0.5 + completion_rate x 0.5             -> range 0.5 - 1.0

leaderboard_score = weekly_raw_score x balance_weight x completion_weight
```

Rasional: user dengan balance sempurna (index 100) dan completion rate 100% mendapat full raw score (multiplier 1.0). User dengan balance dan completion terburuk tetap dapat 25% dari raw score (0.5 x 0.5), bukan nol — supaya user dengan minggu buruk tidak langsung merasa usahanya sia-sia, tapi tetap kalah bersaing dengan user yang konsisten.

**Trade-off yang perlu disadari**: ini penalti multiplicative, bukan additive. User dengan raw score tinggi tapi balance dan completion buruk kena penalti ganda (bisa turun ke 25% dari raw score). Kalau ini terasa terlalu punitive setelah playtesting, alternatifnya pakai bobot additive (misal `leaderboard_score = raw_score x 0.6 + balance_index x 2 + completion_rate x 100 x 0.4`, angka arbitrary, perlu tuning). Rekomendasi: constant 0.5 floor dan bobot 0.5/0.5 split di atas jangan di-hardcode, taruh di Firebase Remote Config supaya bisa di-tune tanpa redeploy.

### 8.2 Fallback Matching

Matching bertingkat:

1. Coba city-level dulu (14 user terdekat di kota yang sama).
2. Kalau kurang dari 14, expand ke provinsi/region terdekat.
3. Kalau setelah expand ke provinsi masih kurang dari 14, leaderboard tetap jalan dengan peserta yang ada (tidak ada expand lebih lanjut ke level nasional). Ini fallback final yang disepakati — user di region yang sangat sepi tetap punya leaderboard meski grupnya kecil.

### 8.3 Badge System

- Top 3 user di setiap grup leaderboard mendapat badge dengan tier berbeda: Gold (rank 1), Silver (rank 2), Bronze (rank 3).
- Badge disimpan sebagai collectible permanen di profil user, terikat ke minggu dan grup kompetisi tertentu (bukan cuma satu badge generik "pernah menang").
- Badge assets: **diputuskan** di `DESIGN.md` Section 7 — dibedakan lewat icon + label per tier (trophy/medal/award), bukan warna metalik tradisional (palette brand tidak punya warna gold/silver/bronze). Tidak ada variasi tambahan berdasarkan winning streak di fase awal.

## 9. Profile

- Identitas user: nama, email, avatar, city (untuk leaderboard matching).
- Edit profil.
- Showcase badge yang sudah dikoleksi (grid/list view).
- Settings: preferensi notifikasi, opsi AI-enhanced report on/off.
- Logout.

## 10. Authentication

- Email/password (Firebase Auth).
- OAuth: Google, GitHub, X.
  - Catatan teknis: Firebase Auth native provider untuk X terdaftar sebagai `twitter.com` provider ID (legacy naming dari Twitter, belum di-rename ke X di Firebase SDK per pengetahuan terakhir). Perlu verifikasi versi Firebase SDK terbaru saat implementasi karena ini bisa berubah.

## 11. Non-Functional Requirements

- **Performance**: leaderboard matching computation (city/province fallback) berpotensi mahal jika dilakukan synchronous saat request. Sebaiknya dijalankan sebagai scheduled Cloud Function di awal minggu, bukan on-demand saat user membuka halaman leaderboard.
- **Security**: Firestore security rules harus memastikan user hanya bisa write ke task/report miliknya sendiri. Skor dan badge tidak boleh writable langsung dari client (harus lewat Cloud Function/server-side logic untuk mencegah manipulasi skor).
- **Scalability**: struktur data leaderboard per grup mingguan harus di-partition dengan baik agar query tidak scan seluruh user collection.
- **Data privacy**: city-level location cukup granular untuk matching tapi tidak boleh expose data lokasi lebih presisi antar user (tidak ada exact address atau GPS coordinate yang ditampilkan ke user lain).

## 12. Tech Stack

- Framework: Next.js (App Router)
- Database & Auth: Firebase Firestore + Firebase Auth
- UI: Neo Brutalism template (neobrutalism.dev, berbasis shadcn/ui)
- Icons: Lucide
- Color palette: `#FF0052`, `#FFD400`, `#00C68D`, `#0055DA`

## 13. Out of Scope (Fase Awal)

- Recurring task template.
- Notifikasi push/reminder.
- Social features di luar leaderboard (comment, follow, chat).
- Monetisasi/subscription.

## 14. Open Questions / Assumptions to Validate

Seluruh item di bawah **sudah diputuskan** di `ARCHITECTURE.md` Section 8 — daftar ini ditinggalkan sebagai riwayat pertanyaan awal, bukan status terkini. Cek `ARCHITECTURE.md` untuk keputusan final, jangan pakai daftar ini sebagai acuan status.

1. ~~Angka konstanta di formula weighting leaderboard~~ — diputuskan taruh di Firebase Remote Config, bukan hardcoded.
2. ~~Timezone handling untuk task lifecycle cutover~~ — diputuskan per-user timezone, hourly scheduled job.
3. ~~IP geolocation service provider~~ — diputuskan pakai ip2location.io (free plan).
4. ~~Manual override city di profile settings~~ — diputuskan in-scope untuk MVP.

Satu item yang sempat muncul saat review dan sekarang sudah **resolved**: cap per-task-type di Section 5.2 diganti flat per-task cap (16 jam, sama untuk semua kategori) karena skema task tidak punya field untuk membedakan tipe task secara terstruktur.
