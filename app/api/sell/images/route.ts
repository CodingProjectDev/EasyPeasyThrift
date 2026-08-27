import {
  NextResponse,
} from 'next/server';

import {
  randomUUID,
} from 'node:crypto';

import {
  getSupabaseAdmin,
} from '@/lib/supabase';

export const runtime =
  'nodejs';

const BUCKET =
  'sell-submissions';

const MAX_FILE_BYTES =
  4 * 1024 * 1024;

/* =========================================
   UUID CHECK
========================================= */

function isUuid(
  value?: string,
) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/* =========================================
   AUTHENTICATE CUSTOMER
========================================= */

async function getCustomer(
  request: Request,
) {
  const supabase =
    getSupabaseAdmin();

  if (!supabase) {
    return {
      supabase: null,
      user: null,
    };
  }

  const authorization =
    request.headers.get(
      'authorization',
    ) || '';

  const token =
    authorization
      .replace(
        /^Bearer\s+/i,
        '',
      )
      .trim();

  if (!token) {
    return {
      supabase,
      user: null,
    };
  }

  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser(
      token,
    );

  if (
    error ||
    !user
  ) {
    return {
      supabase,
      user: null,
    };
  }

  return {
    supabase,
    user,
  };
}

/* =========================================
   UPLOAD PHOTO
========================================= */

export async function POST(
  request: Request,
) {
  const {
    supabase,
    user,
  } =
    await getCustomer(
      request,
    );

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase server configuration is missing.',
      },
      {
        status: 503,
      },
    );
  }

  if (!user) {
    return NextResponse.json(
      {
        error:
          'Customer login required.',
      },
      {
        status: 401,
      },
    );
  }

  try {
    const form =
      await request.formData();

    const file =
      form.get(
        'file',
      );

    const submissionId =
      String(
        form.get(
          'submissionId',
        ) ||
          '',
      );

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            'Photo is required.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isUuid(
        submissionId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid submission ID.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Client converts every photo
     * into JPEG before upload.
     */
    if (
      file.type !==
      'image/jpeg'
    ) {
      return NextResponse.json(
        {
          error:
            'Uploaded photo must be JPEG.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      file.size >
      MAX_FILE_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            'Photo is too large after processing.',
        },
        {
          status: 400,
        },
      );
    }

    const path =
      `${user.id}/${submissionId}/${randomUUID()}.jpg`;

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          BUCKET,
        )
        .upload(
          path,
          file,
          {
            contentType:
              'image/jpeg',

            cacheControl:
              '3600',

            upsert:
              false,
          },
        );

    if (
      uploadError
    ) {
      return NextResponse.json(
        {
          error:
            `Photo upload failed: ${uploadError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const {
      data:
        publicData,
    } =
      supabase.storage
        .from(
          BUCKET,
        )
        .getPublicUrl(
          path,
        );

    if (
      !publicData
        ?.publicUrl
    ) {
      await supabase.storage
        .from(
          BUCKET,
        )
        .remove([
          path,
        ]);

      return NextResponse.json(
        {
          error:
            'Could not create photo URL.',
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        url:
          publicData.publicUrl,

        path,
      },
    );
  } catch (error) {
    console.error(
      'SELL PHOTO UPLOAD ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not upload photo.',
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================
   CLEAN UP FAILED SUBMISSION PHOTOS
========================================= */

export async function DELETE(
  request: Request,
) {
  const {
    supabase,
    user,
  } =
    await getCustomer(
      request,
    );

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase server configuration is missing.',
      },
      {
        status: 503,
      },
    );
  }

  if (!user) {
    return NextResponse.json(
      {
        error:
          'Customer login required.',
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      await request.json();

    const paths =
      Array.isArray(
        body?.paths,
      )
        ? body.paths
            .map(
              String,
            )
            .filter(
              (
                path: string,
              ) =>
                path.startsWith(
                  `${user.id}/`,
                ),
            )
            .slice(
              0,
              5,
            )
        : [];

    if (!paths.length) {
      return NextResponse.json(
        {
          success:
            true,
        },
      );
    }

    const {
      error,
    } =
      await supabase.storage
        .from(
          BUCKET,
        )
        .remove(
          paths,
        );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success:
          true,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not remove uploaded photos.',
      },
      {
        status: 500,
      },
    );
  }
}