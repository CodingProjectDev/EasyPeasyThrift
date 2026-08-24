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

import { useStore } from '@/components/store-provider';

type ChatAction = {
  label: string;
  path?: string;
  whatsapp?: boolean;
};

type ChatMessage = {
  id: number;
  role: 'assistant' | 'customer';
  text: string;
  action?: ChatAction;
};

type AssistantReply = {
  text: string;
  action?: ChatAction;
};

export default function StoreAssistant() {
  const pathname = usePathname();
  const router = useRouter();

  const {
    settings,
    products,
  } = useStore();

  const [open, setOpen] =
    useState(false);

  const [input, setInput] =
    useState('');

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id: 1,
        role: 'assistant',
        text:
          'Hi! 👋 How can I help you today?',
      },
    ]);

  const messagesRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
   * Automatically scroll to newest message
   */
  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTop =
      messagesRef.current.scrollHeight;
  }, [messages]);

  /*
   * Do not show assistant inside admin
   */
  if (
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  /*
   * Find the real Kids category dynamically
   * from products instead of hard-coding it.
   */
  const kidsCategory =
    Array.from(
      new Set(
        products
          .map(
            (product) =>
              product.category,
          )
          .filter(Boolean),
      ),
    ).find((category) =>
      category
        .toLowerCase()
        .includes('kid'),
    );

  /*
   * Open WhatsApp using phone number
   * configured by admin in Store Settings.
   */
  function openWhatsApp() {
    const rawPhone = String(
      settings.storePhone || '',
    );

    const phone =
      rawPhone.replace(/\D/g, '');

    if (!phone) {
      addAssistantMessage(
        'Store WhatsApp is not available right now. Please use the Contact page instead.',
        {
          label: 'Contact Store',
          path: '/contact',
        },
      );

      return;
    }

    const message =
      encodeURIComponent(
        `Hi ${settings.storeName || 'EasyPeasy-Thrift'}! I need help with my shopping.`,
      );

    const url =
      `https://wa.me/${phone}?text=${message}`;

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );
  }

  function addAssistantMessage(
    text: string,
    action?: ChatAction,
  ) {
    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: 'assistant',
        text,
        action,
      },
    ]);
  }

  /*
   * Your own assistant "brain".
   * Add more rules here anytime.
   */
  function understand(
    message: string,
  ): AssistantReply {
    const text =
      message
        .toLowerCase()
        .trim();

    /*
     * REAL PERSON / WHATSAPP
     */
    if (
      text.includes(
        'real person',
      ) ||
      text.includes('human') ||
      text.includes('agent') ||
      text.includes(
        'associate',
      ) ||
      text.includes(
        'representative',
      ) ||
      text.includes(
        'whatsapp',
      )
    ) {
      return {
        text:
          'Of course. You can talk directly with an EasyPeasy-Thrift associate on WhatsApp.',
        action: {
          label:
            'Talk to a real person',
          whatsapp: true,
        },
      };
    }

    /*
     * ORDERS
     */
    if (
      text.includes('order') ||
      text.includes('track') ||
      text.includes(
        'delivery status',
      ) ||
      text.includes(
        'where is my',
      )
    ) {
      return {
        text:
          'You can check your latest order status in My Orders.',
        action: {
          label: 'View My Orders',
          path:
            '/account/orders',
        },
      };
    }

    /*
     * PROFILE / ACCOUNT
     */
    if (
      text.includes('profile') ||
      text.includes('account') ||
      text.includes(
        'my information',
      ) ||
      text.includes(
        'my info',
      )
    ) {
      return {
        text:
          'You can view your account information in My Profile.',
        action: {
          label: 'My Profile',
          path: '/account',
        },
      };
    }

    /*
     * WISHLIST
     */
    if (
      text.includes('wishlist') ||
      text.includes(
        'favorite',
      ) ||
      text.includes(
        'favourite',
      ) ||
      text.includes(
        'saved item',
      )
    ) {
      return {
        text:
          'Your saved products are available in Wishlist.',
        action: {
          label:
            'View Wishlist',
          path: '/wishlist',
        },
      };
    }

    /*
     * CART
     */
    if (
      text.includes('cart') ||
      text.includes(
        'shopping bag',
      )
    ) {
      return {
        text:
          'You can review the products you selected in your cart.',
        action: {
          label: 'View Cart',
          path: '/cart',
        },
      };
    }

    /*
     * CHECKOUT
     */
    if (
      text.includes(
        'checkout',
      ) ||
      text.includes(
        'buy now',
      ) ||
      text.includes(
        'place order',
      )
    ) {
      return {
        text:
          'Add your products to the cart and continue to checkout when you’re ready.',
        action: {
          label: 'Go to Cart',
          path: '/cart',
        },
      };
    }

    /*
     * CASH ON DELIVERY
     */
    if (
      text.includes('cod') ||
      text.includes(
        'cash on delivery',
      )
    ) {
      return {
        text:
          'Cash on Delivery lets you place the order first and pay when the order is delivered.',
        action: {
          label: 'Start Shopping',
          path: '/shop',
        },
      };
    }

    /*
     * QR PAYMENT
     */
    if (
      text.includes(
        'qr payment',
      ) ||
      text === 'qr' ||
      text.includes(
        'pay qr',
      )
    ) {
      return {
        text:
          'For QR Payment, select QR during checkout, scan the store QR, complete payment, and submit the requested payment information.',
        action: {
          label: 'Go to Cart',
          path: '/cart',
        },
      };
    }

    /*
     * KIDS COLLECTION
     */
    if (
      text.includes('kids') ||
      text.includes('kid') ||
      text.includes(
        'children',
      ) ||
      text.includes('child')
    ) {
      if (kidsCategory) {
        return {
          text:
            'Here is our Kids collection.',
          action: {
            label:
              'Shop Kids Collection',
            path:
              `/shop?category=${encodeURIComponent(
                kidsCategory,
              )}`,
          },
        };
      }

      return {
        text:
          'You can browse our available products in the shop.',
        action: {
          label: 'Shop Now',
          path: '/shop',
        },
      };
    }

    /*
     * SHIPPING
     */
    if (
      text.includes(
        'shipping',
      ) ||
      text.includes(
        'shipping fee',
      ) ||
      text.includes(
        'delivery fee',
      )
    ) {
      return {
        text:
          'Shipping depends on the product and location. You can view more information on our Shipping & Returns page.',
        action: {
          label:
            'Shipping & Returns',
          path:
            '/shipping-returns',
        },
      };
    }

    /*
     * RETURNS
     */
    if (
      text.includes('return') ||
      text.includes(
        'refund',
      )
    ) {
      return {
        text:
          'You can review our return information on the Shipping & Returns page.',
        action: {
          label:
            'Shipping & Returns',
          path:
            '/shipping-returns',
        },
      };
    }

    /*
     * CONTACT
     */
    if (
      text.includes(
        'contact',
      ) ||
      text.includes('phone') ||
      text.includes('email')
    ) {
      return {
        text:
          'You can contact EasyPeasy-Thrift from our Contact page or talk to a real person on WhatsApp.',
        action: {
          label:
            'Contact Store',
          path: '/contact',
        },
      };
    }

    /*
     * ABOUT
     */
    if (
      text.includes('about') ||
      text.includes(
        'who are you',
      ) ||
      text.includes(
        'your story',
      )
    ) {
      return {
        text:
          'You can learn more about EasyPeasy-Thrift on our About page.',
        action: {
          label: 'Our Story',
          path: '/about',
        },
      };
    }

    /*
     * SHOP / PRODUCTS
     */
    if (
      text.includes('shop') ||
      text.includes(
        'products',
      ) ||
      text.includes(
        'clothes',
      ) ||
      text.includes(
        'clothing',
      ) ||
      text.includes(
        'browse',
      )
    ) {
      return {
        text:
          'You can browse all currently available products in our shop.',
        action: {
          label: 'Shop Now',
          path: '/shop',
        },
      };
    }

    /*
     * GREETINGS
     */
    if (
      text === 'hi' ||
      text === 'hello' ||
      text === 'hey'
    ) {
      return {
        text:
          'Hi! 👋 I can help you find products, check orders, understand shipping, or connect you with a real person.',
      };
    }

    /*
     * DEFAULT ANSWER
     */
    return {
      text:
        'I can help with shopping, orders, profile, wishlist, cart, payment, shipping, returns, or connecting you with a real person.',
    };
  }

  function handleAction(
    action: ChatAction,
  ) {
    if (action.whatsapp) {
      openWhatsApp();
      return;
    }

    if (action.path) {
      setOpen(false);
      router.push(action.path);
    }
  }

  function sendMessage(
    message: string,
  ) {
    const trimmed =
      message.trim();

    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: 'customer',
        text: trimmed,
      },
    ]);

    const reply =
      understand(trimmed);

    window.setTimeout(() => {
      addAssistantMessage(
        reply.text,
        reply.action,
      );
    }, 150);
  }

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

    sendMessage(message);
  }

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
              'min(520px, 70vh)',
            background:
              '#fffdf8',
            border:
              '1px solid #d8d4ca',
            borderRadius: 20,
            boxShadow:
              '0 20px 50px rgba(0,0,0,.22)',
            zIndex: 9999,
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
              color: 'white',
              padding:
                '15px 16px',
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
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
                  display: 'grid',
                  placeItems:
                    'center',
                }}
              >
                <Bot size={21} />
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 800,
                  }}
                >
                  EasyPeasy Assistant
                </div>

                <div
                  style={{
                    fontSize:
                      '.74rem',
                    opacity: .85,
                    marginTop: 2,
                  }}
                >
                  Shopping help
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Close assistant"
              style={{
                width: 36,
                height: 36,
                border: 0,
                borderRadius:
                  '50%',
                background:
                  'transparent',
                color: 'white',
                cursor:
                  'pointer',
                display: 'grid',
                placeItems:
                  'center',
              }}
            >
              <X size={21} />
            </button>
          </div>

          {/* QUICK OPTIONS */}

          <div
            style={{
              padding:
                '11px 12px',
              display: 'flex',
              gap: 7,
              overflowX:
                'auto',
              borderBottom:
                '1px solid #ebe7de',
              background:
                '#fffdf8',
            }}
          >
            <QuickButton
              label="My Orders"
              onClick={() =>
                sendMessage(
                  'Where is my order?',
                )
              }
            />

            <QuickButton
              label="Shop"
              onClick={() =>
                sendMessage(
                  'I want to shop',
                )
              }
            />

            <QuickButton
              label="Shipping"
              onClick={() =>
                sendMessage(
                  'Shipping information',
                )
              }
            />

            <QuickButton
              label="Real person"
              onClick={() =>
                addAssistantMessage(
                  'You can talk directly with an EasyPeasy-Thrift associate on WhatsApp.',
                  {
                    label:
                      'Talk to a real person',
                    whatsapp:
                      true,
                  },
                )
              }
            />
          </div>

          {/* MESSAGES */}

          <div
            ref={messagesRef}
            style={{
              overflowY:
                'auto',
              padding: 14,
              display: 'flex',
              flexDirection:
                'column',
              gap: 10,
            }}
          >
            {messages.map(
              (message) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf:
                      message.role ===
                      'customer'
                        ? 'flex-end'
                        : 'flex-start',
                    maxWidth:
                      '85%',
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
                    {message.text}
                  </div>

                  {message.action && (
                    <button
                      type="button"
                      onClick={() =>
                        handleAction(
                          message.action!,
                        )
                      }
                      style={{
                        marginTop:
                          7,
                        border: 0,
                        borderRadius:
                          999,
                        padding:
                          '9px 13px',
                        background:
                          message.action
                            .whatsapp
                            ? '#25D366'
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
                        gap: 7,
                      }}
                    >
                      {message.action
                        .whatsapp && (
                        <MessageCircle
                          size={16}
                        />
                      )}

                      {
                        message.action
                          .label
                      }

                      {!message.action
                        .whatsapp &&
                        ' →'}
                    </button>
                  )}
                </div>
              ),
            )}
          </div>

          {/* MESSAGE INPUT */}

          <form
            onSubmit={submit}
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr auto',
              gap: 8,
              padding: 12,
              borderTop:
                '1px solid #e1ddd3',
              background:
                'white',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value,
                )
              }
              placeholder="How can I help?"
              maxLength={180}
              style={{
                width:
                  '100%',
                minWidth: 0,
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
                width: 44,
                height: 44,
                border: 0,
                borderRadius:
                  '50%',
                background:
                  '#5f735d',
                color: 'white',
                cursor:
                  input.trim()
                    ? 'pointer'
                    : 'default',
                opacity:
                  input.trim()
                    ? 1
                    : .5,
                display: 'grid',
                placeItems:
                  'center',
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* SINGLE FLOATING HELP BUTTON */}

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
          right: 16,
          bottom: 18,
          zIndex: 9998,
          border: 0,
          borderRadius:
            999,
          padding:
            '12px 17px',
          background:
            '#5f735d',
          color: 'white',
          fontWeight:
            800,
          cursor:
            'pointer',
          display:
            'flex',
          alignItems:
            'center',
          gap: 8,
          boxShadow:
            '0 10px 30px rgba(0,0,0,.18)',
        }}
      >
        <Bot size={20} />

        <span>
          Need help?
        </span>
      </button>
    </>
  );
}

/*
 * Small reusable quick-button.
 */
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
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        border:
          '1px solid #ddd9d0',
        borderRadius: 999,
        padding:
          '7px 11px',
        background: 'white',
        color: '#181815',
        fontSize: '.75rem',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace:
          'nowrap',
      }}
    >
      {label}
    </button>
  );
}
