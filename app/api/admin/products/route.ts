import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ADMIN_COOKIE,
  verifyAdminToken,
} from '@/lib/admin-auth';

import { getSupabaseAdmin } from '@/lib/supabase';

import {
  isUuid,
  productFromRow,
} from '@/lib/product-db';

import { Product } from '@/lib/types';

export const runtime = 'nodejs';

/* =========================================
   ADMIN AUTH
   ========================================= */

async function requireAdmin() {
  const cookieStore = await cookies();

  return verifyAdminToken(
    cookieStore.get(ADMIN_COOKIE)?.value,
  );
}

/* =========================================
   PRODUCT -> SUPABASE ROW
   ========================================= */

function makeRow(product: Product) {
  return {
    slug: product.slug,
    name: product.name,

    description:
      product.description || '',

    price:
      Number(product.price),

    compare_at:
      product.compareAt ?? null,

    category:
      product.category,

    size:
      product.size,

    condition:
      product.condition,

    brand:
      product.brand,

    measurements:
      product.measurements || {},

    images:
      product.images || [],

    inventory:
      Number(product.inventory || 0),

    shipping_fee:
      product.freeShipping
        ? 0
        : product.shippingFee == null
          ? null
          : Number(
              product.shippingFee,
            ),

    free_shipping:
      Boolean(
        product.freeShipping,
      ),

    one_of_one:
      Boolean(product.oneOfOne),

    new_arrival:
      Boolean(product.newArrival),

    vintage_find:
      Boolean(product.vintageFind),

    featured:
      Boolean(product.featured),

    active: true,

    tiktok_url:
      product.tiktokUrl || null,
  };
}

/* =========================================
   SUPABASE STORAGE IMAGE PARSER
   ========================================= */

/*
Example:

https://PROJECT.supabase.co/storage/v1/object/public/product-images/products/photo.jpg

Returns:

{
  bucket: 'product-images',
  path: 'products/photo.jpg'
}

Local files such as:

/noupload.png

are ignored.
*/

function getSupabaseStorageObject(
  imageUrl?: string | null,
) {
  if (!imageUrl) {
    return null;
  }

  /*
   * Local public files are NOT
   * Supabase Storage files.
   */
  if (
    imageUrl.startsWith('/') ||
    imageUrl.startsWith('blob:') ||
    imageUrl.startsWith('data:')
  ) {
    return null;
  }

  try {
    const parsed =
      new URL(imageUrl);

    /*
     * Extra safety:
     * only delete files belonging
     * to this Supabase project.
     */
    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    if (supabaseUrl) {
      const supabaseHost =
        new URL(
          supabaseUrl,
        ).hostname;

      if (
        parsed.hostname !==
        supabaseHost
      ) {
        return null;
      }
    } else if (
      !parsed.hostname.endsWith(
        '.supabase.co',
      )
    ) {
      return null;
    }

    /*
     * Supports URLs such as:
     *
     * /storage/v1/object/public/bucket/path
     * /storage/v1/object/sign/bucket/path
     * /storage/v1/object/authenticated/bucket/path
     */

    const match =
      parsed.pathname.match(
        /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
      );

    if (!match) {
      return null;
    }

    const bucket =
      decodeURIComponent(
        match[1],
      );

    const path =
      decodeURIComponent(
        match[2],
      );

    if (
      !bucket ||
      !path
    ) {
      return null;
    }

    return {
      bucket,
      path,
    };
  } catch {
    return null;
  }
}

/* =========================================
   SAVE / UPDATE PRODUCT
   ========================================= */

