'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import { useSearchParams } from 'next/navigation';

import ProductGrid from '@/components/product-grid';
import { useStore } from '@/components/store-provider';

function ShopContent() {
  const { products, ready } = useStore();

  const searchParams = useSearchParams();

  const urlCategory =
    searchParams.get('category') || '';

  const urlSort =
    searchParams.get('sort') || '';

  const initialSort = [
    'featured',
    'newest',
    'price-low',
    'price-high',
  ].includes(urlSort)
    ? urlSort
    : 'featured';

  const [q, setQ] = useState('');

  const [category, setCategory] =
    useState(urlCategory || 'All');

  const [size, setSize] =
    useState('All');

  const [condition, setCondition] =
    useState('All');

  const [brand, setBrand] =
    useState('All');

  const [maxPrice, setMaxPrice] =
    useState<number | null>(null);

  const [sort, setSort] =
    useState(initialSort);

  const [showFilters, setShowFilters] =
    useState(false);

  useEffect(() => {
    setCategory(
      urlCategory || 'All',
    );
  }, [urlCategory]);

  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  /*
   * UNIQUE FILTER VALUES
   */
  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map(
              (product) =>
                product.brand,
            )
            .filter(Boolean),
        ),
      ).sort(),
    [products],
  );

  const sizes = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map(
              (product) =>
                product.size,
            )
            .filter(Boolean),
        ),
      ).sort(),
    [products],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map(
              (product) =>
                product.category,
            )
            .filter(Boolean),
        ),
      ).sort(),
    [products],
  );

  const storeMaxPrice =
    useMemo(() => {
      const highest =
        products.reduce(
          (
            current,
            product,
          ) =>
            Math.max(
              current,
              product.price,
            ),
          0,
        );

      return Math.max(
        1000,
        Math.ceil(highest / 100) *
          100,
      );
    }, [products]);

  const effectiveMaxPrice =
    maxPrice ?? storeMaxPrice;

  /*
   * FILTER PRODUCTS
   */
  const filtered = useMemo(() => {
    const search =
      q.trim().toLowerCase();

    const list = products.filter(
      (product) => {
        const matchesPrice =
          product.price <=
          effectiveMaxPrice;

        const matchesCategory =
          category === 'All' ||
          product.category.toLowerCase() ===
            category.toLowerCase();

        const matchesSize =
          size === 'All' ||
          product.size === size;

        const matchesCondition =
          condition === 'All' ||
          product.condition ===
            condition;

        const matchesBrand =
          brand === 'All' ||
          product.brand === brand;

        const searchableText =
          `${product.name} ${product.brand} ${product.category}`.toLowerCase();

        const matchesSearch =
          !search ||
          searchableText.includes(
            search,
          );

        return (
          matchesPrice &&
          matchesCategory &&
          matchesSize &&
          matchesCondition &&
          matchesBrand &&
          matchesSearch
        );
      },
    );

    const sorted = [...list];

    if (sort === 'price-low') {
      sorted.sort(
        (a, b) =>
          a.price - b.price,
      );
    }

    if (sort === 'price-high') {
      sorted.sort(
        (a, b) =>
          b.price - a.price,
      );
    }

    if (sort === 'newest') {
      sorted.sort((a, b) =>
        b.createdAt.localeCompare(
          a.createdAt,
        ),
      );
    }

    if (sort === 'featured') {
      sorted.sort(
        (a, b) =>
          Number(b.featured) -
          Number(a.featured),
      );
    }

    return sorted;
  }, [
    products,
    q,
    category,
    size,
    condition,
    brand,
    effectiveMaxPrice,
    sort,
  ]);

  /*
   * CLEAR FILTERS
   */
  function clearFilters() {
    setCategory(
      urlCategory || 'All',
    );

    setSize('All');
    setCondition('All');
    setBrand('All');
    setMaxPrice(null);
    setQ('');
    setSort(initialSort);
  }

  /*
   * PAGE HEADING
   */
  let eyebrow =
    'The rack is open';

  let title =
    'Shop all finds.';

  let description =
    'Browse every available product in the store. Each item is photographed, measured, and condition-checked.';

  if (
    urlCategory.toLowerCase() ===
    'brand new product'
  ) {
    eyebrow =
      'Fresh from the rack';

    title =
      'Brand New Products.';

    description =
      'Shop brand new products available in our store.';
  }

  if (
    urlCategory.toLowerCase() ===
    'used product'
  ) {
    eyebrow =
      'Secondhand finds';

    title =
      'Used Products.';

    description =
      'Shop pre-loved and used products ready for their next story.';
  }

  /*
   * FILTER CONTENT
   *
   * Important:
   * This contains only the controls.
   * Desktop and mobile wrappers are
   * rendered separately below.
   */
  const filterContent = (
    <>
      {/* CATEGORY */}
      <div className="filter-group">
        <h4>Category</h4>

        <select
          className="control"
          value={category}
          onChange={(event) =>
            setCategory(
              event.target.value,
            )
          }
        >
          <option value="All">
            All
          </option>

          {categories.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ),
          )}
        </select>
      </div>

      {/* PRICE */}
      <div className="filter-group">
        <h4>Price up to</h4>

        <input
          type="range"
          min="0"
          max={storeMaxPrice}
          step="100"
          value={effectiveMaxPrice}
          onChange={(event) =>
            setMaxPrice(
              Number(
                event.target.value,
              ),
            )
          }
          style={{
            width: '100%',
          }}
        />

        <label>
          Rs.{' '}
          {effectiveMaxPrice.toLocaleString()}
        </label>
      </div>

      {/* SIZE */}
      <div className="filter-group">
        <h4>Size</h4>

        <select
          className="control"
          value={size}
          onChange={(event) =>
            setSize(
              event.target.value,
            )
          }
        >
          <option value="All">
            All
          </option>

          {sizes.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ),
          )}
        </select>
      </div>

      {/* CONDITION */}
      <div className="filter-group">
        <h4>Condition</h4>

        <select
          className="control"
          value={condition}
          onChange={(event) =>
            setCondition(
              event.target.value,
            )
          }
        >
          <option value="All">
            All
          </option>

          {[
            'Like New',
            'Excellent',
            'Good',
            'Fair',
          ].map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* BRAND */}
      <div className="filter-group">
        <h4>Brand</h4>

        <select
          className="control"
          value={brand}
          onChange={(event) =>
            setBrand(
              event.target.value,
            )
          }
        >
          <option value="All">
            All
          </option>

          {brands.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ),
          )}
        </select>
      </div>

      {/* CLEAR */}
      <button
        type="button"
        className="btn ghost"
        style={{
          width: '100%',
        }}
        onClick={clearFilters}
      >
        Clear filters
      </button>
    </>
  );

  if (!ready) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h3>
            Loading products…
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* HERO */}
      <div className="page-hero">
        <span className="eyebrow">
          {eyebrow}
        </span>

        <h1>{title}</h1>

        <p>{description}</p>
      </div>

      <div className="shop-layout">
        {/* DESKTOP FILTER ONLY */}
        <aside className="filter-panel desktop-filter-panel">
          {filterContent}
        </aside>

        <div>
          {/* TOP BAR */}
          <div className="shop-topbar">
            <div className="search-wrap">
              <Search size={18} />

              <input
                className="control"
                value={q}
                onChange={(event) =>
                  setQ(
                    event.target.value,
                  )
                }
                placeholder="Search products, brands, categories..."
              />
            </div>

            {/* MOBILE FILTER BUTTON */}
            <button
              type="button"
              className="btn ghost mobile-filter"
              onClick={() =>
                setShowFilters(
                  (value) =>
                    !value,
                )
              }
            >
              <SlidersHorizontal
                size={17}
              />

              {showFilters
                ? 'Hide filters'
                : 'Filters'}
            </button>

            {/* SORT */}
            <select
              className="control"
              style={{
                maxWidth: 200,
              }}
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value,
                )
              }
            >
              <option value="featured">
                Featured
              </option>

              <option value="newest">
                Newest
              </option>

              <option value="price-low">
                Price: low to high
              </option>

              <option value="price-high">
                Price: high to low
              </option>
            </select>
          </div>

          {/* MOBILE FILTER ONLY */}
          {showFilters && (
            <div className="mobile-filter-panel">
              {filterContent}
            </div>
          )}

          {/* RESULT COUNT */}
          <div className="result-count">
            {filtered.length}{' '}
            {filtered.length === 1
              ? 'product'
              : 'products'}
          </div>

          {/* PRODUCTS */}
          {filtered.length > 0 ? (
            <ProductGrid
              products={filtered}
            />
          ) : (
            <div className="empty-state">
              <h3>
                No products found.
              </h3>

              <p>
                Try clearing a filter
                or searching a broader
                term.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="container content-page">
          <div className="empty-state">
            <h3>
              Loading products…
            </h3>
          </div>
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
