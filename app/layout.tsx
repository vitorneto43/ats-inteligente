import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = {title:'ATS Inteligente',description:'Personalização de currículos com IA, baseada em fatos'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}