export async function POST(
  req: Request,
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
      await req.json();

    const product =
      body?.product as
        | Product
        | undefined;

    if (
      !product ||
      !product.name?.trim() ||
      !product.slug?.trim() ||
      !product.category?.trim() ||
      !product.brand?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            'Product name, slug, category, and brand are required.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(
        Number(
          product.price,
        ),
      ) ||
      Number(
        product.price,
      ) < 0
    ) {
      return NextResponse.json(
        {
          error:
            'Enter a valid product price.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(
        Number(
          product.inventory,
        ),
      ) ||
      Number(
        product.inventory,
      ) < 0
    ) {
      return NextResponse.json(
        {
          error:
            'Enter a valid inventory amount.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      !product.freeShipping &&
      product.shippingFee != null &&
      (
        !Number.isFinite(
          Number(
            product.shippingFee,
          ),
        ) ||
        Number(
          product.shippingFee,
        ) < 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Enter a valid shipping fee.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      product.oneOfOne &&
      Number(
        product.inventory,
      ) > 1
    ) {
      return NextResponse.json(
        {
          error:
            'One-of-One products can only have inventory 0 or 1.',
        },
        {
          status: 400,
        },
      );
    }

    const row =
      makeRow(product);

    let result;

    if (
      isUuid(
        product.id,
      )
    ) {
      result =
        await supabase
          .from(
            'products',
          )
          .upsert(
            {
              id:
                product.id,

              ...row,
            },
            {
              onConflict:
                'id',
            },
          )
          .select('*')
          .single();
    } else {
      /*
       * Old local products used
       * custom IDs.
       *
       * Save by slug so Supabase
       * creates a real UUID.
       */

      result =
        await supabase
          .from(
            'products',
          )
          .upsert(
            row,
            {
              onConflict:
                'slug',
            },
          )
          .select('*')
          .single();
    }

    if (
      result.error
    ) {
      return NextResponse.json(
        {
          error:
            `Could not save product: ${result.error.message}`,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        product:
          productFromRow(
            result.data,
          ),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not save product.',
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================
   DELETE PRODUCT + STORAGE IMAGE
   ========================================= */

export async function DELETE(
  req: Request,
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

  const id =
    new URL(
      req.url,
    ).searchParams.get(
      'id',
    ) || '';

  /*
   * Old local-only IDs were
   * never stored in Supabase.
   */

  if (!isUuid(id)) {
    return NextResponse.json(
      {
        success: true,
      },
    );
  }

  try {
    /* ---------------------------------
       1. Load images BEFORE deletion
       --------------------------------- */

    const {
      data: product,
      error: loadError,
    } =
      await supabase
        .from(
          'products',
        )
        .select(
          'id, images',
        )
        .eq(
          'id',
          id,
        )
        .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        {
          error:
            `Could not load product: ${loadError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Product already removed.
     */

    if (!product) {
      return NextResponse.json(
        {
          success: true,
        },
      );
    }

    const images =
      Array.isArray(
        product.images,
      )
        ? product.images.map(
            String,
          )
        : [];

    /* ---------------------------------
       2. Delete product row
       --------------------------------- */

    const {
      error: deleteError,
    } =
      await supabase
        .from(
          'products',
        )
        .delete()
        .eq(
          'id',
          id,
        );

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            `Could not delete product: ${deleteError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    /* ---------------------------------
       3. Identify Storage files
       --------------------------------- */

    const storageFiles =
      images
        .map(
          getSupabaseStorageObject,
        )
        .filter(
          (
            item,
          ): item is {
            bucket: string;
            path: string;
          } =>
            item !== null,
        );

    /*
     * Group paths by bucket.
     */

    const filesByBucket =
      new Map<
        string,
        string[]
      >();

    for (
      const file of
      storageFiles
    ) {
      const existing =
        filesByBucket.get(
          file.bucket,
        ) || [];

      /*
       * Avoid duplicate paths.
       */

      if (
        !existing.includes(
          file.path,
        )
      ) {
        existing.push(
          file.path,
        );
      }

      filesByBucket.set(
        file.bucket,
        existing,
      );
    }

    /* ---------------------------------
       4. Delete Storage objects
       --------------------------------- */

    const cleanupErrors:
      string[] = [];

    let deletedFiles = 0;

    for (
      const [
        bucket,
        paths,
      ] of filesByBucket
    ) {
      const {
        error:
          storageError,
      } =
        await supabase.storage
          .from(
            bucket,
          )
          .remove(
            paths,
          );

      if (
        storageError
      ) {
        console.error(
          'PRODUCT STORAGE CLEANUP ERROR:',
          {
            bucket,
            paths,
            error:
              storageError,
          },
        );

        cleanupErrors.push(
          storageError.message,
        );
      } else {
        deletedFiles +=
          paths.length;
      }
    }

    /* ---------------------------------
       5. Return success
       --------------------------------- */

    return NextResponse.json(
      {
        success: true,

        storageDeleted:
          cleanupErrors.length ===
          0,

        deletedStorageFiles:
          deletedFiles,

        storageCleanupErrors:
          cleanupErrors,
      },
    );
  } catch (error) {
    console.error(
      'DELETE PRODUCT ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Could not delete product.',
      },
      {
        status: 500,
      },
    );
  }
}