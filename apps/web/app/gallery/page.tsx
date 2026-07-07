import { PageHero, PublicFooter } from '../components/PublicShell';
import GalleryGrid from './GalleryGrid';

export default function GalleryPage() {
  return <main className="publicPage">
    <PageHero eyebrow="THE GALLERY" title="A glimpse inside." copy="Plates, people and the warm glow of an evening well spent." image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c5?w=2000&q=90" />
    <section className="gallerySection"><div className="publicIntro"><p className="publicKicker">INDIAN KITCHEN, IN FRAME</p><h2>What we make.<br/><em>How it feels.</em></h2><p>Explore the food, rooms and little moments that turn dinner into a memory.</p></div><GalleryGrid /></section>
    <PublicFooter />
  </main>;
}
