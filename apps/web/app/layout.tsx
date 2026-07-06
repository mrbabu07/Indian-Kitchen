import type { Metadata } from 'next'; import { Cormorant_Garamond, Manrope } from 'next/font/google'; import './globals.css';
const display=Cormorant_Garamond({subsets:['latin'],variable:'--display',weight:['500','600','700']});const body=Manrope({subsets:['latin'],variable:'--body'});
export const metadata:Metadata={title:'Indian Kitchen — Authentic Indian Dining',description:'Order at your table. Fresh from our kitchen.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>}
