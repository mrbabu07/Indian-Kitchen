import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic='force-dynamic';

export default async function MenuEntry(){
  try{
    const apiUrl=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
    const response=await fetch(`${apiUrl}/api/public/default-table`,{cache:'no-store'});
    if(response.ok){const {token}=await response.json();redirect(`/menu/${token}`)}
  }catch(error){if(typeof error==='object'&&error&&'digest' in error)throw error}
  return <main className="friendlyState"><div className="brand"><span>IK</span> Indian Kitchen</div><p className="eyebrow red">Table menu</p><h1>Scan your table QR.</h1><p>No active restaurant table is configured. Ask the restaurant team for the QR code placed on your table.</p><Link href="/">Return home</Link></main>;
}
