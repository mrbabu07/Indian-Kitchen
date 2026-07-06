import type { Metadata } from 'next'; import { Cormorant_Infant, Josefin_Sans } from 'next/font/google'; import './globals.css'; import './menu-experience.css'; import './role-controls.css';
const display=Cormorant_Infant({subsets:['latin'],variable:'--display',weight:['500','600','700']});const body=Josefin_Sans({subsets:['latin'],variable:'--body',weight:['300','400','500','600','700']});
export const metadata:Metadata={title:'Indian Kitchen — Authentic Indian Dining',description:'Order at your table. Fresh from our kitchen.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>}
