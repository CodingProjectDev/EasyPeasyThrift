import { NextResponse } from 'next/server';

function getTikTokVideoId(url: string) {
  const match = url.match(/\/video\/(\d+)/);

  return match?.[1] || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = String(body?.url || '').trim();

    if (!url) {
      return NextResponse.json(
        { error: 'TikTok URL is required.' },
        { status: 400 },
      );
    }

    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid TikTok URL.' },
        { status: 400 },
      );
    }

    const hostname =
      parsed.hostname.toLowerCase();

    const allowedHosts = [
      'tiktok.com',
      'www.tiktok.com',
      'vt.tiktok.com',
      'vm.tiktok.com',
    ];

    if (!allowedHosts.includes(hostname)) {
      return NextResponse.json(
        { error: 'Invalid TikTok URL.' },
        { status: 400 },
      );
    }

    /*
     * Full TikTok URL:
     * https://www.tiktok.com/@user/video/123456...
     */
    let videoId =
      getTikTokVideoId(url);

    let finalUrl = url;

    /*
     * Resolve short links:
     * https://vt.tiktok.com/...
     * https://vm.tiktok.com/...
     */
    if (!videoId) {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        headers: {
          'User-Agent':
            'Mozilla/5.0 AppleWebKit/537.36 Chrome/120 Safari/537.36',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          {
            error:
              'TikTok short link could not be opened.',
          },
          { status: 400 },
        );
      }

      finalUrl = response.url;

      videoId =
        getTikTokVideoId(finalUrl);
    }

    if (!videoId) {
      return NextResponse.json(
        {
          error:
            'Could not resolve TikTok video.',
          finalUrl,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      videoId,
      finalUrl,
      embedUrl:
        `https://www.tiktok.com/player/v1/${videoId}?autoplay=0&loop=0`,
    });
  } catch (error) {
    console.error(
      'TikTok resolve error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Unable to resolve TikTok video.',
      },
      { status: 500 },
    );
  }
}