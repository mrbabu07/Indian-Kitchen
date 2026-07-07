'use client';

import { useMemo, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

const photos = [
  { category: 'Food', title: 'From the tandoor', src: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=1200&q=90' },
  { category: 'Ambience', title: 'Evenings at Indian Kitchen', src: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1400&q=90' },
  { category: 'Food', title: 'The house biryani', src: '/images/menu/chicken-biryani.jpg' },
  { category: 'People', title: 'Tables made for sharing', src: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=1200&q=90' },
  { category: 'Food', title: 'Slow-cooked comfort', src: '/images/menu/butter-chicken.jpg' },
  { category: 'Ambience', title: 'A quiet corner', src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c5?w=1200&q=90' },
  { category: 'Food', title: 'Sweet endings', src: '/images/menu/baked-rasgulla.jpg' },
  { category: 'People', title: 'Dinner together', src: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&q=90' },
  { category: 'Ambience', title: 'Warm light, long nights', src: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=90' },
];

export default function GalleryGrid() {
  const [filter, setFilter] = useState('All'); const [selected, setSelected] = useState<any>();
  const visible = useMemo(() => filter === 'All' ? photos : photos.filter(photo => photo.category === filter), [filter]);
  return <>
    <div className="galleryFilters">{['All','Food','Ambience','People'].map(value => <button className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} key={value}>{value}</button>)}</div>
    <div className="galleryGrid">{visible.map((photo, index) => <button className={index % 5 === 1 ? 'galleryTall' : ''} onClick={() => setSelected(photo)} key={photo.title}><img src={photo.src} alt={photo.title}/><span><small>{photo.category}</small><b>{photo.title}</b><Maximize2 /></span></button>)}</div>
    {selected && <div className="galleryLightbox" onClick={() => setSelected(undefined)}><button aria-label="Close"><X /></button><img src={selected.src} alt={selected.title}/><p>{selected.title}</p></div>}
  </>;
}
