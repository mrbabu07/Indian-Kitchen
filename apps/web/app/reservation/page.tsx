import { Clock3, Phone, Sparkles } from 'lucide-react';
import { PageHero, PublicFooter } from '../components/PublicShell';
import ReservationForm from './ReservationForm';

export default function ReservationPage() {
  return <main className="publicPage">
    <PageHero eyebrow="RESERVATIONS" title="A table for every story." copy="Slow dinners, joyful celebrations and everything in between." image="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=2000&q=90" />
    <section className="reservationLayout">
      <aside><p className="publicKicker">BEFORE YOU ARRIVE</p><h2>Come hungry.<br/><em>Stay awhile.</em></h2><p>Choose your preferred date and time. Our reservations team will call to confirm availability and any special arrangements.</p><div><Clock3 /><span><b>Dining hours</b>Daily, 12 PM — 11:30 PM</span></div><div><Phone /><span><b>Prefer to call?</b>+91 98765 43210</span></div><div><Sparkles /><span><b>Celebrating?</b>Tell us in your booking notes.</span></div></aside>
      <ReservationForm />
    </section>
    <PublicFooter />
  </main>;
}
