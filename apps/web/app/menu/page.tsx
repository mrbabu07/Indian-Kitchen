import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function MenuEntry(){
  const token=process.env.NEXT_PUBLIC_DEFAULT_TABLE_TOKEN;
  if(token)redirect(`/menu/${token}`);
  return <main className="friendlyState"><div className="brand"><span>IK</span> Indian Kitchen</div><p className="eyebrow red">Table menu</p><h1>Scan your table QR.</h1><p>This restaurant has not configured a default preview table. Scan the QR code placed on your table to open its ordering menu.</p><Link href="/">Return home</Link></main>;
}
