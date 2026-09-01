# Design System & UI/UX Guideline

## 1. Design Philosophy

Neo Brutalism dipilih karena karakteristiknya (warna solid kontras tinggi, border tebal, hard shadow tanpa blur, tanpa rounded corner) secara natural cocok dengan produk gamifikasi: visual yang tegas dan "berani" mendukung nuansa kompetitif (leaderboard, skor, badge) tanpa harus terasa berlebihan seperti skin game kasino. Prinsip yang dipegang: **bold secara visual, tapi tetap functional** — neo brutalism di sini adalah lapisan visual di atas interaction pattern yang konvensional (navigasi jelas, hierarchy informasi standar), bukan alasan untuk membuat UX yang membingungkan.

## 2. Color System

### 2.1 Base Palette (dari brief)

| Hex | Nama kerja |
|---|---|
| `#FF0052` | Rose |
| `#FFD400` | Yellow |
| `#00C68D` | Green |
| `#0055DA` | Blue |

**Catatan penting**: keempat warna ini adalah warna aksen/brand, bukan warna netral. Neo brutalism butuh fondasi netral yang kuat (hitam pekat untuk border, putih/off-white untuk background) yang tidak ada di palette yang diberikan. Saya tambahkan sebagai base neutral, karena tanpa ini keempat warna vivid di atas akan saling bentrok tanpa ruang bernapas:

| Token | Hex | Kegunaan |
|---|---|---|
| `--neo-black` | `#000000` | border, teks utama, shadow |
| `--neo-white` | `#FFFFFF` | background utama |
| `--neo-gray-100` | `#F2F2F2` | background sekunder (card di atas card) |
| `--neo-gray-500` | `#8A8A8A` | teks sekunder, disabled state |

### 2.2 Semantic Mapping

| Semantic token | Warna | Alasan |
|---|---|---|
| `--color-hustle` | Rose `#FF0052` | warna paling "panas"/intens di palette, cocok merepresentasikan tekanan/produktivitas |
| `--color-humble` | Green `#00C68D` | warna paling "tenang" di palette, cocok merepresentasikan recovery/relaksasi |
| `--color-accent` (CTA utama, tombol primary) | Yellow `#FFD400` | paling eye-catching, dipakai terbatas supaya tidak kompetisi visual dengan hustle/humble |
| `--color-info` (link, state netral) | Blue `#0055DA` | dipakai untuk elemen informasional yang bukan bagian dari sistem hustle/humble, misal link ke halaman lain |

Mapping ini dipakai konsisten di seluruh halaman: task card, tag kategori, chart di report, dan progress bar — supaya user membangun asosiasi visual jangka panjang antara warna dan kategori tanpa perlu baca label setiap saat.

### 2.3 Kontras dan Aksesibilitas

`#FFD400` (yellow) punya luminance tinggi — **jangan dipakai sebagai warna teks di atas background putih**, kontrasnya gagal WCAG AA. Aturan pakai:

- Yellow, Rose, Green, Blue: dipakai sebagai **background fill** (button, badge, border tebal) dengan teks hitam di atasnya, bukan sebagai warna teks langsung di atas putih.
- Body text selalu `--neo-black` di atas `--neo-white`/`--neo-gray-100`, tidak pernah warna aksen langsung untuk teks panjang.

### 2.4 Dark Mode

**Out of scope untuk MVP.** Neo brutalism secara konvensi lebih natural di light background (kontras hard shadow lebih kelihatan). Dark mode nambah effort desain signifikan (butuh re-tuning seluruh shadow/border supaya tetap kontras di background gelap) untuk value yang belum tentu prioritas di tahap awal. Assumption ini reversible, tidak mengunci arsitektur apa pun.

## 3. Typography

Rekomendasi: font sans-serif dengan weight bold yang tersedia, misal **Space Grotesk** atau **Archivo** untuk heading (karakter tebal geometris khas neo brutalism), dan font sans standar (Inter atau default sistem) untuk body text supaya tetap readable di teks panjang seperti weekly report suggestion.

**Catatan implementasi**: neobrutalism.dev sebagai component library based on shadcn kemungkinan sudah punya default font-weight dan CSS variable (`--font-sans`, shadow token, border-width) begitu diinstall lewat shadcn CLI. Jangan tebak nilai persis (misal berapa px shadow offset default mereka) — ambil langsung dari package yang ter-install, override hanya token warna sesuai Section 2 di atas. Menuliskan angka spesifik di dokumen ini tanpa verifikasi ke package asli berisiko salah dan menyesatkan saat implementasi.

## 4. Iconography

Lucide icons, dengan `strokeWidth` dinaikkan dari default (`2`) ke **`2.5`** di seluruh aplikasi supaya bobot visual ikon konsisten dengan border tebal ala neo brutalism — ikon dengan stroke tipis akan terlihat "kurus" berdampingan dengan card berborder 2-3px hitam.

## 5. Hustle vs Humble Visual Language

| Elemen | Hustle | Humble |
|---|---|---|
| Warna tag/border kategori | Rose | Green |
| Icon representatif (contoh) | `briefcase`, `book-open`, `laptop` | `bed`, `utensils`, `dumbbell` |
| Label skala | "Tekanan" 1-5 | "Relaksasi" 1-5 |

