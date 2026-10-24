import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

export default async function KeluargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // 1. Check dev session cookie
  const devSessionCookie = cookieStore.get('sg_dev_session')?.value;
  let role: string | null = null;
  let user: any = null;

  if (devSessionCookie) {
    try {
      user = JSON.parse(decodeURIComponent(devSessionCookie));
      role = user?.role || null;
    } catch {
      // ignore
    }
  }

  // 2. Check Supabase auth if not in dev session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isRealSupabase =
    supabaseUrl &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder');

  if (!role && isRealSupabase) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      });

      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        user = data.user;
        role = data.user.user_metadata?.role || null;

        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();
          role = profile?.role || null;
        }
      }
    } catch {
      // ignore
    }
  }

  // Check fallback role cookie
  if (!role) {
    role = cookieStore.get('sg_user_role')?.value || null;
  }

  // If no user found -> send to login
  if (!user && !role) {
    redirect('/login');
  }

  // Role guard: Only 'pengasuh' can access /keluarga/*
  if (role && role !== 'pengasuh') {
    if (role === 'kader') {
      redirect('/kader');
    } else if (['bidan', 'kpm', 'kepala_desa'].includes(role)) {
      redirect('/desa');
    } else {
      redirect('/belum-tersedia');
    }
  }

  return <>{children}</>;
}
