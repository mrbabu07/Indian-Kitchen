import Link from 'next/link';
import { ArrowRight, Instagram, MapPin, Phone } from 'lucide-react';

export function PublicHeader() {
  return <nav className="publicNav">
    <Link className="siteLogo" href="/"><i>IK</i><span>INDIAN<small>KITCHEN</small></span></Link>
    <div className="publicLinks">
      <Link href="/">Home</Link><Link href="/menu">Menu</Link><Link href="/gallery">Gallery</Link><Link href="/blog">Journal</Link><Link href="/contact">Contact</Link>
    </div>
    <Link className="publicReserve" href="/reservation">Reserve a table <ArrowRight /></Link>
  </nav>;
}

export function PublicFooter() {
  return <footer className="publicFooter">
    <div className="footerLead"><Link className="siteLogo" href="/"><i>IK</i><span>INDIAN<small>KITCHEN</small></span></Link><p>Old recipes, new memories, and a generous table in the heart of Kolkata.</p></div>
    <div><b>Explore</b><Link href="/menu">Order menu</Link><Link href="/reservation">Reservations</Link><Link href="/gallery">Gallery</Link><Link href="/blog">Journal</Link></div>
    <div><b>Visit</b><span><MapPin />12 Park Street, Kolkata</span><a href="tel:+919876543210"><Phone />+91 98765 43210</a><span>Daily · 12 PM — 11:30 PM</span></div>
    <div><b>Follow</b><a href="#"><Instagram />Instagram</a><Link href="/staff/login">Staff login</Link></div>
    <small>© 2026 Indian Kitchen. All rights reserved.</small>
  </footer>;
}

export function PageHero({ eyebrow, title, copy, image }: { eyebrow: string; title: string; copy: string; image: string }) {
  return <section className="publicHero" style={{ backgroundImage: `linear-gradient(90deg,#120b08e8,#1a100a70),url('${image}')` }}>
    <PublicHeader />
    <div><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>
  </section>;
}
