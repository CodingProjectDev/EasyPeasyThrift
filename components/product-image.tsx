'use client';

import { ImgHTMLAttributes, useEffect, useState } from 'react';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
};

export function ProductImage({ src, alt = '', onError, ...props }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const safeSrc = !src || failed ? '/product-placeholder.svg' : src;

  return (
    <img
      {...props}
      src={safeSrc}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
