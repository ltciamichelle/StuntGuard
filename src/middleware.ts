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

  let user = null;

  if (isRealSupabase) {
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

      const { data, error } = await supabase.auth.getUser();
      user = data.user;

      // Rule: Do not log the user out when a token refresh fails while offline.
      if (!user) {
        const hasSessionCookie = request.cookies
          .getAll()
          .some(
            (c) =>
              c.name.includes('-auth-token') ||
              c.name.includes('supabase-auth') ||
              c.name === 'sg_dev_session'
          );
        if (hasSessionCookie) {
          // Allow the offline PWA shell and cached pages to load without kicking to login
          user = { id: 'offline-cached-user', role: 'kader' };
        }
      }
    } catch {
      // In case of network error, check if auth cookies exist to preserve offline session
      const hasSessionCookie = request.cookies
        .getAll()
        .some(
          (c) =>
            c.name.includes('-auth-token') ||
            c.name.includes('supabase-auth') ||
            c.name === 'sg_dev_session'
        );
      if (hasSessionCookie) {
        user = { id: 'offline-cached-user', role: 'kader' };
      } else {
        user = null;
      }
    }
  } else {
    // Development fallback check when using mock/test session cookie
    const devSession = request.cookies.get('sg_dev_session')?.value;
    if (devSession) {
      try {
        user = JSON.parse(devSession);
      } catch {
        user = null;
      }
    }
  }

  // Route protection
  const isLoginPage = pathname === '/login';

  if (!user && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    // If logged in, redirect away from /login
    const destination = request.nextUrl.clone();
    const role = (user as any)?.user_metadata?.role || (user as any)?.role || 'kader';

    if (role === 'kader') {
      destination.pathname = '/kader';
    } else if (['bidan', 'kpm', 'kepala_desa'].includes(role)) {
      destination.pathname = '/desa';
    } else {
      destination.pathname = '/belum-tersedia';
    }
    return NextResponse.redirect(destination);
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
