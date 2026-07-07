'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Send } from 'lucide-react';
import { api } from '@/lib/api';

export default function ContactForm() {
  const [locations, setLocations] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/public/locations').then(value => setLocations(value as any[])).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = event.currentTarget;
    const values: any = Object.fromEntries(new FormData(form));
    if (!values.branchId) delete values.branchId;
    if (!values.phone) delete values.phone;
    if (!values.subject) delete values.subject;
    try {
      const result: any = await api('/api/public/contact', { method: 'POST', body: JSON.stringify(values) });
      setMessage(result.message);
      form.reset();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <form className="contactForm" onSubmit={submit}>
    <p className="publicKicker">WRITE TO US</p><h2>Have a question?</h2>
    <div className="publicFormGrid">
      <label>Full name<input name="name" minLength={2} required placeholder="Your name" /></label>
      <label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label>
      <label>Phone number<input name="phone" type="tel" placeholder="Optional" /></label>
      <label>Location<select name="branchId" defaultValue=""><option value="">General enquiry</option>{locations.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label>
      <label className="fullField">Subject<input name="subject" maxLength={140} placeholder="How can we help?" /></label>
      <label className="fullField">Message<textarea name="message" minLength={10} maxLength={1200} required placeholder="Tell us a little more" /></label>
    </div>
    {message && <p className="formMessage"><Check />{message}</p>}
    <button disabled={busy}>{busy ? 'Sending…' : <>Send message <Send /></>}</button>
  </form>;
}
