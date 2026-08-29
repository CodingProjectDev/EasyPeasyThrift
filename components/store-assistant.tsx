'use client';

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Bot,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';

import {
  usePathname,
  useRouter,
} from 'next/navigation';

import {
  useStore,
} from '@/components/store-provider';

import {
  createClient,
} from '@/lib/supabase/client';

/* =========================================
   TYPES
========================================= */

type ChatAction = {
  label: string;
  path?: string;
  whatsapp?: boolean;
  message?: string;
  logout?: boolean;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'customer';
  text: string;
  greeting?: boolean;
  actions?: ChatAction[];
};

type AssistantReply = {
  text: string;
  actions?: ChatAction[];
};

/* =========================================
   COMPONENT
========================================= */

export default function StoreAssistant() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const {
    settings,
    products,
  } = useStore();

  const [open, setOpen] =
    useState(false);

  const [input, setInput] =
    useState('');

  const [
    customerName,
    setCustomerName,
  ] = useState('');

  const [
    loggedIn,
    setLoggedIn,
  ] = useState(false);

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        'Hi! 👋 How can I help you today?',
      greeting: true,
    },
  ]);

  const messagesRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /* =========================================
     CUSTOMER LOGIN + NAME
  ========================================= */

  useEffect(() => {
    const supabase =
      createClient();

    let active = true;

    async function loadNameFromUser(
      user: any,
    ) {
      if (!user) {
        if (active) {
          setCustomerName('');
          setLoggedIn(false);
        }

        return;
      }

      if (active) {
        setLoggedIn(true);
      }

      /*
       * First try Supabase Auth metadata.
       */
      let name = String(
        user.user_metadata
          ?.full_name ||
          user.user_metadata
            ?.name ||
          '',
      ).trim();

      /*
       * Otherwise try latest order.
       */
      if (!name) {
        const {
          data: latestOrder,
        } =
          await supabase
            .from('orders')
            .select(
              'full_name',
            )
            .eq(
              'customer_id',
              user.id,
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              },
            )
            .limit(1)
            .maybeSingle();

        name = String(
          latestOrder
            ?.full_name ||
            '',
        ).trim();
      }

      if (active) {
        setCustomerName(
          name,
        );
      }
    }

    async function loadCustomer() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      await loadNameFromUser(
        user,
      );
    }

    void loadCustomer();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session,
        ) => {
          if (
            !session?.user
          ) {
            setLoggedIn(
              false,
            );

            setCustomerName(
              '',
            );

            return;
          }

          setLoggedIn(true);

          void loadNameFromUser(
            session.user,
          );
        },
      );

    return () => {
      active = false;

      subscription.unsubscribe();
    };
  }, []);

  /* =========================================
     AUTO SCROLL
  ========================================= */

  useEffect(() => {
    if (
      !messagesRef.current
    ) {
      return;
    }

    messagesRef.current.scrollTop =
      messagesRef.current
        .scrollHeight;
  }, [messages]);

  /* =========================================
     HIDE ON ADMIN
  ========================================= */

  if (
    pathname.startsWith(
      '/admin',
    )
  ) {
    return null;
  }

  /* =========================================
     HELPERS
  ========================================= */

  function createMessageId() {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  function normalize(
    value: string,
  ) {
    return value
      .toLowerCase()
      .trim();
  }

  function containsAny(
    text: string,
    phrases: string[],
  ) {
    return phrases.some(
      (phrase) =>
        text.includes(
          phrase,
        ),
    );
  }

  function money(
    value: number,
  ) {
    return `Rs. ${Number(
      value || 0,
    ).toLocaleString(
      'en-US',
    )}`;
  }

  /* =========================================
     PRODUCT HELPERS
  ========================================= */

  const availableProducts =
    products.filter(
      (product) =>
        Number(
          product.inventory ??
            0,
        ) > 0,
    );

  const categories =
    Array.from(
      new Set(
        products
          .map(
            (product) =>
              String(
                product.category ||
                  '',
              ).trim(),
          )
          .filter(Boolean),
      ),
    );

  const kidsCategory =
    categories.find(
      (category) =>
        containsAny(
          category.toLowerCase(),
          [
            'kid',
            'child',
            'baby',
          ],
        ),
    );

  function productPath(
    product: any,
  ) {
    return `/product/${product.slug}`;
  }

  function findCategory(
    text: string,
  ) {
    return categories.find(
      (category) =>
        text.includes(
          category.toLowerCase(),
        ),
    );
  }

  function findProduct(
    text: string,
  ) {
    /*
     * First: full product name.
     */
    const direct =
      availableProducts.find(
        (product) => {
          const name =
            normalize(
              String(
                product.name ||
                  '',
              ),
            );

          return (
            name.length >=
              3 &&
            text.includes(
              name,
            )
          );
        },
      );

    if (direct) {
      return direct;
    }

    /*
     * Then try important words.
     */
    const ignored =
      new Set([
        'show',
        'find',
        'want',
        'product',
        'products',
        'item',
        'items',
        'price',
        'cost',
        'size',
        'brand',
        'condition',
        'available',
        'availability',
        'measurement',
        'measurements',
        'photo',
        'photos',
        'image',
        'video',
        'discount',
        'sale',
        'buy',
        'shop',
        'what',
        'this',
        'that',
        'have',
        'does',
        'much',
      ]);

    const words =
      text
        .split(
          /[^a-z0-9]+/,
        )
        .filter(
          (word) =>
            word.length >=
              4 &&
            !ignored.has(
              word,
            ),
        );

    if (
      words.length === 0
    ) {
      return undefined;
    }

    return availableProducts.find(
      (product) => {
        const searchable =
          normalize(
            [
              product.name,
              product.brand,
              product.category,
            ]
              .filter(Boolean)
              .join(' '),
          );

        return words.some(
          (word) =>
            searchable.includes(
              word,
            ),
        );
      },
    );
  }

  function saleProducts() {
    return availableProducts.filter(
      (product) => {
        const oldPrice =
          Number(
            product.compareAt ||
              0,
          );

        const price =
          Number(
            product.price ||
              0,
          );

        return (
          oldPrice >
            0 &&
          oldPrice >
            price
        );
      },
    );
  }

  function salePercent(
    product: any,
  ) {
    const oldPrice =
      Number(
        product.compareAt ||
          0,
      );

    const price =
      Number(
        product.price ||
          0,
      );

    if (
      !oldPrice ||
      oldPrice <= price
    ) {
      return 0;
    }

    return Math.round(
      ((oldPrice - price) /
        oldPrice) *
        100,
    );
  }

  /* =========================================
     WHATSAPP
  ========================================= */

  function openWhatsApp() {
    const rawPhone =
      String(
        settings.storePhone ||
          '',
      );

    const phone =
      rawPhone.replace(
        /\D/g,
        '',
      );

    if (!phone) {
      addAssistantMessage(
        'Store WhatsApp is not available right now. Please use the Contact page instead.',
        [
          {
            label:
              'Contact Store',
            path:
              '/contact',
          },
        ],
      );

      return;
    }

    const message =
      encodeURIComponent(
        `Hi ${
          settings.storeName ||
          'EasyPeasy-Thrift'
        }! I need some help.`,
      );

    const url =
      `https://wa.me/${phone}?text=${message}`;

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );
  }

  /* =========================================
     MESSAGE HELPERS
  ========================================= */

  function addAssistantMessage(
    text: string,
    actions?: ChatAction[],
  ) {
    setMessages(
      (current) => [
        ...current,
        {
          id:
            createMessageId(),
          role:
            'assistant',
          text,
          actions,
        },
      ],
    );
  }

  /* =========================================
     ASSISTANT BRAIN
  ========================================= */

  function understand(
    message: string,
  ): AssistantReply {
    const text =
      normalize(message);

    /* ---------------------------------------
       GREETINGS
    ---------------------------------------- */

    if (
      [
        'hi',
        'hello',
        'hey',
        'hello there',
      ].includes(text)
    ) {
      return {
        text: customerName
          ? `Hi ${customerName}! 👋 I can help with shopping, orders, selling items, payments, shipping, your account, or connecting you with a real person.`
          : 'Hi! 👋 I can help with shopping, orders, selling items, payments, shipping, your account, or connecting you with a real person.',

        actions: [
          {
            label:
              'Shop',
            message:
              'I want to shop',
          },
          {
            label:
              'My Orders',
            message:
              'My orders',
          },
          {
            label:
              'Sell',
            message:
              'I want to sell an item',
          },
        ],
      };
    }

    /* ---------------------------------------
       WHAT CAN YOU DO?
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'what can you do',
          'what do you do',
          'help me',
          'features',
          'options',
          'menu',
          'help options',
        ],
      )
    ) {
      return {
        text:
          'I can help you shop, find products, check prices and discounts, access your cart or wishlist, track orders, understand payments and shipping, sell items, check selling status and payouts, manage account access, review returns, or contact a real person.',

        actions: [
          {
            label:
              'Shopping',
            message:
              'Shopping help',
          },
          {
            label:
              'Orders',
            message:
              'Order help',
          },
          {
            label:
              'Sell With Us',
            message:
              'Sell with us',
          },
          {
            label:
              'Account',
            message:
              'Account help',
          },
          {
            label:
              'Real person',
            whatsapp:
              true,
          },
        ],
      };
    }

    /* ---------------------------------------
       REAL PERSON
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'real person',
          'human',
          'agent',
          'associate',
          'representative',
          'whatsapp',
          'customer service',
        ],
      )
    ) {
      return {
        text:
          'Of course. You can talk directly with an EasyPeasy-Thrift associate on WhatsApp.',

        actions: [
          {
            label:
              'Talk to a real person',
            whatsapp:
              true,
          },
          {
            label:
              'Contact Store',
            path:
              '/contact',
          },
        ],
      };
    }

    /* ---------------------------------------
       FORGOT / RESET PASSWORD
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'forgot password',
          'reset password',
          'forgot my password',
          'cannot login',
          "can't login",
          'password',
          'password reset',
        ],
      )
    ) {
      return {
        text:
          'You can request a secure password reset link from the Forgot Password page.',

        actions: [
          {
            label:
              'Reset Password',
            path:
              '/forgot-password',
          },
          {
            label:
              'Login',
            path:
              '/login',
          },
        ],
      };
    }

    /* ---------------------------------------
       LOGIN / SIGN UP
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'login',
          'log in',
          'sign in',
          'signup',
          'sign up',
          'create account',
          'register',
        ],
      )
    ) {
      if (loggedIn) {
        return {
          text:
            'You are already signed in. You can open My Profile to manage your account.',

          actions: [
            {
              label:
                'My Profile',
              path:
                '/account',
            },
          ],
        };
      }

      return {
        text:
          'You can log in or create a new EasyPeasy account from the account page.',

        actions: [
          {
            label:
              'Login / Sign Up',
            path:
              '/login',
          },
        ],
      };
    }

    /* ---------------------------------------
       LOGOUT
    ---------------------------------------- */

    if (
      text === 'logout' ||
      text === 'log out' ||
      text === 'sign out'
    ) {
      if (!loggedIn) {
        return {
          text:
            'You are not currently signed in.',

          actions: [
            {
              label:
                'Login',
              path:
                '/login',
            },
          ],
        };
      }

      return {
        text:
          'You can sign out of your EasyPeasy account here.',

        actions: [
          {
            label:
              'Logout',
            logout:
              true,
          },
        ],
      };
    }

    /* ---------------------------------------
       SELLING ITEM STATUS
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'my selling items',
          'selling status',
          'sell status',
          'seller status',
          'item i am selling',
          'item i submitted',
          'my submission',
          'sell request',
          'payout status',
          'seller earning',
          'seller earnings',
          'how much will i earn',
        ],
      )
    ) {
      return {
        text:
          'You can track every item you submitted to EasyPeasy, including review status, approved price, seller share, earnings, listing status, sale status, and payout status.',

        actions: [
          {
            label:
              'My Selling Items',
            path:
              '/account/selling',
          },
          {
            label:
              'Sell Another Item',
            path:
              '/sell',
          },
        ],
      };
    }

    /* ---------------------------------------
       SELL STATUS DEFINITIONS
    ---------------------------------------- */

    if (
      text.includes(
        'under review',
      )
    ) {
      return {
        text:
          'Under Review means your submitted item is currently being reviewed by the EasyPeasy team. You’ll see the next status once a decision is made.',

        actions: [
          {
            label:
              'My Selling Items',
            path:
              '/account/selling',
          },
        ],
      };
    }

    if (
      text.includes(
        'payout pending',
      )
    ) {
      return {
        text:
          'Payout Pending means your item has reached the payout stage and payment to you has not yet been marked as completed.',

        actions: [
          {
            label:
              'Check Payout',
            path:
              '/account/selling',
          },
        ],
      };
    }

    if (
      containsAny(
        text,
        [
          'selling item rejected',
          'sell rejected',
          'submission rejected',
        ],
      )
    ) {
      return {
        text:
          'A rejected selling submission was not approved for listing. Check My Selling Items for the rejection reason.',

        actions: [
          {
            label:
              'My Selling Items',
            path:
              '/account/selling',
          },
        ],
      };
    }

    /* ---------------------------------------
       SELL WITH US
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'sell',
          'sell item',
          'sell my',
          'sell clothes',
          'sell shoes',
          'sell with us',
          'consignment',
          'submit item',
          'selling clothes',
        ],
      )
    ) {
      return {
        text:
          'You can submit a pre-loved item through Sell With Us. Add your item details, condition, expected price, delivery method, and photos. EasyPeasy will review it before listing.',

        actions: [
          {
            label:
              'Sell an Item',
            path:
              '/sell',
          },
          {
            label:
              'My Selling Items',
            path:
              '/account/selling',
          },
        ],
      };
    }

    /* ---------------------------------------
       PAYMENT REJECTED
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'payment rejected',
          'payment failed',
          'rejected payment',
        ],
      )
    ) {
      return {
        text:
          'Payment Rejected means the submitted payment could not be approved. Check your payment details and payment proof, then follow the instructions shown with your order.',

        actions: [
          {
            label:
              'My Orders',
            path:
              '/account/orders',
          },
          {
            label:
              'Contact Store',
            path:
              '/contact',
          },
        ],
      };
    }

    /* ---------------------------------------
       PAYMENT VERIFICATION
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'payment verification',
          'verification required',
          'verify payment',
        ],
      )
    ) {
      return {
        text:
          'Payment Verification Required means your payment information was received and an EasyPeasy associate will verify it shortly.',

        actions: [
          {
            label:
              'My Orders',
            path:
              '/account/orders',
          },
        ],
      };
    }

    /* ---------------------------------------
       ORDER PROCESSING
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'order processing',
          'processing order',
          'order approved',
          'payment approved',
        ],
      )
    ) {
      return {
        text:
          'Once payment is approved, your order moves into processing. You’ll be notified again when it is ready or shipped.',

        actions: [
          {
            label:
              'Check My Orders',
            path:
              '/account/orders',
          },
        ],
      };
    }

    /* ---------------------------------------
       SHIPPED / DELIVERED
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'shipped',
          'shipment status',
          'delivered',
          'delivery status',
        ],
      )
    ) {
      return {
        text:
          'You can see the latest shipping or delivery status directly inside My Orders.',

        actions: [
          {
            label:
              'Track My Order',
            path:
              '/account/orders',
          },
        ],
      };
    }

    /* ---------------------------------------
       ORDERS
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'order',
          'orders',
          'track',
          'where is my order',
          'latest order',
          'order status',
        ],
      )
    ) {
      return {
        text:
          'Your order history, payment status, order status, and delivery updates are available in My Orders.',

        actions: [
          {
            label:
              'View My Orders',
            path:
              '/account/orders',
          },
        ],
      };
    }

    /* ---------------------------------------
       PROFILE
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'profile',
          'account',
          'my information',
          'my info',
          'personal information',
        ],
      )
    ) {
      return {
        text:
          'You can view and manage your EasyPeasy account from My Profile.',

        actions: [
          {
            label:
              'My Profile',
            path:
              '/account',
          },
          {
            label:
              'My Orders',
            path:
              '/account/orders',
          },
          {
            label:
              'My Selling Items',
            path:
              '/account/selling',
          },
        ],
      };
    }

    /* ---------------------------------------
       WISHLIST
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'wishlist',
          'favorite',
          'favourite',
          'saved item',
          'saved products',
        ],
      )
    ) {
      return {
        text:
          'Your saved products are available in Wishlist.',

        actions: [
          {
            label:
              'View Wishlist',
            path:
              '/wishlist',
          },
        ],
      };
    }

    /* ---------------------------------------
       CART
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'cart',
          'shopping bag',
          'bag items',
        ],
      )
    ) {
      return {
        text:
          'You can review your selected products, quantities, product discounts, and subtotal in your cart.',

        actions: [
          {
            label:
              'View Cart',
            path:
              '/cart',
          },
          {
            label:
              'Continue Shopping',
            path:
              '/shop',
          },
        ],
      };
    }

    /* ---------------------------------------
       CHECKOUT
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'checkout',
          'buy now',
          'place order',
          'complete order',
        ],
      )
    ) {
      return {
        text:
          'Add the product to your cart and continue through checkout to enter delivery and payment information.',

        actions: [
          {
            label:
              'Go to Cart',
            path:
              '/cart',
          },
        ],
      };
    }

    /* ---------------------------------------
       PRODUCT MATCH
    ---------------------------------------- */

    const product =
      findProduct(text);

    if (product) {
      const name =
        String(
          product.name ||
            'Product',
        );

      const price =
        Number(
          product.price ||
            0,
        );

      const oldPrice =
        Number(
          product.compareAt ||
            0,
        );

      const inventory =
        Number(
          product.inventory ||
            0,
        );

      if (
        containsAny(
          text,
          [
            'price',
            'cost',
            'how much',
          ],
        )
      ) {
        if (
          oldPrice >
          price
        ) {
          return {
            text:
              `${name} is currently ${money(
                price,
              )}, reduced from ${money(
                oldPrice,
              )}. That is approximately ${salePercent(
                product,
              )}% off.`,

            actions: [
              {
                label:
                  'View Product',
                path:
                  productPath(
                    product,
                  ),
              },
            ],
          };
        }

        return {
          text:
            `${name} is currently ${money(
              price,
            )}.`,

          actions: [
            {
              label:
                'View Product',
              path:
                productPath(
                  product,
                ),
            },
          ],
        };
      }

      if (
        containsAny(
          text,
          [
            'available',
            'availability',
            'in stock',
            'sold out',
          ],
        )
      ) {
        return {
          text:
            inventory >
            0
              ? `${name} is currently available.`
              : `${name} is currently unavailable.`,

          actions: [
            {
              label:
                'View Product',
              path:
                productPath(
                  product,
                ),
            },
          ],
        };
      }

      if (
        text.includes(
          'size',
        )
      ) {
        return {
          text:
            product.size
              ? `${name} is listed as size ${product.size}.`
              : `Open ${name} to see its available size information.`,

          actions: [
            {
              label:
                'View Product',
              path:
                productPath(
                  product,
                ),
            },
          ],
        };
      }

      if (
        text.includes(
          'condition',
        )
      ) {
        return {
          text:
            product.condition
              ? `${name} is listed in ${product.condition} condition.`
              : `Open ${name} for its condition notes.`,

          actions: [
            {
              label:
                'View Product',
              path:
                productPath(
                  product,
                ),
            },
          ],
        };
      }

      if (
        text.includes(
          'brand',
        )
      ) {
        return {
          text:
            product.brand
              ? `${name} is listed under the brand ${product.brand}.`
              : `Brand information for ${name} is available on the product page.`,

          actions: [
            {
              label:
                'View Product',
              path:
                productPath(
                  product,
                ),
            },
          ],
        };
      }

      if (
        containsAny(
          text,
          [
            'measurement',
            'measurements',
            'photo',
            'photos',
            'image',
            'images',
            'video',
            'tiktok',
            'description',
            'details',
          ],
        )
      ) {
        return {
          text:
            `Open ${name} to see its complete description, condition notes, measurements, photos, and any available product video.`,

          actions: [
            {
              label:
                'View Product',
              path:
                productPath(
                  product,
                ),
            },
          ],
        };
      }

      return {
        text:
          `${name} is currently available for ${money(
            price,
          )}. You can open the product to see all details.`,

        actions: [
          {
            label:
              `View ${name}`,
            path:
              productPath(
                product,
              ),
          },
        ],
      };
    }

    /* ---------------------------------------
       DISCOUNTS / SALE
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'discount',
          'discounted',
          'sale',
          'offer',
          'deals',
          'cheap',
          'clearance',
        ],
      )
    ) {
      const discounted =
        saleProducts().slice(
          0,
          3,
        );

      if (
        discounted.length >
        0
      ) {
        return {
          text:
            `I found ${discounted.length} discounted item${
              discounted.length ===
              1
                ? ''
                : 's'
            } you can check right now.`,

          actions:
            discounted.map(
              (item) => ({
                label:
                  `${salePercent(
                    item,
                  )}% OFF • ${item.name}`,
                path:
                  productPath(
                    item,
                  ),
              }),
            ),
        };
      }

      return {
        text:
          'There are no product-level discounts showing right now, but you can browse the current shop for available offers.',

        actions: [
          {
            label:
              'Browse Shop',
            path:
              '/shop',
          },
        ],
      };
    }

    /* ---------------------------------------
       LATEST / NEW PRODUCTS
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'latest',
          'new arrival',
          'new arrivals',
          'new products',
          'latest products',
          'latest find',
        ],
      )
    ) {
      const latest =
        availableProducts.slice(
          0,
          3,
        );

      if (
        latest.length === 0
      ) {
        return {
          text:
            'There are no available products right now. Please check again soon.',
        };
      }

      return {
        text:
          'Here are some of the latest available finds.',

        actions:
          latest.map(
            (item) => ({
              label:
                item.name,
              path:
                productPath(
                  item,
                ),
            }),
          ),
      };
    }

    /* ---------------------------------------
       CATEGORY MATCH
    ---------------------------------------- */

    const category =
      findCategory(text);

    if (category) {
      return {
        text:
          `You can browse our available ${category} products here.`,

        actions: [
          {
            label:
              `Shop ${category}`,
            path:
              `/shop?category=${encodeURIComponent(
                category,
              )}`,
          },
        ],
      };
    }

    /* ---------------------------------------
       KIDS / BABY
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'kids',
          'kid',
          'children',
          'child',
          'baby',
        ],
      )
    ) {
      if (kidsCategory) {
        return {
          text:
            `Here is our ${kidsCategory} collection.`,

          actions: [
            {
              label:
                `Shop ${kidsCategory}`,
              path:
                `/shop?category=${encodeURIComponent(
                  kidsCategory,
                )}`,
            },
          ],
        };
      }

      return {
        text:
          'You can browse all currently available products in the shop.',

        actions: [
          {
            label:
              'Shop Now',
            path:
              '/shop',
          },
        ],
      };
    }

    /* ---------------------------------------
       CASH ON DELIVERY
    ---------------------------------------- */

    if (
      text === 'cod' ||
      text.includes(
        'cash on delivery',
      )
    ) {
      return {
        text:
          'If Cash on Delivery is available for your order, select it during checkout and pay according to the delivery instructions.',

        actions: [
          {
            label:
              'View Cart',
            path:
              '/cart',
          },
        ],
      };
    }

    /* ---------------------------------------
       QR PAYMENT
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'qr payment',
          'pay qr',
          'qr code',
          'payment proof',
          'transaction id',
        ],
      ) ||
      text === 'qr'
    ) {
      return {
        text:
          'For QR Payment, select QR during checkout, scan the provided store QR, complete payment, and submit the requested transaction or payment-proof information.',

        actions: [
          {
            label:
              'Go to Cart',
            path:
              '/cart',
          },
          {
            label:
              'My Orders',
            path:
              '/account/orders',
          },
        ],
      };
    }

    /* ---------------------------------------
       PAYMENT METHODS
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'payment',
          'payment method',
          'how can i pay',
          'how do i pay',
        ],
      )
    ) {
      return {
        text:
          'Available payment options are shown during checkout. I can also help explain QR Payment, Cash on Delivery, or payment verification.',

        actions: [
          {
            label:
              'QR Payment',
            message:
              'How does QR payment work?',
          },
          {
            label:
              'Cash on Delivery',
            message:
              'How does cash on delivery work?',
          },
          {
            label:
              'My Orders',
            path:
              '/account/orders',
          },
        ],
      };
    }

    /* ---------------------------------------
       SHIPPING
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'shipping',
          'shipping fee',
          'delivery fee',
          'delivery charge',
          'shipping cost',
        ],
      )
    ) {
      return {
        text:
          'Shipping fees can depend on the product and delivery location. You can review the current store shipping and return information here.',

        actions: [
          {
            label:
              'Shipping & Returns',
            path:
              '/shipping-returns',
          },
        ],
      };
    }

    /* ---------------------------------------
       RETURNS / REFUNDS
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'return',
          'returns',
          'refund',
          'exchange',
        ],
      )
    ) {
      return {
        text:
          'You can review EasyPeasy-Thrift’s current return and shipping information on the Shipping & Returns page.',

        actions: [
          {
            label:
              'Shipping & Returns',
            path:
              '/shipping-returns',
          },
          {
            label:
              'Contact Store',
            path:
              '/contact',
          },
        ],
      };
    }

    /* ---------------------------------------
       CONTACT
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'contact',
          'phone',
          'email',
          'store phone',
          'store email',
        ],
      )
    ) {
      return {
        text:
          'You can contact EasyPeasy-Thrift through the Contact page or talk directly with an associate on WhatsApp.',

        actions: [
          {
            label:
              'Contact Store',
            path:
              '/contact',
          },
          {
            label:
              'WhatsApp',
            whatsapp:
              true,
          },
        ],
      };
    }

    /* ---------------------------------------
       ABOUT
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'about',
          'who are you',
          'your story',
          'store story',
          'easypeasy thrift',
        ],
      )
    ) {
      return {
        text:
          'You can learn more about the story behind EasyPeasy-Thrift on our About page.',

        actions: [
          {
            label:
              'Our Story',
            path:
              '/about',
          },
        ],
      };
    }

    /* ---------------------------------------
       SHOP
    ---------------------------------------- */

    if (
      containsAny(
        text,
        [
          'shop',
          'shopping',
          'products',
          'clothes',
          'clothing',
          'browse',
          'find something',
        ],
      )
    ) {
      return {
        text:
          'You can browse all currently available products, categories, prices, discounts, sizes, brands, and condition details in the shop.',

        actions: [
          {
            label:
              'Shop Now',
            path:
              '/shop',
          },
          {
            label:
              'Latest Finds',
            message:
              'Show latest products',
          },
          {
            label:
              'Discounts',
            message:
              'Show discounted products',
          },
        ],
      };
    }

    /* ---------------------------------------
   GOODBYE / THANK YOU
---------------------------------------- */

if (
  containsAny(
    text,
    [
      'bye',
      'goodbye',
      'good bye',
      'see you',
      'see ya',
      'take care',
      'thanks',
      'thank you',
      'thankyou',
      'have a good day',
      'have a nice day',
    ],
  )
) {
  return {
    text: customerName
      ? `Bye ${customerName}! 👋 Thank you for visiting EasyPeasy-Thrift. Please remember: never share your password, OTP, banking PIN,  or other sensitive information with anyone. We hope to see you again soon!`
      : `Bye! 👋 Thank you for visiting EasyPeasy-Thrift. Please remember: never share your password, OTP, banking PIN, payment code, or other sensitive information with anyone. We hope to see you again soon!`,

    actions: [
      {
        label:
          'Continue Shopping',
        path:
          '/shop',
      },
    ],
  };
}

    /* ---------------------------------------
       DEFAULT
    ---------------------------------------- */

    return {
      text:
        'I can help with products, categories, prices, discounts, cart, wishlist, orders, payment, shipping, returns, Sell With Us, selling status, payouts, account access, or connecting you with a real person.',

      actions: [
        {
          label:
            'Shop',
          message:
            'Shopping help',
        },
        {
          label:
            'Orders',
          message:
            'My orders',
        },
        {
          label:
            'Sell',
          message:
            'Sell with us',
        },
        {
          label:
            'Help',
          message:
            'What can you do?',
        },
      ],
    };
  }

  /* =========================================
     LOGOUT
  ========================================= */

  async function logout() {
    const supabase =
      createClient();

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      addAssistantMessage(
        'I could not sign you out right now. Please try again.',
      );

      return;
    }

    setLoggedIn(false);
    setCustomerName('');
    setOpen(false);

    router.push('/');
    router.refresh();
  }

  /* =========================================
     ACTION HANDLER
  ========================================= */

  async function handleAction(
  action: ChatAction,
) {
  if (
    action.whatsapp
  ) {
    openWhatsApp();
    return;
  }

  if (
    action.logout
  ) {
    await logout();
    return;
  }

  if (
    action.message
  ) {
    sendMessage(
      action.message,
    );

    return;
  }

  if (
    action.path
  ) {
    setOpen(false);

    /*
     * Customer account pages require login.
     * Remember the page they wanted so we can
     * send them there after successful login.
     */
    if (
      action.path.startsWith(
        '/account',
      ) &&
      !loggedIn
    ) {
      router.push(
        `/login?next=${encodeURIComponent(
          action.path,
        )}`,
      );

      return;
    }

    router.push(
      action.path,
    );
  }
}

  /* =========================================
     SEND MESSAGE
  ========================================= */

  function sendMessage(
    message: string,
  ) {
    const trimmed =
      message.trim();

    if (!trimmed) {
      return;
    }

    setMessages(
      (current) => [
        ...current,
        {
          id:
            createMessageId(),
          role:
            'customer',
          text:
            trimmed,
        },
      ],
    );

    const reply =
      understand(
        trimmed,
      );

    window.setTimeout(
      () => {
        addAssistantMessage(
          reply.text,
          reply.actions,
        );
      },
      150,
    );
  }

  /* =========================================
     FORM SUBMIT
  ========================================= */

  function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message =
      input.trim();

    if (!message) {
      return;
    }

    setInput('');

    sendMessage(
      message,
    );
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <>
      {/* CHAT WINDOW */}

      {open && (
        <div
          style={{
            position:
              'fixed',
            right: 16,
            bottom: 82,

            width:
              'min(370px, calc(100vw - 24px))',

            height:
              'min(560px, 74vh)',

            background:
              '#fffdf8',

            border:
              '1px solid #d8d4ca',

            borderRadius:
              20,

            boxShadow:
              '0 20px 50px rgba(0,0,0,.22)',

            zIndex:
              9999,

            overflow:
              'hidden',

            display:
              'grid',

            gridTemplateRows:
              'auto auto 1fr auto',
          }}
        >
          {/* HEADER */}

          <div
            style={{
              background:
                '#5f735d',

              color:
                'white',

              padding:
                '15px 16px',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'space-between',
            }}
          >
            <div
              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,

                  borderRadius:
                    '50%',

                  background:
                    'rgba(255,255,255,.16)',

                  display:
                    'grid',

                  placeItems:
                    'center',
                }}
              >
                <Bot
                  size={21}
                />
              </div>

              <div>
                <div
                  style={{
                    fontWeight:
                      800,
                  }}
                >
                  EasyPeasy Assistant
                </div>

                <div
                  style={{
                    fontSize:
                      '.74rem',

                    opacity:
                      .85,

                    marginTop:
                      2,
                  }}
                >
                  Shopping, orders & selling
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(
                  false,
                )
              }
              aria-label="Close assistant"
              style={{
                width: 36,
                height: 36,

                border:
                  0,

                borderRadius:
                  '50%',

                background:
                  'transparent',

                color:
                  'white',

                cursor:
                  'pointer',

                display:
                  'grid',

                placeItems:
                  'center',
              }}
            >
              <X
                size={21}
              />
            </button>
          </div>

          {/* QUICK OPTIONS */}

          <div
            style={{
              padding:
                '11px 12px',

              display:
                'flex',

              gap:
                7,

              overflowX:
                'auto',

              borderBottom:
                '1px solid #ebe7de',

              background:
                '#fffdf8',
            }}
          >
            <QuickButton
              label="Orders"
              onClick={() =>
                sendMessage(
                  'My orders',
                )
              }
            />

            <QuickButton
              label="Shop"
              onClick={() =>
                sendMessage(
                  'Shopping help',
                )
              }
            />

            <QuickButton
              label="Sell"
              onClick={() =>
                sendMessage(
                  'Sell with us',
                )
              }
            />

            <QuickButton
              label="Account"
              onClick={() =>
                sendMessage(
                  'Account help',
                )
              }
            />

            <QuickButton
              label="Help"
              onClick={() =>
                sendMessage(
                  'What can you do?',
                )
              }
            />

            <QuickButton
              label="Real person"
              onClick={() =>
                addAssistantMessage(
                  'You can talk directly with an EasyPeasy-Thrift associate on WhatsApp.',
                  [
                    {
                      label:
                        'Talk to a real person',
                      whatsapp:
                        true,
                    },
                  ],
                )
              }
            />
          </div>

          {/* MESSAGES */}

          <div
            ref={
              messagesRef
            }
            style={{
              overflowY:
                'auto',

              padding:
                14,

              display:
                'flex',

              flexDirection:
                'column',

              gap:
                10,
            }}
          >
            {messages.map(
              (
                message,
              ) => (
                <div
                  key={
                    message.id
                  }
                  style={{
                    alignSelf:
                      message.role ===
                      'customer'
                        ? 'flex-end'
                        : 'flex-start',

                    maxWidth:
                      '88%',
                  }}
                >
                  <div
                    style={{
                      padding:
                        '10px 12px',

                      borderRadius:
                        message.role ===
                        'customer'
                          ? '14px 14px 4px 14px'
                          : '14px 14px 14px 4px',

                      background:
                        message.role ===
                        'customer'
                          ? '#181815'
                          : '#e5ebe0',

                      color:
                        message.role ===
                        'customer'
                          ? 'white'
                          : '#263026',

                      fontSize:
                        '.88rem',

                      lineHeight:
                        1.45,
                    }}
                  >
                    {message.greeting ? (
                      <>
                        Hi! 👋{' '}

                        {customerName && (
                          <>
                            <strong>
                              {
                                customerName
                              }
                            </strong>

                            {', '}
                          </>
                        )}

                        How can I help you today?
                      </>
                    ) : (
                      message.text
                    )}
                  </div>

                  {message.actions &&
                    message.actions
                      .length >
                      0 && (
                    <div
                      style={{
                        marginTop:
                          7,

                        display:
                          'flex',

                        flexWrap:
                          'wrap',

                        gap:
                          6,
                      }}
                    >
                      {message.actions.map(
                        (
                          action,
                          index,
                        ) => (
                          <button
                            key={`${message.id}-action-${index}`}
                            type="button"
                            onClick={() =>
                              void handleAction(
                                action,
                              )
                            }
                            style={{
                              border:
                                0,

                              borderRadius:
                                999,

                              padding:
                                '9px 13px',

                              background:
                                action.whatsapp
                                  ? '#25D366'
                                  : action.logout
                                    ? '#9b4136'
                                    : '#5f735d',

                              color:
                                'white',

                              fontWeight:
                                800,

                              cursor:
                                'pointer',

                              display:
                                'flex',

                              alignItems:
                                'center',

                              gap:
                                7,

                              fontSize:
                                '.78rem',
                            }}
                          >
                            {action.whatsapp && (
                              <MessageCircle
                                size={
                                  16
                                }
                              />
                            )}

                            {
                              action.label
                            }

                            {!action.whatsapp &&
                              !action.logout &&
                              !action.message &&
                              ' →'}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          {/* MESSAGE INPUT */}

          <form
            onSubmit={
              submit
            }
            style={{
              display:
                'grid',

              gridTemplateColumns:
                '1fr auto',

              gap:
                8,

              padding:
                12,

              borderTop:
                '1px solid #e1ddd3',

              background:
                'white',
            }}
          >
            <input
              type="text"
              value={
                input
              }
              onChange={(
                event,
              ) =>
                setInput(
                  event.target.value,
                )
              }
              placeholder="How can I help?"
              maxLength={180}
              style={{
                width:
                  '100%',

                minWidth:
                  0,

                border:
                  '1px solid #d8d4ca',

                borderRadius:
                  999,

                padding:
                  '11px 14px',

                outline:
                  'none',

                font:
                  'inherit',
              }}
            />

            <button
              type="submit"
              aria-label="Send message"
              disabled={
                !input.trim()
              }
              style={{
                width:
                  44,

                height:
                  44,

                border:
                  0,

                borderRadius:
                  '50%',

                background:
                  '#5f735d',

                color:
                  'white',

                cursor:
                  input.trim()
                    ? 'pointer'
                    : 'default',

                opacity:
                  input.trim()
                    ? 1
                    : .5,

                display:
                  'grid',

                placeItems:
                  'center',
              }}
            >
              <Send
                size={18}
              />
            </button>
          </form>
        </div>
      )}

      {/* FLOATING BUTTON */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
        aria-label="EasyPeasy shopping assistant"
        style={{
          position:
            'fixed',

          right:
            16,

          bottom:
            18,

          zIndex:
            9998,

          border:
            0,

          borderRadius:
            999,

          padding:
            '12px 17px',

          background:
            '#5f735d',

          color:
            'white',

          fontWeight:
            800,

          cursor:
            'pointer',

          display:
            'flex',

          alignItems:
            'center',

          gap:
            8,

          boxShadow:
            '0 10px 30px rgba(0,0,0,.18)',
        }}
      >
        <Bot
          size={20}
        />

        <span>
          Need help?
        </span>
      </button>
    </>
  );
}

/* =========================================
   QUICK BUTTON
========================================= */

function QuickButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      style={{
        flex:
          '0 0 auto',

        border:
          '1px solid #ddd9d0',

        borderRadius:
          999,

        padding:
          '7px 11px',

        background:
          'white',

        color:
          '#181815',

        fontSize:
          '.75rem',

        fontWeight:
          700,

        cursor:
          'pointer',

        whiteSpace:
          'nowrap',
      }}
    >
      {label}
    </button>
  );
}