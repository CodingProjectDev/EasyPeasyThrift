'use client';

import {
  useEffect,
  useState,
} from 'react';

type TypingHeroTitleProps = {
  text: string;
  speed?: number;
  pause?: number;
  className?: string;
  as?: 'h1' | 'span';
};

export default function TypingHeroTitle({
  text,
  speed = 70,
  pause = 1600,
  className = '',
  as = 'h1',
}: TypingHeroTitleProps) {
  const [
    displayedText,
    setDisplayedText,
  ] = useState('');

  useEffect(() => {
    let timer: ReturnType<
      typeof setTimeout
    >;

    if (
      displayedText.length <
      text.length
    ) {
      timer = setTimeout(
        () => {
          setDisplayedText(
            text.slice(
              0,
              displayedText.length + 1,
            ),
          );
        },
        speed,
      );
    } else {
      timer = setTimeout(
        () => {
          setDisplayedText('');
        },
        pause,
      );
    }

    return () => {
      clearTimeout(timer);
    };
  }, [
    displayedText,
    text,
    speed,
    pause,
  ]);

  const content = (
    <>
      <span
        className="typing-placeholder"
        aria-hidden="true"
      >
        {text}
      </span>

      <span
        className="typing-live"
        aria-hidden="true"
      >
        {displayedText}
      </span>
    </>
  );

  if (as === 'span') {
    return (
      <span
        className={`typing-effect ${className}`}
        aria-label={text}
      >
        {content}
      </span>
    );
  }

  return (
    <h1
      className={`typing-effect ${className}`}
      aria-label={text}
    >
      {content}
    </h1>
  );
}