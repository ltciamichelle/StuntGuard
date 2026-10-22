import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReferralPdf } from '@/lib/referralExport';
import { Anak, Pengukuran } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pengukuranId = searchParams.get('pengukuranId');

    if (!pengukuranId) {
      return NextResponse.json({ error: 'Parameter pengukuranId wajib disertakan.' }, { status: 400 });
    }

    const supabase = await createClient(request.cookies);
    let currentUserName = 'Kader Posyandu';
    let posyanduName = 'Posyandu Melati 03';

    let foundP: Pengukuran | null = null;
    let foundC: Anak | null = null;

    const isRealSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isRealSupabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
      }

      // Fetch measurement
      const { data: pData } = await supabase
        .from('pengukuran')
        .select('*')
        .eq('id', pengukuranId)
        .single();

      if (pData) {
        foundP = pData;

        // Fetch child
        const { data: cData } = await supabase
          .from('anak')
          .select('*')
          .eq('id', pData.anak_id)
          .single();
        if (cData) foundC = cData;

        // Fetch posyandu
        if (pData.posyandu_id) {
          const { data: posData } = await supabase
            .from('posyandu')
            .select('nama')
            .eq('id', pData.posyandu_id)
            .single();
          if (posData?.nama) posyanduName = posData.nama;
        }
      }

      // Fetch kader name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nama')
        .eq('id', user.id)
        .single();
      if (profile?.nama) currentUserName = profile.nama;
    } else {
      // Mock / Dev Session fallback
      const devCookie = request.cookies.get('sg_dev_session')?.value;
      if (devCookie) {
        try {
          const session = JSON.parse(decodeURIComponent(devCookie));
          if (session.nama) currentUserName = session.nama;
          if (session.posyandu_nama) posyanduName = session.posyandu_nama;
        } catch {}
      }
    }

    // Fallback child and measurement if testing without database
    if (!foundP) {
      foundP = {
        id: pengukuranId,
        anak_id: 'demo-anak',
        desa_id: 1,
        posyandu_id: 1,
        tgl_ukur: new Date().toISOString().split('T')[0],
        berat_kg: 8.2,
        tinggi_cm: 68.5,
        cara_ukur: 'berbaring',
        berat_manual: true,
        z_tbu: -3.4,
        z_bbu: -2.9,
        status: 'merah',
      };
    }

    if (!foundC) {
      foundC = {
        id: foundP.anak_id,
        desa_id: 1,
        posyandu_id: 1,
        nama: 'Rayyan Pratama',
        nik: '3201124508230001',
        no_kk: null,
        nama_ibu: 'Siti Rahmawati',
        tgl_lahir: '2025-08-15',
        jenis_kelamin: 'L',
      };
    }

    // Generate Referral PDF
    const pdfBuffer = await generateReferralPdf({
      child: foundC,
      pengukuran: foundP,
      posyanduName,
      kaderName: currentUserName,
    });

    // File name: rujukan_{nama-anak}_{tanggal}.pdf
    const cleanChildName = foundC.nama
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'anak';
    const cleanDate = foundP.tgl_ukur.replace(/[^0-9-]+/g, '_');
    const filename = `rujukan_${cleanChildName}_${cleanDate}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Error generating referral PDF:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses surat rujukan PDF.' },
      { status: 500 }
    );
  }
}
