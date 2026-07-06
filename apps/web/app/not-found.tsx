import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound(){return <main className="friendlyState"><div className="brand"><span>IK</span> Indian Kitchen</div><p className="eyebrow red">404 · Not found</p><h1>This table is empty.</h1><p>The page or table link you followed is unavailable.</p><Link href="/"><ArrowLeft/> Return home</Link></main>}
