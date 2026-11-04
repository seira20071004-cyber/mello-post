import type { Metadata } from 'next';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/600.css';
import '@fontsource/noto-serif-jp/400.css';
import '@fontsource/noto-serif-jp/600.css';
import '@fontsource/zen-maru-gothic/400.css';
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/yomogi/400.css';
import '@fontsource/kaisei-decol/400.css';
import '@fontsource/kaisei-decol/700.css';
import './globals.css';
export const metadata:Metadata={title:'mellō — 想いが伝わる、投稿づくり',description:'テーマから文章、イラスト、デザインまで。あなたらしいInstagram投稿を、やさしく作るAIスタジオ。',robots:{index:false,follow:false},manifest:'/manifest.webmanifest',icons:{icon:'/icons/mello-192.png',apple:'/icons/mello-180.png'},appleWebApp:{capable:true,title:'mellō',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>;}
