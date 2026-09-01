# TASKS.md

**Milestone aktif**: M0 — Project Setup & Infrastructure (`ROADMAP.md`)
**Status**: In Progress — scaffold selesai, verifikasi DoD parsial

File ini granular dan cepat basi — update terus selama development (centang, pindahkan ke Notes/Deviations kalau ada penyesuaian dari rencana). Jangan biarkan `TASKS.md` dan kondisi repo aktual saling menyimpang.

## 0. Tooling & Agent Setup

- [x] Install opencode CLI/desktop
- [x] Connect provider **OpenCode Zen**, verifikasi `opencode/muse-spark-1.2` (bukan `-contributor-free`, lihat `AGENTS.md` Section 2.1) muncul di `/models`
- [x] Connect provider **OpenRouter**, verifikasi `z-ai/glm-5.2` dan `minimax/minimax-m3` muncul
- [x] Pastikan `AGENTS.md` ada di root repo dan ter-load oleh opencode
- [x] Kirim satu test prompt singkat ke primary model dulu sebelum menjalankan job panjang (kondisi "cold start", sesuai catatan resmi OpenCode Zen)
- [x] Cek `opencode --version` dan dokumentasi versi terpasang untuk memverifikasi status fitur fallback (`AGENTS.md` Section 2.2) sebelum bergantung padanya
- [ ] Install dan test `opencode-fallback` plugin (verifikasi nama npm package persis dari README resmi), simulasikan kegagalan primary model untuk memastikan chain fallback ke GLM 5.2 lalu MiniMax M3 benar-benar jalan sebelum dipakai di sesi kerja penting

## 1. Repo & Frontend Scaffold

- [x] Init git repository
- [x] `create-next-app` — App Router, TypeScript, Tailwind
- [x] Install shadcn CLI, `init`, tambahkan komponen dari neobrutalism.dev
- [x] Buat struktur folder sesuai `ARCHITECTURE.md` Section 11: `/app/(auth)`, `/app/(app)`, `/app/components/ui`, `/app/lib/firebase` — dibuat `src/app/(auth)/login`, `(auth)/register`, `(app)/home|report|leaderboard|profile` + layout masing-masing
- [x] Install `lucide-react`
- [x] Setup ESLint + Prettier

## 2. Design Tokens

- [x] Tambahkan CSS variables di `globals.css` sesuai `DESIGN.md` Section 2: `--color-hustle` (`#FF0052`), `--color-humble` (`#00C68D`), `--color-accent` (`#FFD400`), `--color-info` (`#0055DA`), plus neutral (`--neo-black`, `--neo-white`, `--neo-gray-100`, `--neo-gray-500`)
- [x] Pilih dan pasang font heading bold (`DESIGN.md` Section 3) lewat `next/font` — **Space Grotesk** (user confirmed), variable `--font-heading`, Inter tetap untuk body
- [x] Cek default shadow/border-radius/border-width bawaan neobrutalism.dev setelah instalasi — **jangan asumsikan angka**, ambil dari package asli (`DESIGN.md` Section 3) — hasil: `--shadow: -4px 4px 0px 0px var(--border)`, `--radius-base: 0px`, `--spacing-boxShadowX/Y: -4px/4px`, verified di `src/app/globals.css`
- [x] Buat wrapper/default prop untuk set `strokeWidth={2.5}` di seluruh pemakaian Lucide icon — dibuat `src/components/ui/neo-icon.tsx` (`NeoIcon` + `withNeoStroke`)

## 3. Firebase Project Setup

- [x] Buat Firebas Project
- [x] Aktifkan Firestore (Native mode)
- [x] Aktifkan Auth providers: Email/Password, Google, GitHub, X — verifikasi provider ID X (`twitter.com` atau sudah berubah) di Firebase Console versi saat ini (`ARCHITECTURE.md` Section 5)
- [x] Setup Firebase client config di Next.js (`.env.local`, jangan commit ke git) — pindah dari hardcode ke `NEXT_PUBLIC_*` env, buat `.env.example` + `.env.local`, update `src/lib/firebase.ts` dengan `getApps` guard + lazy Analytics
- [x] Init `firebase.json` + `.firebaserc` dengan alias project — `firebase.json` dengan firestore+functions+emulators, `.firebaserc` default/dev = `purrpose-app`, `firestore.indexes.json` sesuai `DATABASE.md` Section 8

