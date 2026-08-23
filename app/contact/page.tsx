'use client';

import { useStore } from '@/components/store-provider';

export default function Contact() {
  const { settings } = useStore();

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

          <p>
            <b>Shipping</b>
            <br />
            {settings.shippingInfo}
          </p>
        </div>

        <form
          className="panel form-grid"
          onSubmit={(event) => {
            event.preventDefault();

            alert(
              'Message captured in demo mode. Connect this form to email or your database before launch.',
            );
          }}
        >
          <div className="field">
            <label>Name</label>
            <input
              className="control"
              required
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              className="control"
              type="email"
              required
            />
          </div>

          <div className="field">
            <label>
              Order number (optional)
            </label>
            <input className="control" />
          </div>

          <div className="field">
            <label>Message</label>
            <textarea
              className="control"
              rows={6}
              required
            />
          </div>

          <button className="btn sage">
            Send message
          </button>
        </form>
      </div>
    </div>
  );
}
