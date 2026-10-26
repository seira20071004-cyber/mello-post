import type { Metadata } from 'next';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/600.css';
import '@fontsource/noto-serif-jp/400.css';
import '@fontsource/noto-serif-jp/600.css';
import './globals.css';
export const metadata:Metadata={title:'mellō — 想いが伝わる、投稿づくり',description:'テーマから文章、イラスト、デザインまで。あなたらしいInstagram投稿を、やさしく作るAIスタジオ。',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>;}
