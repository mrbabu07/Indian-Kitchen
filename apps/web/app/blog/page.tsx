import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { PageHero, PublicFooter } from '../components/PublicShell';

const posts = [
  { category:'From the kitchen', date:'June 28, 2026', title:'Why great biryani asks you to wait', copy:'A look at dum cooking, fragrant rice and the patient layering behind our house biryani.', image:'/images/menu/chicken-biryani.jpg' },
  { category:'Ingredients', date:'June 12, 2026', title:'The quiet magic of a freshly ground masala', copy:'Whole spices, careful heat and why aroma begins long before the pan reaches the flame.', image:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=90' },
  { category:'People', date:'May 25, 2026', title:'Meet the hands behind the tandoor', copy:'A conversation about fire, instinct and the rhythm of a busy dinner service.', image:'/images/menu/tandoori-chicken.jpg' },
  { category:'Kolkata', date:'May 8, 2026', title:'An evening on Park Street', copy:'Music, rain, old neon and the enduring pleasure of dinner in the city.', image:'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&q=90' },
];

export default function BlogPage() {
  const [featured,...rest]=posts;
  return <main className="publicPage">
    <PageHero eyebrow="THE INDIAN KITCHEN JOURNAL" title="Stories from our table." copy="Recipes, rituals and people who make this place feel like home." image="https://images.unsplash.com/photo-1547592180-85f173990554?w=2000&q=90" />
    <section className="journalSection">
      <div className="publicIntro"><p className="publicKicker">OUR JOURNAL</p><h2>Pull up a chair.<br/><em>There is more to share.</em></h2></div>
      <article className="featuredPost"><img src={featured.image} alt=""/><div><p>{featured.category}</p><span><CalendarDays />{featured.date}</span><h2>{featured.title}</h2><p>{featured.copy}</p><Link href="/reservation">Experience it at our table <ArrowRight /></Link></div></article>
      <div className="postGrid">{rest.map(post => <article key={post.title}><img src={post.image} alt=""/><div><p>{post.category}</p><span>{post.date}</span><h3>{post.title}</h3><p>{post.copy}</p><Link href="/reservation">Read at the table <ArrowRight /></Link></div></article>)}</div>
    </section>
    <PublicFooter />
  </main>;
}
