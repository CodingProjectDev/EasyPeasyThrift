'use client';

import { FormEvent, useState } from 'react';
import { useStore } from '@/components/store-provider';

export default function Contact() {
  const { settings } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [message, setMessage] = useState('');

  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSending(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          orderNumber,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not send your message. Please try again.',
        );
      }

      setSuccessMessage(
        'Thank you! Your message has been sent successfully.',
      );

      setName('');
      setEmail('');
      setOrderNumber('');
      setMessage('');
    } catch (error) {
      console.error('Contact form error:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not send your message. Please try again.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">
          Say hey
        </span>

        <h1>Contact.</h1>
      </div>

      <div className="contact-grid">
        <div className="contact-card">
          <h2>
            Questions about a piece?
          </h2>

          <p>
            Send the product name, size
            question, or order number. For
            secondhand items, specific questions
            before checkout are better than
            guessing.
          </p>

          {settings.storeEmail && (
            <p>
              <b>Email</b>
              <br />

              <a
                href={`mailto:${settings.storeEmail}`}
              >
                {settings.storeEmail}
              </a>
            </p>
          )}

          {settings.storePhone && (
            <p>
              <b>Phone</b>
              <br />

              <a
                href={`tel:${settings.storePhone}`}
              >
                {settings.storePhone}
              </a>
            </p>
          )}

          {settings.shippingInfo && (
            <p>
              <b>Shipping</b>
              <br />
              {settings.shippingInfo}
            </p>
          )}
        </div>

        <form
          className="panel form-grid"
          onSubmit={handleSubmit}
        >
          <div className="field">
            <label htmlFor="contact-name">
              Name
            </label>

            <input
              id="contact-name"
              className="control"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              maxLength={100}
              autoComplete="name"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="contact-email">
              Email
            </label>

            <input
              id="contact-email"
              className="control"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              maxLength={200}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="contact-order">
              Order number (optional)
            </label>

            <input
              id="contact-order"
              className="control"
              type="text"
              value={orderNumber}
              onChange={(event) =>
                setOrderNumber(
                  event.target.value,
                )
              }
              maxLength={100}
            />
          </div>

          <div className="field">
            <label htmlFor="contact-message">
              Message
            </label>

            <textarea
              id="contact-message"
              className="control"
              rows={6}
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value,
                )
              }
              maxLength={3000}
              required
            />
          </div>

          {successMessage && (
            <div
              className="notice sage"
              role="status"
            >
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div
              className="notice brown"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <button
            className="btn sage"
            type="submit"
            disabled={sending}
          >
            {sending
              ? 'Sending...'
              : 'Send message'}
          </button>
        </form>
      </div>
    </div>
  );
}
