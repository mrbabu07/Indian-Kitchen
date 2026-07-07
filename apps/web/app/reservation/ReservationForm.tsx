'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, Check, Clock3, Users } from 'lucide-react';
import { api } from '@/lib/api';

export default function ReservationForm() {
  const [locations, setLocations] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { api('/api/public/locations').then(value => setLocations(value as any[])).catch(error => setMessage(error.message)); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = event.currentTarget; const values: any = Object.fromEntries(new FormData(form));
    try {
      const result: any = await api('/api/public/reservations', { method: 'POST', body: JSON.stringify({ ...values, guests: Number(values.guests), reservedFor: `${values.date}T${values.time}:00+05:30`, date: undefined, time: undefined }) });
      setMessage(`Your request is in. Reference ${result.id.slice(0, 8).toUpperCase()} · ${result.branch}`); form.reset();
    } catch (error: any) { setMessage(error.message); } finally { setBusy(false); }
  }

  return <form className="reservationForm" onSubmit={submit}>
    <div className="formHeading"><p>BOOK YOUR EXPERIENCE</p><h2>Find your table.</h2><span>Reservations are requests until our team confirms by phone.</span></div>
    <div className="publicFormGrid">
      <label>Restaurant location<select name="branchId" required defaultValue=""><option value="" disabled>Select a location</option>{locations.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label>
      <label>Number of guests<span className="inputIcon"><Users /><select name="guests" defaultValue="2" required>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1} {index ? 'guests' : 'guest'}</option>)}</select></span></label>
      <label>Date<span className="inputIcon"><CalendarDays /><input name="date" type="date" min={today} required /></span></label>
      <label>Time<span className="inputIcon"><Clock3 /><select name="time" required defaultValue=""><option value="" disabled>Select time</option>{['12:00','12:30','13:00','13:30','14:00','14:30','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'].map(time => <option key={time}>{time}</option>)}</select></span></label>
      <label>Full name<input name="name" placeholder="Your name" minLength={2} required /></label>
      <label>Phone number<input name="phone" type="tel" placeholder="+91 98765 43210" required /></label>
      <label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label>
      <label>Occasion<select name="occasion" defaultValue=""><option value="">Just dining</option><option>Birthday</option><option>Anniversary</option><option>Business dinner</option><option>Celebration</option></select></label>
      <label className="fullField">Anything we should know?<textarea name="notes" maxLength={600} placeholder="Dietary preferences, accessibility needs or a note for our team" /></label>
    </div>
    {message && <p className="formMessage"><Check />{message}</p>}
    <button disabled={busy}>{busy ? 'Sending your request…' : 'Request a table'}</button>
  </form>;
}