Skala level (1-5) divisualisasikan sebagai **5 pip/dot**, terisi sesuai level yang dipilih, dengan warna sesuai kategori. Ini dipakai konsisten di form create task dan di task card, supaya user bisa langsung scan intensitas task tanpa baca angka.

## 6. Page-by-Page Component Mapping

### 6.1 Home (Task List)

| Kebutuhan | Komponen |
|---|---|
| Kolom Hustle / Humble | dua `Card` panel bersebelahan (stack vertikal di mobile), masing-masing dengan border warna sesuai Section 5 |
| Task item | `Card` kecil di dalam kolom: title, pip level, durasi, checkbox besar bergaya neo-brutalism untuk mark complete |
| Tambah task | `Dialog`/`Sheet` berisi `Form`: select kategori, input title, pip selector untuk level, input durasi, date picker |
| Task selesai (read-only) | visual state berbeda: opacity diturunkan atau strikethrough pada title, checkbox terisi solid |
| Task missed (dari hari sebelumnya, kalau ditampilkan di riwayat) | badge kecil "Missed" warna gray, bukan warna hustle/humble supaya tidak terbaca sebagai "kategori ketiga" |

### 6.2 Report

| Kebutuhan | Komponen |
|---|---|
| Tab Daily / Weekly | `Tabs` |
| Daily: list task + status | `Table` sederhana atau list `Card`, dikelompokkan per kategori |
| Weekly: balance index | visual gauge/progress bar horizontal dengan gradient dua warna (Rose di satu ujung, Green di ujung lain), indikator posisi menunjukkan skor 0-100 |
| Weekly: skor total per kategori | dua angka besar berdampingan, masing-masing dengan warna kategori |
| Saran perbaikan | `Card` terpisah dengan border accent (Yellow), berisi teks rule-based suggestion, ditambah badge kecil "AI Enhanced" kalau suggestion berasal dari LLM (transparansi ke user tentang sumber saran) |

### 6.3 Leaderboard

| Kebutuhan | Komponen |
|---|---|
| Tabel skor grup | `Table`: rank, avatar + nama, leaderboard score. Baris user sendiri di-highlight (background berbeda, misal `--neo-gray-100` dengan border lebih tebal) supaya langsung kelihatan tanpa perlu scroll cari |
| Indikator lokasi grup | teks kecil di atas tabel, misal "Grup: Jakarta" atau "Grup: Jawa Tengah (fallback)" — transparansi kalau grup hasil fallback provinsi, bukan city asli, supaya user paham kenapa lawannya beda kota |
| Top 3 highlight | icon medali (Lucide `medal` atau `trophy`) di baris rank 1-3, bukan cuma angka rank |

### 6.4 Profile

| Kebutuhan | Komponen |
|---|---|
| Identitas + edit | `Avatar` + `Form` (nama, city manual override, timezone) |
| Badge showcase | grid `Card` kecil per badge, tiap card menampilkan tier (lihat Section 7) dan `locationName` + minggu |
| Settings | `Switch` untuk `aiReportEnabled`, tombol logout terpisah dengan warna destructive (bukan salah satu dari 4 warna brand, pakai merah standar shadcn `destructive` token supaya jelas beda konteks dari Rose/hustle) |

## 7. Badge Tier Treatment

Warna metalik tradisional (gold/silver/bronze) tidak ada di palette yang diberikan, dan memaksakan warna baru di luar 4 warna brand akan merusak konsistensi sistem warna. Keputusan: **tier dibedakan lewat icon + label, bukan warna baru**:

| Tier | Icon (Lucide) | Warna badge background |
|---|---|---|
| Gold (rank 1) | `trophy` | Yellow (`--color-accent`) — warna paling "menonjol" di palette, cocok untuk pencapaian tertinggi |
| Silver (rank 2) | `medal` | `--neo-gray-100` dengan border hitam tebal |
| Bronze (rank 3) | `award` | Blue (`--color-info`) — dipakai di sini karena tidak overlap dengan hustle/humble/accent, bukan karena asosiasi warna tradisional bronze |

Label teks tier ("Gold"/"Silver"/"Bronze") selalu ditampilkan berdampingan dengan icon, tidak mengandalkan warna saja — supaya tidak ambigu dan tetap accessible untuk user dengan color vision deficiency.

## 8. Motivational Microcopy Tone

Konsisten dengan keputusan di `PRD.md` bahwa task yang tidak selesai tidak mengurangi skor (non-punitive design), microcopy di seluruh app mengikuti prinsip:

- Tidak ada bahasa menyalahkan untuk task `missed` (hindari "Kamu gagal", pakai framing netral seperti "Belum sempat dikerjakan").
- Empty state (belum ada task hari ini) memakai tone mengajak, bukan menekan — contoh arah: ajakan singkat untuk mulai menambah task, bukan peringatan.
- Weekly report dengan balance index rendah tetap framing sebagai insight untuk diperbaiki, bukan penilaian personal/karakter user.

## 9. Responsive Breakpoints

Ikuti breakpoint default Tailwind (`sm`, `md`, `lg`, `xl`) tanpa kustomisasi tambahan kecuali ada kebutuhan spesifik yang muncul saat implementasi. Layout dua kolom Hustle/Humble di Home menjadi stack vertikal di bawah breakpoint `md`.

## 10. Next Steps

Lanjut ke `ROADMAP.md` untuk memecah implementasi jadi milestones, dan `AGENTS.md` untuk mendefinisikan pembagian tanggung jawab AI agent selama development.
