'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  return <main className="friendlyState"><div className="brand"><span>IK</span> Indian Kitchen</div><AlertTriangle/><p className="eyebrow red">Something went wrong</p><h1>We dropped a plate.</h1><p>The page could not be prepared right now. Your order and payment information remain safe.</p><button onClick={reset}><RefreshCw/> Try again</button></main>;
}
