import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Allow static files, api routes, and favicon to bypass middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Check if real Supabase keys are configured
  const isRealSupabase =
    supabaseUrl &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder');

  let user: any = null;
  let role: string | null = null;

  // 1. Check dev session cookie first (for fast dev / offline testing)
  const devSession = request.cookies.get('sg_dev_session')?.value;
  if (devSession) {
    try {
      user = JSON.parse(decodeURIComponent(devSession));
      if (user?.role) {
        role = user.role;
      }
    } catch {
      user = null;
    }
  }

  // 2. Check real Supabase authentication if not already authenticated via dev session
  if (!user && isRealSupabase) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      user = data?.user || null;

      if (user) {
        role = user.user_metadata?.role || null;
        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          role = profile?.role || null;
        }
      }

      // Offline fallback: if auth token exists but network/server check failed
      if (!user) {
        const hasSessionCookie = request.cookies
          .getAll()
          .some(
            (c) =>
              c.name.includes('-auth-token') ||
              c.name.includes('supabase-auth')
          );
        if (hasSessionCookie) {
          const savedRole = request.cookies.get('sg_user_role')?.value || 'kader';
          user = { id: 'offline-cached-user', role: savedRole };
          role = savedRole;
        }
      }
    } catch {
      // Network error offline fallback
      const hasSessionCookie = request.cookies
        .getAll()
        .some(
          (c) =>
            c.name.includes('-auth-token') ||
            c.name.includes('supabase-auth')
        );
      if (hasSessionCookie) {
        const savedRole = request.cookies.get('sg_user_role')?.value || 'kader';
        user = { id: 'offline-cached-user', role: savedRole };
        role = savedRole;
      } else {
        user = null;
      }
    }
  }

  // Fallback to role cookie if user is set but role is still undetermined
  if (user && !role) {
    role = request.cookies.get('sg_user_role')?.value || user.role || 'kader';
  }

  const isLoginPage = pathname === '/login';

  // If unauthenticated: redirect to /login
  if (!user && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (user && role) {
    const destination = request.nextUrl.clone();

    // If at /login while already authenticated, redirect to role's home
    if (isLoginPage) {
      if (role === 'pengasuh') {
        destination.pathname = '/keluarga';
      } else if (role === 'kader') {
        destination.pathname = '/kader';
      } else if (['bidan', 'kpm', 'kepala_desa'].includes(role)) {
        destination.pathname = '/desa';
      } else {
        destination.pathname = '/belum-tersedia';
      }
      return NextResponse.redirect(destination);
    }

    // Root path '/' routing
    if (pathname === '/') {
      if (role === 'pengasuh') {
        destination.pathname = '/keluarga';
      } else if (role === 'kader') {
        destination.pathname = '/kader';
      } else if (['bidan', 'kpm', 'kepala_desa'].includes(role)) {
        destination.pathname = '/desa';
      } else {
        destination.pathname = '/belum-tersedia';
      }
      return NextResponse.redirect(destination);
    }

    // RULE 1: Role 'pengasuh' can ONLY open /keluarga/* and login pages
    // Pengasuh must never open /kader/* or /desa/*, even by typing the URL
    if (role === 'pengasuh') {
      if (!pathname.startsWith('/keluarga') && pathname !== '/login' && pathname !== '/belum-tersedia') {
        destination.pathname = '/keluarga';
        return NextResponse.redirect(destination);
      }
    }

    // RULE 2: Roles kader, bidan, kpm, kepala_desa must NOT open /keluarga/*
    if (pathname.startsWith('/keluarga') && role !== 'pengasuh') {
      if (role === 'kader') {
        destination.pathname = '/kader';
      } else if (['bidan', 'kpm', 'kepala_desa'].includes(role)) {
        destination.pathname = '/desa';
      } else {
        destination.pathname = '/belum-tersedia';
      }
      return NextResponse.redirect(destination);
    }

    // RULE 3: Kader cannot open /desa/*
    if (pathname.startsWith('/desa') && role === 'kader') {
      destination.pathname = '/kader';
      return NextResponse.redirect(destination);
    }

    // RULE 4: Bidan, KPM, Kepala Desa cannot open /kader/*
    if (pathname.startsWith('/kader') && ['bidan', 'kpm', 'kepala_desa'].includes(role)) {
      destination.pathname = '/desa';
      return NextResponse.redirect(destination);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
