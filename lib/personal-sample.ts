import type {Plan} from './schema';
const illustration='Plain warm cream collage background with small lemon yellow, coral and teal paper circles in corners, lots of negative space in upper and lower center for text and an uploaded portrait, no people, faces, text or numbers';
export const personalSample:Plan={title:'今日も、わたしのペースで',artDirection:illustration,items:[],followCTA:'',caption:'これは操作を試すための架空の作例です。写真や口癖を加えて、自分らしい投稿にしてみましょう。 #子育て #日常 #自分らしく',slides:[
 {title:'今日も、\nわたしのペースで',body:''},
 {title:'',body:'朝から予定がぎゅうぎゅう。\nとりあえず、お茶だけは飲もう。'},
 {title:'',body:'鏡の前で、ちょっと変顔。\n……うん、顔は元気そう。'},
 {title:'',body:'全部ちゃんとは無理やけど、\n今日は今日の私でいきます。'},
 {title:'',body:'気合いを入れる日も、\n力を抜く日もあっていいよね。'},
 {title:'',body:'さて、まずはお茶。\nみんなは、何から始める？'},
].map((s,i)=>({...s,emphasis:'',nextTeaser:'',illustration,layout:i===0?'cover':i===5?'summary':'editorial',itemIds:[]}))};
