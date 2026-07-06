import Link from 'next/link';
import { ArrowDown, ArrowRight, CalendarDays, ChefHat, Clock3, Instagram, MapPin, Phone, Quote, Sparkles, Star } from 'lucide-react';

export default function Home() {
  return <main className="siteHome">
    <nav className="siteNav">
      <Link className="siteLogo" href="/"><i>IK</i><span>INDIAN<small>KITCHEN</small></span></Link>
      <div className="siteLinks"><a href="#story">Our story</a><a href="#menu">The menu</a><a href="#experience">Experience</a><a href="#contact">Contact</a></div>
      <Link className="bookButton" href="/staff/login">Staff login <ArrowRight/></Link>
    </nav>

    <section className="cinemaHero">
      <div className="cinemaOverlay"/>
      <div className="heroMark">IK</div>
      <div className="cinemaCopy"><p>AUTHENTIC INDIAN DINING · KOLKATA</p><h1>Every table<br/>has a <em>story.</em></h1><div className="heroRule"><span/><p>Old recipes. New memories.<br/>A kitchen that feels like home.</p></div></div>
      <a className="scrollCue" href="#story"><span>SCROLL TO DISCOVER</span><ArrowDown/></a>
      <div className="heroHours"><Clock3/><span>OPEN TODAY<small>12:00 PM — 11:30 PM</small></span></div>
    </section>

    <section id="story" className="editorialStory">
      <div className="storyPhoto"><span>Since<br/><b>1998</b></span></div>
      <div className="storyCopy"><p className="sectionKicker">THE INDIAN KITCHEN STORY</p><h2>A celebration of<br/><em>flavour & belonging.</em></h2><div className="ornament">✦</div><p className="lead">Indian Kitchen is a love letter to the dining rooms we grew up in—where food arrived in generous bowls and nobody left the table early.</p><p>Our menu travels across India, bringing together slow-cooked Bengali favourites, the smoke of the northern tandoor and the comfort of timeless family recipes. Every spice is ground with intention. Every plate is made to be shared.</p><a href="#menu" className="inkLink">DISCOVER OUR KITCHEN <ArrowRight/></a></div>
    </section>

    <section id="menu" className="menuShowcase">
      <div className="showcaseIntro"><p className="sectionKicker">FROM THE KITCHEN</p><h2>Made slowly.<br/><em>Remembered always.</em></h2><p>Seasonal produce, hand-ground masalas and recipes with a sense of place.</p></div>
      <div className="dishMosaic">
        <article className="dishFeature"><div/><span>CHEF’S SIGNATURE</span><h3>Royal Butter Chicken</h3><p>Charred chicken · cultured butter · tomato · fenugreek</p></article>
        <article className="dishSmall dishOne"><div/><span>FROM THE TANDOOR</span><h3>Fire & spice</h3></article>
        <article className="dishSmall dishTwo"><div/><span>SWEET ENDINGS</span><h3>Made for joy</h3></article>
      </div>
      <div className="scanPrompt"><div><Sparkles/><span>DINING WITH US?</span></div><p>Scan the QR code at your table to browse the complete menu and order at your own pace.</p></div>
    </section>

    <section id="experience" className="experienceBand">
      <div className="experienceTitle"><p className="sectionKicker">MORE THAN A MEAL</p><h2>Come for dinner.<br/><em>Stay for the feeling.</em></h2></div>
      <div className="experienceCards">
        <article><ChefHat/><b>01</b><h3>Honest cooking</h3><p>No shortcuts. Our gravies simmer, our breads arrive hot, and every order begins fresh.</p></article>
        <article><CalendarDays/><b>02</b><h3>Evenings together</h3><p>From quiet weekday suppers to full-table celebrations, there is always room for one more.</p></article>
        <article><Star/><b>03</b><h3>Warm hospitality</h3><p>Attentive without hovering, thoughtful without ceremony. This is your table for the evening.</p></article>
      </div>
    </section>

    <section className="testimonial"><Quote/><p>“Food should not only fill the plate.<br/>It should stay with you.”</p><span>— THE INDIAN KITCHEN PHILOSOPHY</span></section>

    <section id="contact" className="visitSection"><div className="visitImage"/><div className="visitCopy"><p className="sectionKicker">VISIT US</p><h2>Your table<br/><em>is waiting.</em></h2><div className="contactLine"><MapPin/><p><b>12 Park Street</b><br/>Kolkata, West Bengal</p></div><div className="contactLine"><Phone/><p><b>+91 98765 43210</b><br/>Reservations & enquiries</p></div><div className="contactLine"><Clock3/><p><b>Daily, 12 PM — 11:30 PM</b><br/>Last kitchen order at 11 PM</p></div><a className="reserveButton" href="tel:+919876543210">RESERVE A TABLE <ArrowRight/></a></div></section>

    <footer className="siteFooter"><Link className="siteLogo" href="/"><i>IK</i><span>INDIAN<small>KITCHEN</small></span></Link><p>Authentic recipes · Generous tables · Kolkata</p><div><a href="#"><Instagram/></a><a href="#contact"><MapPin/></a></div><small>© 2026 Indian Kitchen. All rights reserved.</small></footer>
  </main>;
}
