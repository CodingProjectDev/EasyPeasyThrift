export type ProductCondition = 'Like New' | 'Excellent' | 'Good' | 'Fair';

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  category: string;
  size: string;
  condition: ProductCondition;
  brand: string;
  measurements: Record<string, string>;
  description: string;
  // TikTok product video link
  tiktokUrl?: string;
  images: string[];
  inventory: number;
  shippingFee?: number;
  freeShipping?: boolean;
  oneOfOne?: boolean;
  newArrival?: boolean;
  vintageFind?: boolean;
  featured?: boolean;
  createdAt: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type OrderStatus =
  | 'Pending'
  | 'Payment Verification Required'
  | 'Payment Rejected'
  | 'Approved'
  | 'Processing'
  | 'Shipped'
  | 'Delivered';

export type PaymentMethod = 'COD' | 'QR';

export type Order = {
  id: string;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  shipping: number;
  /**
   * True only when at least one product still uses
   * location-dependent shipping that is confirmed separately.
   * This is primarily used by the checkout success UI.
   */
  shippingPending?: boolean;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentProofName?: string;
  paymentProofDataUrl?: string;
  transactionId?: string;
  status: OrderStatus;
};

export type PromoCode = {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expiresAt: string;
  active: boolean;
};
