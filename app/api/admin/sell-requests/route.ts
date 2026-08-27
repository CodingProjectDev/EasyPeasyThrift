import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ADMIN_COOKIE,
  verifyAdminToken,
} from '@/lib/admin-auth';

import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/* =========================================
   ADMIN AUTH
========================================= */

async function requireAdmin() {
  const cookieStore =
    await cookies();

  return verifyAdminToken(
    cookieStore.get(
      ADMIN_COOKIE,
    )?.value,
  );
}

/* =========================================
   HELPERS
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

function makeSlug(
  value: string,
) {
  const base =
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )
      .replace(
        /^-|-$/g,
        '',
      )
      .slice(
        0,
        70,
      ) ||
    'product';

  return `${base}-${Date.now()
    .toString()
    .slice(-6)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function roundMoney(
  value: number,
) {
  return (
    Math.round(
      value * 100,
    ) / 100
  );
}

/* =========================================
   GET ALL SELL REQUESTS
========================================= */

export async function GET() {
  if (
    !(await requireAdmin())
  ) {
    return NextResponse.json(
      {
        error:
          'Admin login required.',
      },
      {
        status: 401,
      },
    );
  }

  const supabase =
    getSupabaseAdmin();

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

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'sell_submissions',
        )
        .select('*')
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
            `Could not load sell requests: ${error.message}`,
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
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not load sell requests.',
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================
   UPDATE SELL REQUEST
========================================= */

