import {
  NextResponse,
} from 'next/server';

import {
  getSupabaseAdmin,
} from '@/lib/supabase';

export const runtime =
  'nodejs';

const BUCKET =
  'sell-submissions';

const VALID_CONDITIONS =
  new Set([
    'Like New',
    'Excellent',
    'Good',
    'Fair',
  ]);

const VALID_DELIVERY_METHODS =
  new Set([
    'Drop Off',
    'Pickup',
    'Discuss With Store',
  ]);

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
   GET CUSTOMER SELL SUBMISSIONS
========================================= */

export async function GET(
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
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'sell_submissions',
        )
        .select(`
          id,
          item_name,
          category,
          brand,
          size,
          condition,
          description,
          expected_price,
          images,
          delivery_method,
          status,
          rejection_reason,
          approved_price,
          seller_percentage,
          seller_earning,
          store_earning,
          product_id,
          payout_status,
          payout_method,
          payout_reference,
          paid_at,
          reviewed_at,
          created_at,
          updated_at
        `)
        .eq(
          'user_id',
          user.id,
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          },
        );

    if (error) {
      return NextResponse.json(
        {
          error:
            `Could not load selling items: ${error.message}`,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        submissions:
          data || [],
      },
    );
  } catch (error) {
    console.error(
      'SELL SUBMISSIONS GET ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not load your selling items.',
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================
   SUBMIT SELL REQUEST
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
    const body =
      await request.json();

    const id =
      String(
        body?.id ||
          '',
      );

    const sellerName =
      String(
        body?.sellerName ||
          '',
      ).trim();

    const phone =
      String(
        body?.phone ||
          '',
      ).trim();

    const itemName =
      String(
        body?.itemName ||
          '',
      ).trim();

    const category =
      String(
        body?.category ||
          '',
      ).trim();

    const brand =
      String(
        body?.brand ||
          '',
      ).trim();

    const size =
      String(
        body?.size ||
          '',
      ).trim();

    const condition =
      String(
        body?.condition ||
          '',
      );

    const description =
      String(
        body?.description ||
          '',
      ).trim();

    const deliveryMethod =
      String(
        body?.deliveryMethod ||
          '',
      );

    const sellerNotes =
      String(
        body?.sellerNotes ||
          '',
      ).trim();

    const expectedPriceRaw =
      String(
        body?.expectedPrice ||
          '',
      ).trim();

    const images =
      Array.isArray(
        body?.images,
      )
        ? body.images
            .map(
              String,
            )
            .filter(
              Boolean,
            )
            .slice(
              0,
              5,
            )
        : [];

    const imagePaths =
      Array.isArray(
        body?.imagePaths,
      )
        ? body.imagePaths
            .map(
              String,
            )
            .filter(
              (
                path: string,
              ) =>
                path.startsWith(
                  `${user.id}/${id}/`,
                ),
            )
            .slice(
              0,
              5,
            )
        : [];

    if (
      !isUuid(id)
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

    if (
      !sellerName ||
      !phone ||
      !itemName ||
      !category ||
      !description
    ) {
      return NextResponse.json(
        {
          error:
            'Please complete all required fields.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      sellerName.length >
        120 ||
      phone.length >
        40 ||
      itemName.length >
        160 ||
      category.length >
        100 ||
      brand.length >
        100 ||
      size.length >
        60 ||
      description.length >
        5000 ||
      sellerNotes.length >
        3000
    ) {
      return NextResponse.json(
        {
          error:
            'One or more fields are too long.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !VALID_CONDITIONS.has(
        condition,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid item condition.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !VALID_DELIVERY_METHODS.has(
        deliveryMethod,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid item handoff method.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      images.length < 1 ||
      images.length > 5
    ) {
      return NextResponse.json(
        {
          error:
            'Please upload between 1 and 5 photos.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      imagePaths.length !==
      images.length
    ) {
      return NextResponse.json(
        {
          error:
            'Uploaded photo information is incomplete.',
        },
        {
          status: 400,
        },
      );
    }

    let expectedPrice:
      number | null =
      null;

    if (
      expectedPriceRaw
    ) {
      const parsed =
        Number(
          expectedPriceRaw,
        );

      if (
        !Number.isFinite(
          parsed,
        ) ||
        parsed < 0
      ) {
        return NextResponse.json(
          {
            error:
              'Expected price must be a valid amount.',
          },
          {
            status: 400,
          },
        );
      }

      expectedPrice =
        Math.round(
          parsed *
            100,
        ) / 100;
    }

    const email =
      user.email?.trim();

    if (!email) {
      return NextResponse.json(
        {
          error:
            'Your account does not have an email address.',
        },
        {
          status: 400,
        },
      );
    }

    const {
      data,
      error:
        insertError,
    } =
      await supabase
        .from(
          'sell_submissions',
        )
        .insert({
          id,

          user_id:
            user.id,

          seller_name:
            sellerName,

          email,

          phone,

          item_name:
            itemName,

          category,

          brand:
            brand ||
            null,

          size:
            size ||
            null,

          condition,

          description,

          expected_price:
            expectedPrice,

          images,

          delivery_method:
            deliveryMethod,

          seller_notes:
            sellerNotes ||
            null,

          status:
            'Submitted',

          payout_status:
            'Not Due',
        })
        .select(
          'id, status, created_at',
        )
        .single();

    if (
      insertError
    ) {
      if (
        imagePaths.length
      ) {
        await supabase.storage
          .from(
            BUCKET,
          )
          .remove(
            imagePaths,
          );
      }

      return NextResponse.json(
        {
          error:
            `Could not submit item: ${insertError.message}`,
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

        id:
          data.id,

        status:
          data.status,

        createdAt:
          data.created_at,
      },
    );
  } catch (error) {
    console.error(
      'SELL SUBMISSION ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not submit your item.',
      },
      {
        status: 500,
      },
    );
  }
}