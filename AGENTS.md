<!-- BEGIN:nextjs-agent-rules -->

# AGENTS.md

Dokumen ini berperan ganda: (1) instruksi kerja untuk siapa pun yang melakukan vibe coding di project ini, dan (2) file yang dibaca otomatis oleh `opencode` sebagai project-level context saat sesi coding dimulai. Jaga isi file ini tetap akurat — kalau ada keputusan di `PRD.md`/`ARCHITECTURE.md`/dst yang berubah, update juga bagian relevan di sini.

## 1. Tooling

Coding agent: **opencode** (CLI/desktop). Bukan setup multi-agent — satu agent yang mengerjakan task secara berurutan mengikuti `ROADMAP.md`, dibantu model routing manual kalau primary model bermasalah.

## 2. Model Configuration

### 2.1 Primary: Muse Spark 1.2 (OpenCode Zen)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/muse-spark-1.2"
}
```

Login sekali lewat `/connect` di opencode, pilih **OpenCode Zen**, tempel API key dari `opencode.ai/zen`.

**Keputusan yang perlu dikonfirmasi**: OpenCode Zen juga menyediakan varian `muse-spark-1.2-contributor-free` (`opencode/muse-spark-1.2-contributor-free`) — token pricing jauh lebih murah/gratis, tapi sebagai gantinya prompt dan completion Anda **diizinkan dipakai Meta untuk training model mereka**. Untuk project ini yang berisi kode produk nyata (bukan sekadar eksperimen), saya rekomendasikan **pakai varian reguler** (`opencode/muse-spark-1.2`), bukan `-contributor-free`, supaya source code tidak keluar sebagai training data pihak ketiga. Kalau budget jadi pertimbangan dan Anda tetap mau pakai varian contributor-free, itu keputusan Anda — tapi sadari trade-off-nya secara eksplisit, terutama untuk file yang berisi logic sensitif (Cloud Functions scoring, security rules).

### 2.2 Fallback: GLM 5.2 & MiniMax M3 (OpenRouter)

```json
{
  "provider": {
    "openrouter": {
      "models": {
        "z-ai/glm-5.2": { "name": "GLM 5.2 (fallback 1)" },
        "minimax/minimax-m3": { "name": "MiniMax M3 (fallback 2)" }
      }
    }
  }
}
```

Login lewat `/connect`, pilih **OpenRouter**, tempel API key dari OpenRouter dashboard. Setelah terhubung, kedua model bisa dipilih lewat `/models`.

**Catatan penting soal "fallback" ini — jangan asumsikan otomatis by default**: per pengecekan saya ke repo opencode, dukungan native untuk array multi-model dengan auto-failover (`"model": ["a", "b", "c"]`) **masih berstatus feature request yang belum confirmed shipped** (issue [#8687](https://github.com/anomalyco/opencode/issues/8687), ditutup sebagai duplikat dari #7602 — belum tentu berarti sudah dirilis stabil). Untuk chain otomatis primary -> GLM 5.2 -> MiniMax M3, pakai community plugin **[`opencode-fallback`](https://github.com/youngbinkim0/opencode-fallback)** plugin ini mendukung `fallback_models` sebagai array berurutan, auto-detect rate limit/quota/model-not-found, replay pesan terakhir ke fallback berikutnya, dan auto-recovery balik ke primary setelah cooldown.

Setup:

```json
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/muse-spark-1.2",
  "plugin": ["opencode-runtime-fallback"],
  "agent": {
    "coder": {
      "model": "opencode/muse-spark-1.2",
      "fallback_models": [
        "openrouter/z-ai/glm-5.2",
        "openrouter/minimax/minimax-m3"
      ],
      "max_fallback_attempts": 3,
      "retry_on_errors": [429],
      "retryable_error_patterns": []
    }
  }
}
```

**Verifikasi sebelum pakai**: nama exact npm package untuk field `"plugin"` di atas belum saya pastikan 100% — cek README resmi plugin untuk string registrasi yang benar, karena nama publish di npm kadang beda dari nama repo GitHub. Kalau mau fallback spesifik per agent (bukan global), taruh `fallback_models` di `opencode.json` bawah `agent.<nama>.fallback_models` — ini override total, bukan tambahan, terhadap daftar global di `opencode-fallback.jsonc`.

**Alternatif manual** (paling pasti jalan tanpa dependency plugin pihak ketiga): kalau `muse-spark-1.2` kena rate limit/quota habis/down, jalankan `/models` di TUI dan pilih GLM 5.2 atau MiniMax M3 secara manual, atau pakai flag `-m openrouter/z-ai/glm-5.2` saat invoke `opencode run`.

**Sebelum mulai coding**: cek `opencode --version` dan dokumentasi resmi versi tersebut untuk memastikan opsi mana yang benar-benar tersedia saat ini — jangan langsung percaya konfigurasi di atas tanpa verifikasi, karena tooling ini berubah cepat.

## 3. Cara Kerja Agent di Project Ini

### 3.1 Urutan Baca Dokumen

Sebelum mengerjakan task apa pun, baca urutan berikut sesuai kebutuhan task:

1. `ROADMAP.md` — cari tahu sedang di milestone mana.
2. `TASKS.md` — breakdown granular milestone yang sedang jalan (buat/update file ini di awal tiap milestone kalau belum ada).
3. Dokumen spesifik sesuai jenis task: `DATABASE.md` untuk apa pun yang menyentuh Firestore schema, `API.md` untuk callable function contract, `DESIGN.md` untuk komponen UI, `ARCHITECTURE.md` untuk keputusan sistem level tinggi.

### 3.2 Batasan yang Tidak Boleh Dilanggar Tanpa Konfirmasi

- **Jangan menulis field skor/status task langsung dari client.** Semua mutasi yang mempengaruhi skor wajib lewat callable function sesuai `API.md` Section 2-5. Kalau menemukan diri menulis `db.collection('tasks').doc(id).update({ score: ... })` dari kode frontend, itu tandanya keluar dari arsitektur yang sudah disepakati — stop dan cek ulang.
- **Jangan mengubah formula scoring/balance index/leaderboard weighting** tanpa flag eksplisit ke user. Formula-formula ini sudah didokumentasikan lewat proses klarifikasi panjang di `PRD.md`/`ARCHITECTURE.md`, bukan angka sembarang yang boleh di-refactor diam-diam demi "kelihatan lebih rapi".
- **Jangan menambah collection atau field baru di Firestore** tanpa update `DATABASE.md` di commit yang sama. Dokumen dan implementasi harus tetap sinkron, sesuai kebiasaan yang sudah dijalankan sepanjang dokumen-dokumen sebelumnya.
- **Jangan deploy ke Firebase project production** dari sesi vibe coding tanpa konfirmasi eksplisit. Deploy ke emulator/dev project untuk testing itu default yang aman.
- **Jangan install dependency besar baru** (state management library, ORM, dsb.) di luar yang sudah diputuskan di `ARCHITECTURE.md` tanpa alasan konkret — project ini sudah punya keputusan eksplisit untuk menghindari overengineering (contoh: Zustand dipilih dan Redux ditolak).

### 3.3 Kalau Requirement Ambigu

Jangan menebak lalu jalan terus. Kalau sebuah task ternyata butuh keputusan yang belum ada di dokumen manapun (mirip proses tanya-jawab yang sudah terjadi sebelumnya untuk cap harian, provider geolocation, dst.), berhenti dan tanyakan ke user secara spesifik — sebutkan opsi konkret kalau memungkinkan, bukan pertanyaan terbuka yang menyerahkan seluruh keputusan desain ke user.

### 3.4 Verification Loop

Setelah generate code untuk sebuah task:

1. Jalankan type-check (`tsc --noEmit`) dan linter sebelum menganggap task selesai.
2. Untuk Cloud Functions yang menyentuh scoring/cap validation, jalankan lewat Firebase Emulator dengan minimal satu kasus normal dan satu kasus edge case (misal: cap harian terlampaui) sebelum lanjut ke task berikutnya.
3. Update `TASKS.md`: pindahkan task dari "in progress" ke "done", catat kalau ada deviasi dari rencana awal beserta alasannya.

## 4. Next Steps

Mulai dari `TASKS.md` untuk M0 (`ROADMAP.md` Section M0) sebagai starting point implementasi.

<!-- END:nextjs-agent-rules -->
