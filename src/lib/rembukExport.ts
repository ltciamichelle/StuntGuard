import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Anak, Pengukuran, TindakLanjut, Posyandu } from '@/types/database';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';

export interface RembukExportData {
  desaName: string;
  selectedMonth: string; // YYYY-MM
  posyanduLabel: string;
  children: Anak[];
  measurements: Pengukuran[];
  tindakLanjutList: TindakLanjut[];
  posyanduList: Posyandu[];
}

export interface ProcessedRembukData {
  desaName: string;
  selectedMonth: string;
  posyanduLabel: string;
  totalChildren: number;
  countHijau: number;
  countKuning: number;
  countMerah: number;
  countUnmeasured: number;
  countBayi: number; // 0-5 bln
  countBaduta: number; // 6-23 bln
  countBalita: number; // 24-59 bln
  childRows: Array<{
    nama: string;
    usia: number;
    jenisKelamin: 'L' | 'P';
    posyandu: string;
    tglUkur: string;
    tinggi: number | string;
    berat: number | string;
    zTbu: number | string;
    zBbu: number | string;
    status: 'Hijau' | 'Kuning' | 'Merah' | 'Belum Diukur';
  }>;
  attentionRows: Array<{
    no: number;
    nama: string;
    usia: number;
    jenisKelamin: string;
    posyandu: string;
    tglUkur: string;
    tinggi: string;
    berat: string;
    zTbu: string;
    zBbu: string;
    status: string;
    statusRujukan: string;
    catatan: string;
  }>;
  tindakLanjutRows: Array<{
    nama: string;
    status: string;
    tglKunjunganUlang: string;
    statusRujukan: string;
    catatan: string;
    selesai: string;
  }>;
}

export function processRembukData(data: RembukExportData): ProcessedRembukData {
  const { desaName, selectedMonth, posyanduLabel, children, measurements, tindakLanjutList, posyanduList } = data;

  const posMap = new Map<number, string>();
  posyanduList.forEach((p) => posMap.set(p.id, p.nama));

  const tlMap = new Map<string, TindakLanjut>();
  tindakLanjutList.forEach((tl) => tlMap.set(tl.anak_id, tl));

  // Map each child to their latest measurement in the selected month
  const measurementsByChild = new Map<string, Pengukuran>();
  for (const m of measurements) {
    if (m.tgl_ukur && m.tgl_ukur.startsWith(selectedMonth)) {
      const existing = measurementsByChild.get(m.anak_id);
      if (!existing || new Date(m.tgl_ukur).getTime() > new Date(existing.tgl_ukur).getTime()) {
        measurementsByChild.set(m.anak_id, m);
      }
    }
  }

  let countHijau = 0;
  let countKuning = 0;
  let countMerah = 0;
  let countUnmeasured = 0;
  let countBayi = 0;
  let countBaduta = 0;
  let countBalita = 0;

  const childRows: ProcessedRembukData['childRows'] = [];
  const attentionList: any[] = [];
  const tindakLanjutRows: ProcessedRembukData['tindakLanjutRows'] = [];

  for (const c of children) {
    const age = calculateAgeInMonths(c.tgl_lahir);
    const m = measurementsByChild.get(c.id);
    const tl = tlMap.get(c.id);
    const posName = posMap.get(c.posyandu_id) || `Posyandu ${c.posyandu_id}`;

    // Target Groups
    if (age <= 5) {
      countBayi++;
    } else if (age >= 6 && age <= 23) {
      countBaduta++;
    } else if (age >= 24 && age <= 59) {
      countBalita++;
    }

    let statusText: 'Hijau' | 'Kuning' | 'Merah' | 'Belum Diukur' = 'Belum Diukur';
    if (m) {
      if (m.status === 'hijau') {
        countHijau++;
        statusText = 'Hijau';
      } else if (m.status === 'kuning') {
        countKuning++;
        statusText = 'Kuning';
      } else if (m.status === 'merah') {
        countMerah++;
        statusText = 'Merah';
      }
    } else {
      countUnmeasured++;
    }

    childRows.push({
      nama: c.nama,
      usia: age,
      jenisKelamin: c.jenis_kelamin,
      posyandu: posName,
      tglUkur: m?.tgl_ukur ? formatIndonesianDate(m.tgl_ukur) : '-',
      tinggi: m?.tinggi_cm ?? '-',
      berat: m?.berat_kg ?? '-',
      zTbu: m?.z_tbu !== null && m?.z_tbu !== undefined ? m.z_tbu : '-',
      zBbu: m?.z_bbu !== null && m?.z_bbu !== undefined ? m.z_bbu : '-',
      status: statusText,
    });

    if (m && (m.status === 'merah' || m.status === 'kuning')) {
      const rujukanStr =
        tl?.status_rujukan === 'belum'
          ? 'Belum'
          : tl?.status_rujukan === 'sudah'
          ? 'Sudah dirujuk'
          : tl?.status_rujukan === 'ada_hasil'
          ? 'Ada hasil'
          : '-';

      attentionList.push({
        c,
        m,
        tl,
        posName,
        age,
        rujukanStr,
      });

      tindakLanjutRows.push({
        nama: c.nama,
        status: statusText,
        tglKunjunganUlang: tl?.tgl_kunjungan_ulang ? formatIndonesianDate(tl.tgl_kunjungan_ulang) : '-',
        statusRujukan: rujukanStr,
        catatan: tl?.catatan || '-',
        selesai: tl?.selesai ? 'Ya' : 'Belum',
      });
    }
  }

  // Sort attentionList: merah first, then kuning
  attentionList.sort((a, b) => {
    if (a.m.status === 'merah' && b.m.status !== 'merah') return -1;
    if (a.m.status !== 'merah' && b.m.status === 'merah') return 1;
    return a.c.nama.localeCompare(b.c.nama);
  });

  const attentionRows: ProcessedRembukData['attentionRows'] = attentionList.map((item, idx) => ({
    no: idx + 1,
    nama: item.c.nama,
    usia: item.age,
    jenisKelamin: item.c.jenis_kelamin === 'L' ? 'L' : 'P',
    posyandu: item.posName,
    tglUkur: item.m.tgl_ukur ? formatIndonesianDate(item.m.tgl_ukur) : '-',
    tinggi: item.m.tinggi_cm ? `${item.m.tinggi_cm} cm` : '-',
    berat: item.m.berat_kg ? `${item.m.berat_kg} kg` : '-',
    zTbu: item.m.z_tbu !== null && item.m.z_tbu !== undefined ? `${item.m.z_tbu} SD` : '-',
    zBbu: item.m.z_bbu !== null && item.m.z_bbu !== undefined ? `${item.m.z_bbu} SD` : '-',
    status: item.m.status === 'merah' ? 'Merah (Stunting)' : 'Kuning (Waspada)',
    statusRujukan: item.rujukanStr,
    catatan: item.tl?.catatan || '-',
  }));

  // Sort childRows alphabetically by child name
  childRows.sort((a, b) => a.nama.localeCompare(b.nama));

  return {
    desaName,
    selectedMonth,
    posyanduLabel,
    totalChildren: children.length,
    countHijau,
    countKuning,
    countMerah,
    countUnmeasured,
    countBayi,
    countBaduta,
    countBalita,
    childRows,
    attentionRows,
    tindakLanjutRows,
  };
}

