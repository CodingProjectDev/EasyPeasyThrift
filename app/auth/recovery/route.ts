import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createServerSupabaseClient,
} from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
) {
  const {
    searchParams,
  } = new URL(request.url);

  const tokenHash =
    searchParams.get(
      'token_hash',
    );

  const redirectTo =
    request.nextUrl.clone();

  redirectTo.pathname =
    '/reset-password';

  redirectTo.search = '';

  if (!tokenHash) {
    redirectTo.pathname =
      '/forgot-password';

    redirectTo.searchParams.set(
      'error',
      'invalid-reset-link',
    );

    return NextResponse.redirect(
      redirectTo,
    );
  }

  const supabase =
    await createServerSupabaseClient();

  const {
    error,
  } =
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

  if (error) {
    console.error(
      'PASSWORD RECOVERY ERROR:',
      error.message,
    );

    redirectTo.pathname =
      '/forgot-password';

    redirectTo.searchParams.set(
      'error',
      'invalid-reset-link',
    );

    return NextResponse.redirect(
      redirectTo,
    );
  }

  return NextResponse.redirect(
    redirectTo,
  );
}