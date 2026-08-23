'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/components/store-provider';

export default function WhatsAppChat() {
  const pathname = usePathname();
  const { settings } = useStore();

  // Never show WhatsApp chat on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  if (!settings.storePhone) {
    return null;
  }

  // WhatsApp requires digits only
  const phone = settings.storePhone.replace(/\D/g, '');

  if (!phone) {
    return null;
  }

  const message = encodeURIComponent(
    'Hi EasyPeasy-Thrift! I have a question about a product.',
  );

  const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-chat"
      aria-label="Chat with us on WhatsApp"
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M16.04 3C8.85 3 3 8.79 3 15.92c0 2.27.6 4.49 1.74 6.44L3 29l6.84-1.79a13.1 13.1 0 0 0 6.2 1.57H16c7.18 0 13-5.8 13-12.93C29 8.79 23.2 3 16.04 3Zm0 23.6h-.01a10.9 10.9 0 0 1-5.56-1.52l-.4-.24-4.06 1.06 1.08-3.94-.26-.41a10.72 10.72 0 0 1-1.66-5.63c0-5.94 4.88-10.77 10.88-10.77 2.9 0 5.63 1.12 7.68 3.15a10.67 10.67 0 0 1 3.19 7.62c0 5.95-4.88 10.78-10.88 10.78Zm5.97-8.08c-.33-.16-1.94-.95-2.24-1.06-.3-.11-.52-.16-.74.16-.22.33-.85 1.06-1.04 1.28-.19.22-.38.24-.71.08-.33-.16-1.39-.51-2.65-1.62a9.93 9.93 0 0 1-1.84-2.27c-.19-.33-.02-.5.14-.67.15-.15.33-.38.49-.57.16-.19.22-.33.33-.54.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.02-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71 0 1.6 1.17 3.14 1.33 3.36.16.22 2.3 3.49 5.57 4.89.78.33 1.38.53 1.85.68.78.25 1.49.21 2.05.13.63-.09 1.94-.79 2.21-1.55.27-.76.27-1.41.19-1.55-.08-.14-.3-.22-.63-.38Z"
        />
      </svg>

      <span>Chat with us</span>
    </a>
  );
}
