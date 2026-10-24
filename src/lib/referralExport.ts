import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Anak, Pengukuran } from '@/types/database';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import { WHO_REFERENCE_DATA } from '@/lib/whoReferenceData';
import { calculateReferenceValue, calculateAgeInMonthsExact } from '@/lib/growthChartUtils';

export interface ReferralExportData {
  child: Anak;
  pengukuran: Pengukuran;
  posyanduName?: string;
  kaderName?: string;
}

/**
 * Generates an official A4 PDF "Surat Rujukan" with anthropometric data,
 * WHO growth curves (TB/U and BB/U), and mandatory disclaimers.
 */
export async function generateReferralPdf(data: ReferralExportData): Promise<Buffer> {
  const { child, pengukuran } = data;
  const posyanduName = data.posyanduName || 'Posyandu Melati 03';
  const kaderName = data.kaderName || 'Kader Posyandu';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ageInMonths = calculateAgeInMonths(child.tgl_lahir);
  const exactAgeMonths = calculateAgeInMonthsExact(child.tgl_lahir, pengukuran.tgl_ukur);

  // 1. KOP SURAT (Letterhead)
  try {
    const fs = await import('fs');
    const path = await import('path');
    const logoPath = path.join(process.cwd(), 'public', 'logo-sm.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString('base64');
      doc.addImage('data:image/png;base64,' + base64Logo, 'PNG', 14, 10, 15, 15);
    }
  } catch {}

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(14, 28, pageWidth - 14, 28);
  doc.setLineWidth(0.2);
  doc.line(14, 29, pageWidth - 14, 29);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('POS PELAYANAN TERPADU (POSYANDU) BALITA', pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`WILAYAH KERJA PUSKESMAS KECAMATAN • ${posyanduName.toUpperCase()}`, pageWidth / 2, 19, { align: 'center' });
  doc.text('Sistem Deteksi Dini & Pencegahan Stunting — StuntGuard', pageWidth / 2, 24, { align: 'center' });

  // 2. JUDUL SURAT
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Dark Crimson Red
  doc.text('SURAT RUJUKAN SKRINING BALITA', pageWidth / 2, 36, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Nomor Dokumen: SG-RUJUKAN/${pengukuran.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 40.5, { align: 'center' });

  // 3. TUJUAN SURAT
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text('Kepada Yth.', 14, 46);
  doc.setFont('helvetica', 'bold');
  doc.text('Bidan Desa / Petugas Gizi Puskesmas', 14, 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Di Tempat', 14, 54);

  doc.setFontSize(8.5);
  doc.text(
    'Bersama surat ini kami menghadapkan balita sasaran hasil penimbangan Posyandu dengan indikasi stunting / gagal tumbuh untuk mendapatkan pemeriksaan klinis, konfirmasi antropometri, dan intervensi gizi lebih lanjut:',
    14,
    59,
    { maxWidth: pageWidth - 28 }
  );

  // 4. TABEL IDENTITAS & PENGUKURAN
  const genderStr = child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan';
  const tbuStr = pengukuran.z_tbu !== null && pengukuran.z_tbu !== undefined ? `${pengukuran.z_tbu > 0 ? '+' : ''}${pengukuran.z_tbu} SD` : '-';
  const bbuStr = pengukuran.z_bbu !== null && pengukuran.z_bbu !== undefined ? `${pengukuran.z_bbu > 0 ? '+' : ''}${pengukuran.z_bbu} SD` : '-';

  const relMap: Record<string, string> = {
    ibu: 'Ibu',
    ayah: 'Ayah',
    nenek_kakek: 'Nenek / Kakek',
    wali_lain: 'Wali Lain',
  };
  const caregiverRel = child.hubungan_pengasuh ? ` (${relMap[child.hubungan_pengasuh] || child.hubungan_pengasuh})` : '';
  const caregiverFull = `${child.nama_pengasuh || '-'}${caregiverRel}`;

  autoTable(doc, {
    startY: 66,
    theme: 'grid',
    body: [
      ['Nama Balita', `: ${child.nama}`, 'Tanggal Pengukuran', `: ${formatIndonesianDate(pengukuran.tgl_ukur)}`],
      ['NIK Balita', `: ${child.nik || '-'}`, 'Posyandu Asal', `: ${posyanduName}`],
      ['Tanggal Lahir / Usia', `: ${formatIndonesianDate(child.tgl_lahir)} (${ageInMonths} Bulan)`, 'Tinggi / Panjang Badan', `: ${pengukuran.tinggi_cm} cm (${pengukuran.cara_ukur})`],
      ['Jenis Kelamin', `: ${genderStr}`, 'Berat Badan', `: ${pengukuran.berat_kg} kg`],
      ['Nama Pengasuh', `: ${caregiverFull}`, 'Z-Score TB/U', `: ${tbuStr}`],
      ['Status Skrining', ': INDIKASI STUNTING (MERAH)', 'Z-Score BB/U', `: ${bbuStr}`],
    ],
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold', textColor: [71, 85, 105], fontSize: 8 },
      1: { cellWidth: 55, textColor: [15, 23, 42], fontSize: 8 },
      2: { cellWidth: 38, fontStyle: 'bold', textColor: [71, 85, 105], fontSize: 8 },
      3: { cellWidth: 53, textColor: [15, 23, 42], fontSize: 8 },
    },
    styles: {
      cellPadding: 1.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 14, right: 14 },
  });

  const lastTableY = (doc as any).lastAutoTable.finalY || 96;

  // 5. VECTOR GROWTH CHARTS (TB/U and BB/U)
  const chartY = lastTableY + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(68, 99, 109);
  doc.text('Grafik Pertumbuhan Anak pada Kurva Baku WHO', 14, chartY);

  // Chart Dimensions
  const chartW = 86;
  const chartH = 46;
  const chart1X = 14;
  const chart2X = 110;
  const chartTopY = chartY + 3;

  // Filter WHO Reference Data for Child Sex
  const tbuRefs = WHO_REFERENCE_DATA.filter(
    (r) => r.indikator === 'tbu' && r.jenis_kelamin === child.jenis_kelamin
  ).sort((a, b) => a.umur_bulan - b.umur_bulan);

  const bbuRefs = WHO_REFERENCE_DATA.filter(
    (r) => r.indikator === 'bbu' && r.jenis_kelamin === child.jenis_kelamin
  ).sort((a, b) => a.umur_bulan - b.umur_bulan);

  // Helper to draw single curve chart
  function drawMiniChart(
    xOrigin: number,
    yOrigin: number,
    title: string,
    unit: string,
    yMin: number,
    yMax: number,
    refs: any[],
    childVal: number,
    childAge: number
  ) {
    // Chart background box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(xOrigin, yOrigin, chartW, chartH, 'FD');

    // Title inside chart
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`${title} (${unit})`, xOrigin + 3, yOrigin + 4.5);

    // Plot area coordinates
    const pLeft = xOrigin + 9;
    const pRight = xOrigin + chartW - 4;
    const pTop = yOrigin + 6;
    const pBottom = yOrigin + chartH - 5;
    const plotW = pRight - pLeft;
    const plotH = pBottom - pTop;

    const toX = (m: number) => pLeft + (Math.min(60, Math.max(0, m)) / 60) * plotW;
    const toY = (v: number) => pBottom - ((Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin)) * plotH;

    // Grid lines for ages: 0, 12, 24, 36, 48, 60
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    [0, 12, 24, 36, 48, 60].forEach((m) => {
      const gx = toX(m);
      doc.line(gx, pTop, gx, pBottom);
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${m}`, gx, pBottom + 3, { align: 'center' });
    });

    // Y Axis ticks
    [yMin, (yMin + yMax) / 2, yMax].forEach((val) => {
      const gy = toY(val);
      doc.line(pLeft, gy, pRight, gy);
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${Math.round(val)}`, pLeft - 1.5, gy + 1, { align: 'right' });
    });

    // WHO Reference Lines: -3, -2, Median (0), +2, +3
    const drawRefCurve = (zScore: number, strokeColor: [number, number, number], width = 0.25) => {
      doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
      doc.setLineWidth(width);
      for (let i = 0; i < refs.length - 1; i += 2) {
        const r1 = refs[i];
        const r2 = refs[Math.min(refs.length - 1, i + 2)];
        const v1 = calculateReferenceValue(r1.l, r1.m, r1.s, zScore);
        const v2 = calculateReferenceValue(r2.l, r2.m, r2.s, zScore);
        doc.line(toX(r1.umur_bulan), toY(v1), toX(r2.umur_bulan), toY(v2));
      }
    };

    // Draw reference lines
    drawRefCurve(3, [16, 185, 129], 0.2); // +3 SD Green
    drawRefCurve(2, [16, 185, 129], 0.25); // +2 SD Green
    drawRefCurve(0, [5, 150, 105], 0.45); // Median Dark Green
    drawRefCurve(-2, [239, 68, 68], 0.35); // -2 SD Red
    drawRefCurve(-3, [185, 28, 28], 0.25); // -3 SD Crimson

    // Plot Child Measurement Dot
    const dotX = toX(childAge);
    const dotY = toY(childVal);

    // Outer glow
    doc.setFillColor(68, 99, 109);
    doc.circle(dotX, dotY, 1.8, 'F');
    // Inner white
    doc.setFillColor(255, 255, 255);
    doc.circle(dotX, dotY, 1.0, 'F');
    // Center point
    doc.setFillColor(185, 28, 28);
    doc.circle(dotX, dotY, 0.6, 'F');

    // Label on dot
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${childVal} ${unit}`, dotX, Math.max(pTop + 3, dotY - 2.5), { align: 'center' });
  }

  // Draw TB/U (Height for Age)
  drawMiniChart(
    chart1X,
    chartTopY,
    'Tinggi menurut Umur (TB/U)',
    'cm',
    45,
    120,
    tbuRefs,
    pengukuran.tinggi_cm,
    exactAgeMonths
  );

  // Draw BB/U (Weight for Age)
  drawMiniChart(
    chart2X,
    chartTopY,
    'Berat menurut Umur (BB/U)',
    'kg',
    2,
    26,
    bbuRefs,
    pengukuran.berat_kg,
    exactAgeMonths
  );

  const afterChartY = chartTopY + chartH + 5;

  // 6. MANDATORY DISCLAIMER BOX
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(245, 158, 11); // Amber 500
  doc.setLineWidth(0.4);
  doc.roundedRect(14, afterChartY, pageWidth - 28, 11, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14); // Amber 900
  doc.text(
    'Hasil ini adalah skrining awal, bukan diagnosis. Mohon pemeriksaan oleh tenaga kesehatan.',
    pageWidth / 2,
    afterChartY + 6.8,
    { align: 'center' }
  );

  // 7. CATATAN & REKOMENDASI POSYANDU
  const notesY = afterChartY + 15;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Catatan Petugas / Kader Pengirim:', 14, notesY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Balita menunjukkan pertumbuhan tinggi/berat badan di bawah kurva rujukan baku WHO (-3 SD). Disarankan evaluasi status kesehatan, asupan gizi harian, riwayat infeksi berulang, serta konfirmasi antropometri lengkap di fasilitas pelayanan kesehatan.',
    14,
    notesY + 4.5,
    { maxWidth: pageWidth - 28 }
  );

  // 8. TANDA TANGAN (Signatures)
  const signY = notesY + 22;
  const col1X = 24;
  const col2X = pageWidth - 64;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Penerima Rujukan,', col1X, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('Bidan Desa / Petugas Puskesmas', col1X, signY + 4);

  doc.setFont('helvetica', 'normal');
  doc.text(`${posyanduName}, ${formatIndonesianDate(pengukuran.tgl_ukur)}`, col2X, signY);
  doc.text('Kader Posyandu Pengirim,', col2X, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(kaderName, col2X, signY + 8);

  // Signature lines
  const lineY = signY + 24;
  doc.setDrawColor(148, 163, 184);
  doc.line(col1X, lineY, col1X + 46, lineY);
  doc.line(col2X, lineY, col2X + 46, lineY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('( .................................................. )', col1X, lineY + 3.5);
  doc.text(`( ${kaderName} )`, col2X, lineY + 3.5);

  // 9. FOOTER
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Dibuat otomatis oleh StuntGuard • Kurva Baku WHO • Skrining Awal Bukan Diagnosis',
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  );

  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}