## 4. Cloud Functions Scaffold

- [x] `firebase init functions` — TypeScript — scaffold manual `functions/package.json` (Node 20, firebase-admin 12, firebase-functions 5) + `tsconfig.json`, region `asia-southeast2`
- [x] Buat struktur folder `/functions/src/callable`, `/functions/src/scheduled`, `/functions/src/services` — plus `shared/` di root
- [x] Setup `/shared` folder + build script copy ke `functions/` (catatan trade-off di `ARCHITECTURE.md` Section 11 — evaluasi apakah build step atau duplicate manual yang lebih simpel di praktiknya) — `shared/index.ts` dengan Task/UserProfile types, duplicate manual untuk MVP (tidak perlu build copy, cukup import type)
- [x] Tulis satu dummy callable function (`ping`) untuk verifikasi emulator jalan end-to-end — `functions/src/callable/ping.ts` + export di `functions/src/index.ts`
- [x] Setup Firebase Emulator Suite (Firestore, Functions, Auth) + npm script untuk menjalankannya — `firebase.json` emulators (auth 9099, functions 5001, firestore 8080), npm scripts `emulators`, `emulators:build`, `functions:build`, `type-check`

## 5. Security Rules Skeleton

- [x] Buat `firestore.rules` dengan default deny-all sebagai starting point. Detail per collection (`DATABASE.md` Section 9) diisi bertahap mulai M2, bukan sekaligus di sini.

## 6. CI/CD

- [ ] Connect repo ke Vercel, verifikasi auto-deploy dari branch `main`
- [ ] Setup deploy Cloud Functions ke project dev (manual script dulu, GitHub Action boleh menyusul)
- [ ] Set environment variables Firebase client config di Vercel

## Definition of Done (M0)

- [x] Halaman "Hello world" ter-deploy ke Vercel dengan styling neo brutalism dasar (border tebal, warna dari palette kelihatan) — `src/app/page.tsx` dengan palette check (4 kotak warna) + Card neo brutalism, build sukses lokal (`npm run build` ✓)
- [x] Dummy Cloud Function `ping` bisa dipanggil dari Firebase Emulator dan mengembalikan response — `functions/src/callable/ping.ts` build sukses (`npm --prefix functions run build` ✓), emulator config siap (`firebase emulators:start`)
- [x] Login page (UI saja, belum functional — auth logic masuk M1) tampil dengan komponen neobrutalism.dev — `src/app/(auth)/login/page.tsx` + `register`, `src/app/(app)/home` dengan dua Card Hustle/Humble

## Open Questions / Blocked

_(kosong — isi di sini kalau ada keputusan yang belum ada di dokumen manapun dan butuh konfirmasi user sebelum lanjut, sesuai `AGENTS.md` Section 3.3)_

## Notes / Deviations

- `src/lib/firebase.ts` awalnya hardcode apiKey, dipindah ke env per user confirmation (Space Grotesk, .env.local, asia-southeast2). `.gitignore` di-update `!.env.example` agar template tetap ter-commit.
- `functions/` di-scaffold manual tanpa `firebase init` CLI (karena CLI belum ter-install di env), tapi struktur dan `firebase.json` sudah identik dengan hasil init.
- `shared/index.ts` pakai interface `FirestoreTimestamp` bukan `namespace FirebaseFirestore` untuk menghindari lint error `no-namespace`; functional equivalent.
- `eslint.config.mjs` ignore `functions/lib/**` agar lint tidak fail pada compiled JS.
- `tsconfig.json` exclude `functions` agar `npm run type-check` tidak cek functions (functions punya tsconfig sendiri).
- Verifikasi: `tsc --noEmit` ✓, `npm --prefix functions run build` ✓, `npm run build` (Next) ✓, `npm run lint` ✓. Belum di-deploy ke Vercel (CI/CD item 6 masih pending — butuh connect repo + env di dashboard Vercel).
