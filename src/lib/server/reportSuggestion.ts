// Rule-based suggestion generator per PRD 7.2
// Threshold-based static logic, fallback for AI enhancement

export function generateRuleBasedSuggestion(params: {
  humbleScore: number;
  hustleScore: number;
  totalScore: number;
  balanceIndex: number;
  humblePercentage: number;
  completionRate: number;
}): string {
  const { humbleScore, hustleScore, totalScore, balanceIndex, humblePercentage, completionRate } = params;

  if (totalScore === 0) {
    return "Minggu ini belum ada task yang diselesaikan. Mulai kecil — tambah satu Hustle ringan dan satu Humble memulihkan besok untuk membangun momentum.";
  }

  const parts: string[] = [];

  // Balance framing (non-punitive per DESIGN 8)
  if (balanceIndex >= 80) {
    parts.push(`Keseimbanganmu bagus (balance index ${balanceIndex.toFixed(0)}). Hustle ${hustleScore.toFixed(0)} dan Humble ${humbleScore.toFixed(0)} cukup seimbang — pertahankan ritme ini.`);
  } else if (humblePercentage < 20) {
    parts.push(`Humble hanya ${humblePercentage.toFixed(0)}% dari total minggu ini — risiko burnout meningkat. Coba tambah 1–2 task recovery (tidur cukup, jalan santai, atau journaling) untuk minggu depan.`);
  } else if (humblePercentage > 80) {
    parts.push(`Humble mendominasi ${humblePercentage.toFixed(0)}% minggu ini. Bagus untuk recovery, tapi kalau ada target produktivitas, coba selingi 1–2 Hustle ringan.`);
  } else if (humblePercentage < 35) {
    parts.push(`Rasio masih condong ke Hustle (${(100 - humblePercentage).toFixed(0)}% Hustle). Balance index ${balanceIndex.toFixed(0)} — tambahkan sedikit Humble untuk jaga energi.`);
  } else if (humblePercentage > 65) {
    parts.push(`Rasio condong ke Humble (${humblePercentage.toFixed(0)}% Humble). Balance index ${balanceIndex.toFixed(0)} — pertimbangkan satu Hustle terfokus minggu depan.`);
  } else {
    parts.push(`Balance index ${balanceIndex.toFixed(0)} — cukup seimbang. Perhatikan konsistensi, bukan kesempurnaan.`);
  }

  // Completion rate insight
  if (completionRate < 0.5) {
    parts.push(`Completion rate ${(completionRate * 100).toFixed(0)}% — banyak task yang terlewat. Coba kurangi jumlah task per hari atau pecah task besar jadi langkah kecil agar lebih achievable.`);
  } else if (completionRate < 0.8) {
    parts.push(`Completion rate ${(completionRate * 100).toFixed(0)}% — sudah lumayan konsisten. Fokus pada 1–2 task prioritas per hari bisa bantu naikkan lagi.`);
  } else {
    parts.push(`Completion rate ${(completionRate * 100).toFixed(0)}% — luar biasa konsisten!`);
  }

  return parts.join(" ");
}
