# Fuel Log

Pencatat kalori harian: makanan per waktu makan, olahraga, langkah, air, puasa, suplemen, dan berat badan, dengan visual kendaraan yang "mengisi bahan bakar". Tersedia dalam Bahasa Indonesia, English, dan 日本語.

Ini **versi offline** (aplikasi web yang bisa dipasang di layar utama). Setelah dibuka sekali saat online, aplikasi tetap jalan tanpa sinyal.

**Buka:** https://lamina27.github.io/fuel-log/

## Pasang di HP

- **iPhone (Safari):** buka link di atas → tombol Bagikan → **Tambah ke Layar Utama**.
- **Android (Chrome):** buka link → menu ⋮ → **Instal aplikasi** atau **Tambahkan ke layar utama**.

## Yang perlu diketahui

- **Data tersimpan di browser HP-mu sendiri**, tidak dikirim ke mana pun. Menghapus data browser atau ganti HP = data hilang, jadi pakai **Profil → Cadangan data → Simpan cadangan** sesekali.
- **Fitur AI** (foto makanan, membaca screenshot Strava/Hevy/Garmin, rekap harian) tidak bawaan di versi ini. Dua pilihan:
  1. **API key sendiri:** Profil → *AI pakai API key sendiri* → tempel kunci Claude API ([cara membuat](https://platform.claude.com/docs/en/get-api-key)) → *Simpan & uji*. Kunci hanya disimpan di browser HP-mu dan tidak ikut cadangan. Biaya ditagih ke akun API-mu (terpisah dari langganan Claude): ±$0,009 per foto dengan Sonnet 5.5, ±$0,0005 dengan Haiku 5.5. Foto diperkecil ke ≤1.568 px sebelum dikirim. Butuh internet saat dipakai.
  2. **Versi Claude:** https://claude.ai/artifact/2MXYqDfn8A3EBG4rj16goj (memakai akun Claude).
- **Jangan bagikan API key-mu.** Siapa pun yang memegangnya bisa memakai saldomu.
- File cadangan sama formatnya di kedua versi: simpan di satu versi, pulihkan di versi lain. Pemulihan **menggabungkan** data, tidak menghapus.
- Angka di aplikasi adalah **perkiraan, bukan nasihat medis**. Target makan tidak pernah di bawah 1.200 kkal (perempuan) / 1.500 kkal (laki-laki); usia di bawah 18 tahun hanya mendapat target pemeliharaan.

## Cara hitung dan sumber

Rumus dan 16 rujukan (Mifflin-St Jeor, FAO/WHO/UNU 2004, ACSM, 2024 Adult Compendium, Keytel 2005, EFSA 2010, NHLBI, WHO, dll.) ada di aplikasi: **Profil → Cara hitung** dan **Referensi**.

## Isi repositori

| Path | Isi |
|---|---|
| `index.html` | Aplikasi (satu file: tampilan, logika, terjemahan) |
| `sw.js` | Service worker: menyimpan aplikasi untuk dipakai offline |
| `manifest.webmanifest`, `icon*.png`, `icon.svg` | Data instalasi dan ikon |
| `source/` | Kode sumber yang bisa diubah: `page.html` (tampilan & CSS), `calc.js` (mesin hitung), `src/*.js` (aplikasi), `build.py` |

Untuk membangun ulang dari `source/`: jalankan `python3 build.py` (butuh Node.js untuk cek sintaks). Hasilnya `neraca-kalori.html` (versi Claude) dan folder `pwa/` (versi ini); salin isi `pwa/` ke akar repositori.