/**
 * Generate Excel (.xlsx) file with 3 sheets:
 * 1. "Ringkasan"
 * 2. "Daftar Anak"
 * 3. "Tindak Lanjut"
 */
export async function generateRembukExcel(data: RembukExportData): Promise<Buffer> {
  const processed = processRembukData(data);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StuntGuard';
  workbook.created = new Date();

  const tealFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF44636D' },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  // ----------------------------------------------------
  // SHEET 1: Ringkasan
  // ----------------------------------------------------
  const ws1 = workbook.addWorksheet('Ringkasan');
  ws1.columns = [
    { width: 28 },
    { width: 24 },
    { width: 20 },
    { width: 20 },
  ];

  ws1.addRow(['LAPORAN REMBUK STUNTING DESA']);
  ws1.getRow(1).font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E293B' } };

  ws1.addRow(['Sistem Deteksi Dini & Pencegahan Stunting — StuntGuard']);
  ws1.getRow(2).font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
  ws1.addRow([]);

  ws1.addRow(['Desa', processed.desaName]);
  ws1.addRow(['Periode Bulan', processed.selectedMonth]);
  ws1.addRow(['Filter Posyandu', processed.posyanduLabel]);
  ws1.addRow(['Tanggal Dibuat', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })]);
  ws1.addRow([]);

  for (let r = 4; r <= 7; r++) {
    ws1.getRow(r).getCell(1).font = { name: 'Arial', bold: true, color: { argb: 'FF334155' } };
    ws1.getRow(r).getCell(2).font = { name: 'Arial', color: { argb: 'FF0F172A' } };
  }

  // Ringkasan Status Gizi
  ws1.addRow(['RINGKASAN STATUS GIZI BALITA']);
  ws1.getRow(9).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF44636D' } };

  const statusHeaderRow = ws1.addRow(['Kategori Status Gizi', 'Jumlah Anak', 'Persentase']);
  statusHeaderRow.eachCell((cell) => {
    cell.fill = tealFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const total = processed.totalChildren || 1;
  const statusRowsData = [
    ['Hijau (Normal)', processed.countHijau, `${Math.round((processed.countHijau / total) * 100)}%`],
    ['Kuning (Waspada)', processed.countKuning, `${Math.round((processed.countKuning / total) * 100)}%`],
    ['Merah (Indikasi Stunting)', processed.countMerah, `${Math.round((processed.countMerah / total) * 100)}%`],
    ['Belum Diukur', processed.countUnmeasured, `${Math.round((processed.countUnmeasured / total) * 100)}%`],
    ['Total Balita Terdaftar', processed.totalChildren, '100%'],
  ];

  statusRowsData.forEach((row, i) => {
    const r = ws1.addRow(row);
    if (i === statusRowsData.length - 1) {
      r.font = { name: 'Arial', bold: true };
    }
  });

  ws1.addRow([]);

  // Tabel Pembagian Sasaran (Target Groups)
  ws1.addRow(['PEMBAGIAN KELOMPOK SASARAN']);
  const tgTitleRow = ws1.lastRow;
  if (tgTitleRow) {
    tgTitleRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF44636D' } };
  }

  const tgHeaderRow = ws1.addRow(['Kelompok Sasaran', 'Rentang Usia', 'Jumlah Sasaran']);
  tgHeaderRow.eachCell((cell) => {
    cell.fill = tealFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const tgRows = [
    ['Bayi', '0 - 5 Bulan', processed.countBayi],
    ['Baduta', '6 - 23 Bulan', processed.countBaduta],
    ['Balita', '24 - 59 Bulan', processed.countBalita],
    ['Ibu hamil', '-', 'Belum tersedia'],
    ['Ibu nifas', '-', 'Belum tersedia'],
  ];

  tgRows.forEach((row) => {
    ws1.addRow(row);
  });

  ws1.addRow([]);
  const noteRow1 = ws1.addRow(['Catatan:', 'Pembagian sasaran perlu dicocokkan dengan panduan resmi Rembuk Stunting.']);
  noteRow1.getCell(1).font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF64748B' } };
  noteRow1.getCell(2).font = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF64748B' } };

  const noteRow2 = ws1.addRow(['', 'Dibuat oleh StuntGuard. Skrining awal, bukan diagnosis.']);
  noteRow2.getCell(2).font = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF64748B' } };

  // ----------------------------------------------------
  // SHEET 2: Daftar Anak
  // ----------------------------------------------------
  const ws2 = workbook.addWorksheet('Daftar Anak');
  ws2.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Nama Balita', key: 'nama', width: 26 },
    { header: 'Usia (Bulan)', key: 'usia', width: 14 },
    { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 14 },
    { header: 'Posyandu', key: 'posyandu', width: 22 },
    { header: 'Tanggal Ukur Terakhir', key: 'tglUkur', width: 22 },
    { header: 'Tinggi (cm)', key: 'tinggi', width: 14 },
    { header: 'Berat (kg)', key: 'berat', width: 14 },
    { header: 'Z-Score TB/U', key: 'zTbu', width: 15 },
    { header: 'Z-Score BB/U', key: 'zBbu', width: 15 },
    { header: 'Status', key: 'status', width: 16 },
  ];

  const headerRow2 = ws2.getRow(1);
  headerRow2.eachCell((cell) => {
    cell.fill = tealFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  processed.childRows.forEach((item, index) => {
    const row = ws2.addRow({
      no: index + 1,
      nama: item.nama,
      usia: item.usia,
      jenisKelamin: item.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      posyandu: item.posyandu,
      tglUkur: item.tglUkur,
      tinggi: item.tinggi,
      berat: item.berat,
      zTbu: item.zTbu,
      zBbu: item.zBbu,
      status: item.status,
    });

    // Color code status text
    const statusCell = row.getCell('status');
    if (item.status === 'Merah') {
      statusCell.font = { name: 'Arial', color: { argb: 'FFDC2626' }, bold: true };
    } else if (item.status === 'Kuning') {
      statusCell.font = { name: 'Arial', color: { argb: 'FFD97706' }, bold: true };
    } else if (item.status === 'Hijau') {
      statusCell.font = { name: 'Arial', color: { argb: 'FF16A34A' }, bold: true };
    }
  });

  // ----------------------------------------------------
  // SHEET 3: Tindak Lanjut
  // ----------------------------------------------------
  const ws3 = workbook.addWorksheet('Tindak Lanjut');
  ws3.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Nama Balita', key: 'nama', width: 26 },
    { header: 'Status Gizi', key: 'status', width: 16 },
    { header: 'Tanggal Kunjungan Ulang', key: 'tglKunjunganUlang', width: 24 },
    { header: 'Status Rujukan', key: 'statusRujukan', width: 18 },
    { header: 'Catatan Kasus', key: 'catatan', width: 36 },
    { header: 'Selesai', key: 'selesai', width: 12 },
  ];

  const headerRow3 = ws3.getRow(1);
  headerRow3.eachCell((cell) => {
    cell.fill = tealFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  if (processed.tindakLanjutRows.length === 0) {
    ws3.addRow({
      no: '-',
      nama: 'Tidak ada kasus perhatian (Merah/Kuning) pada periode ini',
      status: '-',
      tglKunjunganUlang: '-',
      statusRujukan: '-',
      catatan: '-',
      selesai: '-',
    });
  } else {
    processed.tindakLanjutRows.forEach((item, index) => {
      ws3.addRow({
        no: index + 1,
        nama: item.nama,
        status: item.status,
        tglKunjunganUlang: item.tglKunjunganUlang,
        statusRujukan: item.statusRujukan,
        catatan: item.catatan,
        selesai: item.selesai,
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate PDF (A4) file for Rembuk Stunting
 */
export async function generateRembukPdf(data: RembukExportData): Promise<Buffer> {
  const processed = processRembukData(data);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(68, 99, 109); // #44636D Teal
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN REMBUK STUNTING DESA', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistem Deteksi Dini & Pencegahan Stunting — StuntGuard', 14, 18);

  // Metadata block
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Desa: ${processed.desaName}`, 14, 32);
  doc.text(`Periode: ${processed.selectedMonth}`, 90, 32);
  doc.text(`Posyandu: ${processed.posyanduLabel}`, 140, 32);

  // Summary Metrics Card
  autoTable(doc, {
    startY: 37,
    theme: 'grid',
    head: [['Total Balita', 'Hijau (Normal)', 'Kuning (Waspada)', 'Merah (Stunting)', 'Belum Diukur']],
    body: [
      [
        String(processed.totalChildren),
        `${processed.countHijau} (${Math.round((processed.countHijau / (processed.totalChildren || 1)) * 100)}%)`,
        `${processed.countKuning} (${Math.round((processed.countKuning / (processed.totalChildren || 1)) * 100)}%)`,
        `${processed.countMerah} (${Math.round((processed.countMerah / (processed.totalChildren || 1)) * 100)}%)`,
        `${processed.countUnmeasured} (${Math.round((processed.countUnmeasured / (processed.totalChildren || 1)) * 100)}%)`,
      ],
    ],
    headStyles: {
      fillColor: [68, 99, 109],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: {
      halign: 'center',
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    margin: { left: 14, right: 14 },
  });

  const lastY1 = (doc as any).lastAutoTable.finalY || 55;

  // Target Groups Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(68, 99, 109);
  doc.text('Pembagian Kelompok Sasaran', 14, lastY1 + 8);

  autoTable(doc, {
    startY: lastY1 + 11,
    theme: 'striped',
    head: [['Kelompok Sasaran', 'Rentang Usia', 'Jumlah Sasaran']],
    body: [
      ['Bayi', '0 - 5 Bulan', String(processed.countBayi)],
      ['Baduta', '6 - 23 Bulan', String(processed.countBaduta)],
      ['Balita', '24 - 59 Bulan', String(processed.countBalita)],
      ['Ibu hamil', '-', 'Belum tersedia'],
      ['Ibu nifas', '-', 'Belum tersedia'],
    ],
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    margin: { left: 14, right: 14 },
  });

  const lastY2 = (doc as any).lastAutoTable.finalY || 100;

  // Target group note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('* Catatan: Pembagian sasaran perlu dicocokkan dengan panduan resmi Rembuk Stunting.', 14, lastY2 + 5);

  // Table of Attention Children (Kuning & Merah)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(68, 99, 109);
  doc.text(`Daftar Anak Perlu Perhatian (${processed.attentionRows.length} Kasus)`, 14, lastY2 + 13);

  const attentionBody = processed.attentionRows.map((r) => [
    String(r.no),
    r.nama,
    r.posyandu,
    `${r.usia} bln`,
    r.status,
    r.tinggi,
    r.berat,
    r.zTbu,
    r.statusRujukan,
  ]);

  if (attentionBody.length === 0) {
    attentionBody.push(['-', 'Seluruh balita terpantau normal (tidak ada status Kuning/Merah)', '-', '-', '-', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: lastY2 + 16,
    theme: 'grid',
    head: [['No', 'Nama Balita', 'Posyandu', 'Usia', 'Status Gizi', 'Tinggi', 'Berat', 'TB/U', 'Rujukan']],
    body: attentionBody,
    headStyles: {
      fillColor: [185, 28, 28], // Crimson red for attention
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'center', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 18 },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Dibuat oleh StuntGuard. Skrining awal, bukan diagnosis.',
      14,
      pageHeight - 8
    );
    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - 30,
      pageHeight - 8
    );
  }

  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}
