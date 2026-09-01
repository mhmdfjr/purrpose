# API Specification

## 1. Conventions

Aplikasi ini **tidak punya REST API tradisional**. Ada dua jenis akses data:

1. **Firebase Callable Functions** — dipakai untuk seluruh operasi write yang mempengaruhi data sensitif (skor, profile, task lifecycle). Ini yang didokumentasikan di file ini.
2. **Direct Firestore read** lewat client SDK (atau Admin SDK di Server Component untuk SSR) — dipakai untuk seluruh operasi read (task list, report, leaderboard). Query pattern-nya sudah dijelaskan di `DATABASE.md`, tidak diulang di sini kecuali relevan untuk konteks sebuah function.

Semua callable function:

- Mensyaratkan `context.auth != null` (request ditolak dengan `unauthenticated` kalau tidak ada auth token valid).
- Mensyaratkan App Check token valid (`context.app != null`), sesuai `ARCHITECTURE.md` Section 7.
- Mengembalikan error pakai `HttpsError` standar Firebase Functions (`code`, `message`), bukan custom error shape, supaya konsisten dengan error handling bawaan Firebase SDK di client.

## 2. `createTask`

Membuat task baru dengan status `pending`.

**Request**

| Field | Type | Wajib | Catatan |
|---|---|---|---|
| `category` | `"hustle"` \| `"humble"` | ya | |
| `title` | string | ya | max 100 karakter |
| `level` | number | ya | integer 1-5 |
| `durationHours` | number | ya | > 0, desimal diperbolehkan |
| `date` | string `YYYY-MM-DD` | ya | tidak boleh tanggal di masa lalu |

**Response**

```json
{ "taskId": "abc123", "status": "pending" }
```

**Error cases**

| Code | Kondisi |
|---|---|
| `invalid-argument` | `level` di luar 1-5, `durationHours` <= 0, `date` di masa lalu, format `date` tidak valid |
| `failed-precondition` | `durationHours` task ini sendiri melebihi `perTaskDurationCapHours` dari Remote Config (default 16 jam) — flat cap, sama untuk hustle maupun humble |
| `failed-precondition` | total durasi task di tanggal tersebut (termasuk task baru ini) melebihi `dailyDurationCapHours` dari Remote Config. Message berisi sisa jam yang masih tersedia, supaya frontend bisa tampilkan pesan yang membantu, bukan generic error |
| `unauthenticated` | tidak ada auth context |

**Implementasi cap check**: dua validasi berurutan — (1) cek `durationHours` task ini sendiri terhadap `perTaskDurationCapHours`, gagal cepat tanpa perlu query lain kalau sudah melebihi; (2) baru kalau lolos, baca Section 4 `DATABASE.md` — pakai Firestore aggregation `sum()` untuk menjumlahkan `durationHours` task existing di tanggal yang sama, dilakukan di dalam transaction bersamaan dengan write task baru untuk menghindari race condition antara pembacaan total dan penulisan task baru.

## 3. `updateTask`

Edit task yang masih `pending`. Task `completed`/`missed` tidak bisa diedit.

**Request**

| Field | Type | Wajib |
|---|---|---|
| `taskId` | string | ya |
| `updates` | object, subset dari `{ title, level, durationHours, date }` | ya, minimal satu field |

**Response**

```json
{ "taskId": "abc123", "updated": true }
```

**Error cases**

| Code | Kondisi |
|---|---|
| `not-found` | `taskId` tidak ada atau bukan milik user tersebut |
| `failed-precondition` | task berstatus `completed` atau `missed`, tidak bisa diedit |
| `failed-precondition` | kalau `durationHours` diubah, dicek ulang terhadap `perTaskDurationCapHours` (flat cap 16 jam) sama seperti `createTask` |
| `failed-precondition` | kalau `durationHours` atau `date` diubah, cap harian di-cek ulang untuk tanggal barunya (mengeluarkan durasi lama, memasukkan durasi baru) — sama seperti `createTask` |
| `invalid-argument` | field baru tidak lolos validasi yang sama seperti `createTask` |

## 4. `deleteTask`

**Request**

```json
{ "taskId": "abc123" }
```

**Response**

```json
{ "taskId": "abc123", "deleted": true }
```

**Error cases**: `not-found`, `failed-precondition` (task sudah `completed`/`missed`, tidak bisa dihapus — task yang sudah menyumbang skor harus tetap ada sebagai audit trail).

## 5. `completeTask`

**Request**

```json
{ "taskId": "abc123" }
```

**Response**

```json
{ "taskId": "abc123", "status": "completed", "score": 12 }
```