export async function PATCH(
  request: Request,
) {
  if (
    !(await requireAdmin())
  ) {
    return NextResponse.json(
      {
        error:
          'Admin login required.',
      },
      {
        status: 401,
      },
    );
  }

  const supabase =
    getSupabaseAdmin();

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

  try {
    const body =
      await request.json();

    const id =
      String(
        body?.id || '',
      );

    const action =
      String(
        body?.action || '',
      );

    if (!isUuid(id)) {
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

    const {
      data:
        submission,
      error:
        loadError,
    } =
      await supabase
        .from(
          'sell_submissions',
        )
        .select('*')
        .eq(
          'id',
          id,
        )
        .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        {
          error:
            loadError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!submission) {
      return NextResponse.json(
        {
          error:
            'Sell request not found.',
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================
       UNDER REVIEW
    ====================================== */

    if (
      action ===
      'under-review'
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'sell_submissions',
          )
          .update({
            status:
              'Under Review',

            reviewed_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            id,
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      return NextResponse.json(
        {
          submission:
            data,
        },
      );
    }

    /* =====================================
       APPROVE
    ====================================== */

    if (
      action ===
      'approve'
    ) {
      const approvedPrice =
        Number(
          body?.approvedPrice,
        );

      const sellerPercentage =
        Number(
          body?.sellerPercentage,
        );

      if (
        !Number.isFinite(
          approvedPrice,
        ) ||
        approvedPrice <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'Enter a valid approved selling price.',
          },
          {
            status: 400,
          },
        );
      }

      if (
        !Number.isFinite(
          sellerPercentage,
        ) ||
        sellerPercentage <
          0 ||
        sellerPercentage >
          100
      ) {
        return NextResponse.json(
          {
            error:
              'Seller percentage must be between 0 and 100.',
          },
          {
            status: 400,
          },
        );
      }

      const sellerEarning =
        roundMoney(
          approvedPrice *
            (sellerPercentage /
              100),
        );

      const storeEarning =
        roundMoney(
          approvedPrice -
            sellerEarning,
        );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'sell_submissions',
          )
          .update({
            status:
              'Approved',

            approved_price:
              approvedPrice,

            seller_percentage:
              sellerPercentage,

            seller_earning:
              sellerEarning,

            store_earning:
              storeEarning,

            rejection_reason:
              null,

            reviewed_at:
              new Date()
                .toISOString(),

            payout_status:
              'Not Due',
          })
          .eq(
            'id',
            id,
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      return NextResponse.json(
        {
          submission:
            data,
        },
      );
    }

    /* =====================================
       REJECT
    ====================================== */

    if (
      action ===
      'reject'
    ) {
      const reason =
        String(
          body?.rejectionReason ||
            '',
        ).trim();

      if (!reason) {
        return NextResponse.json(
          {
            error:
              'Enter a reason for rejecting this item.',
          },
          {
            status: 400,
          },
        );
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'sell_submissions',
          )
          .update({
            status:
              'Rejected',

            rejection_reason:
              reason,

            reviewed_at:
              new Date()
                .toISOString(),

            payout_status:
              'Not Due',
          })
          .eq(
            'id',
            id,
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      return NextResponse.json(
        {
          submission:
            data,
        },
      );
    }

    /* =====================================
       CONVERT APPROVED ITEM TO PRODUCT
    ====================================== */

    if (
      action === 'list'
    ) {
      if (
        submission.product_id
      ) {
        return NextResponse.json(
          {
            error:
              'This submission is already connected to a product.',
          },
          {
            status: 400,
          },
        );
      }

      if (
        submission.status !==
          'Approved' ||
        !submission.approved_price
      ) {
        return NextResponse.json(
          {
            error:
              'Approve the item and set its selling price before listing it.',
          },
          {
            status: 400,
          },
        );
      }

      const images =
        Array.isArray(
          submission.images,
        )
          ? submission.images.map(
              String,
            )
          : [];

      const productRow = {
        slug:
          makeSlug(
            String(
              submission.item_name,
            ),
          ),

        name:
          String(
            submission.item_name,
          ),

        description:
          String(
            submission.description ||
              '',
          ),

        price:
          Number(
            submission.approved_price,
          ),

        compare_at:
          null,

        category:
          String(
            submission.category ||
              'Other',
          ),

        size:
          String(
            submission.size ||
              'N/A',
          ),

        condition:
          String(
            submission.condition ||
              'Good',
          ),

        brand:
          String(
            submission.brand ||
              'Unbranded',
          ),

        measurements:
          {},

        images:
          images.length
            ? images
            : [
                '/noupload.png',
              ],

        inventory: 1,

        one_of_one:
          true,

        new_arrival:
          true,

        vintage_find:
          false,

        featured:
          false,

        active:
          true,

        tiktok_url:
          null,
      };

      const {
        data:
          product,
        error:
          productError,
      } =
        await supabase
          .from(
            'products',
          )
          .insert(
            productRow,
          )
          .select('*')
          .single();

      if (
        productError ||
        !product
      ) {
        return NextResponse.json(
          {
            error:
              `Could not create product: ${
                productError
                  ?.message ||
                'Unknown error'
              }`,
          },
          {
            status: 500,
          },
        );
      }

      const {
        data:
          updatedSubmission,
        error:
          updateError,
      } =
        await supabase
          .from(
            'sell_submissions',
          )
          .update({
            status:
              'Listed',

            product_id:
              product.id,
          })
          .eq(
            'id',
            id,
          )
          .select('*')
          .single();

      if (updateError) {
        /*
         * Avoid leaving an orphan
         * product if linking fails.
         */
        await supabase
          .from(
            'products',
          )
          .delete()
          .eq(
            'id',
            product.id,
          );

        throw updateError;
      }

      return NextResponse.json(
        {
          submission:
            updatedSubmission,

          product,
        },
      );
    }

    /* =====================================
       MARK SOLD
    ====================================== */

    if (
      action === 'sold'
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'sell_submissions',
          )
          .update({
            status:
              'Sold',

            payout_status:
              'Pending',
          })
          .eq(
            'id',
            id,
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      return NextResponse.json(
        {
          submission:
            data,
        },
      );
    }

    /* =====================================
       PAYOUT PENDING
    ====================================== */

    if (
      action ===
      'payout-pending'
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'sell_submissions',
          )
          .update({
            status:
              'Payout Pending',

            payout_status:
              'Pending',
          })
          .eq(
            'id',
            id,
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      return NextResponse.json(
        {
          submission:
            data,
        },
      );
    }

    /* =====================================
       MARK PAID
    ====================================== */

    if (
      action === 'paid'
    ) {
      const payoutMethod =
        String(
          body?.payoutMethod ||
            '',
        ).trim();

      const payoutReference =
        String(
          body?.payoutReference ||
            '',
        ).trim();

      if (!payoutMethod) {
        return NextResponse.json(
          {
            error:
              'Enter the payout method.',
          },
          {
            status: 400,
          },
        );
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'sell_submissions',
          )
          .update({
            status:
              'Paid',

            payout_status:
              'Paid',

            payout_method:
              payoutMethod,

            payout_reference:
              payoutReference ||
              null,

            paid_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            id,
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      return NextResponse.json(
        {
          submission:
            data,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          'Invalid admin action.',
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      'ADMIN SELL REQUEST ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not update sell request.',
      },
      {
        status: 500,
      },
    );
  }
}