Skor dihitung server-side: `score = level x durationHours`, ditulis bersamaan dengan `status: "completed"` dan `completedAt`.

**Error cases**

| Code | Kondisi |
|---|---|
| `not-found` | `taskId` tidak ada atau bukan milik user |
| `failed-precondition` | task sudah berstatus `completed` atau `missed` — tidak bisa complete dua kali atau complete task yang sudah lewat window-nya |

## 6. `updateProfile`

**Request** (semua field opsional, minimal satu)

| Field | Type | Catatan |
|---|---|---|
| `displayName` | string | |
| `avatarUrl` | string | |
| `city` | string | kalau diisi, otomatis set `cityManualOverride = true` di document, supaya `weeklyCycleJob` tidak menimpa dengan hasil IP geolocation |
| `timezone` | string | IANA timezone string, divalidasi terhadap daftar valid timezone. Function ini yang recompute `utcResetHour`, bukan diterima dari client |
| `aiReportEnabled` | boolean | |

**Response**

```json
{ "updated": true }
```

**Error cases**: `invalid-argument` (timezone string tidak valid, `displayName` kosong/terlalu panjang), `unauthenticated`.

## 7. `regenerateWeeklySuggestion` (opsional, on-demand)

Dipanggil dari halaman report kalau user mengaktifkan `aiReportEnabled` setelah report minggu itu sudah ter-generate tanpa AI suggestion, atau ingin retry setelah percobaan sebelumnya gagal.

**Request**

```json
{ "weekId": "2026-W36" }
```

**Response**

```json
{ "weekId": "2026-W36", "aiSuggestion": "..." }
```

**Error cases**

| Code | Kondisi |
|---|---|
| `not-found` | `weeklyReports/{weekId}` belum ada (report belum di-generate oleh `weeklyCycleJob`) |
| `resource-exhausted` | user memanggil lebih dari 1x dalam periode cooldown (disarankan 1 jam), untuk mencegah cost abuse ke LLM API — bukan rate limit generik, tapi cooldown spesifik per user per function ini |
| `failed-precondition` | `aiReportEnabled` di profile bernilai `false` — user harus enable dulu di settings sebelum regenerate |

## 8. Scheduled Functions (Internal, Bukan Client-Facing API)

Tidak dipanggil dari frontend, didokumentasikan di sini untuk kelengkapan kontrak sistem.

| Function | Trigger | Idempotency |
|---|---|---|
| `taskCutoverJob` | Cloud Scheduler cron `0 * * * *` (tiap jam) | Aman dijalankan berkali-kali: hanya mengubah task dengan `status == "pending"` dan `date < today` (di timezone user), task yang sudah `missed` tidak diproses ulang |
| `weeklyCycleJob` | Cloud Scheduler cron `0 0 * * 1` (fixed, Senin 00:00 UTC — lihat rationale di `ARCHITECTURE.md` Section 4.2) | **Belum idempotent-safe sepenuhnya** — dicatat sebagai open risk di `ARCHITECTURE.md` Section 12. Kalau job gagal di tengah proses (misal error di user ke-500 dari 1000), re-run job perlu skip user yang groups/entries-nya sudah tertulis di cycle yang sama, bukan proses ulang dari awal. Field `status` di `leaderboardCycles/{cycleId}` (`matching` -> `scoring` -> `completed`) dipakai sebagai checkpoint kasar untuk ini, tapi granularity per-user di dalam satu fase belum didesain — perlu dibahas lebih detail saat implementasi, bukan blocker untuk lanjut ke fase development |

## 9. Read Patterns (Referensi Cepat, Detail di DATABASE.md)

| Kebutuhan Frontend | Query |
|---|---|
| Task list hari ini | `users/{uid}/tasks where date == today`, realtime listener |
| Daily report | sama seperti di atas, tanpa listener (one-time fetch) |
| Weekly report | `users/{uid}/weeklyReports/{weekId}`, single doc get |
| Leaderboard grup user | perlu tahu `groupId` user di cycle berjalan — disarankan denormalize `currentGroupId` ke `users/{uid}` saat `weeklyCycleJob` selesai matching, supaya frontend tidak perlu collection group query mahal tiap kali buka halaman leaderboard |
| Badge showcase di profil | `users/{uid}/badges`, ordered by `awardedAt desc` |

**Catatan**: field `currentGroupId` yang dibutuhkan untuk read pattern di atas sudah didokumentasikan di `DATABASE.md` Section 3.

## 10. Next Steps

Lanjut ke `DESIGN.md` untuk UI/UX guideline (Neo Brutalism component mapping per halaman) sebelum mulai implementasi.
