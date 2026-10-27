import type {Plan} from './schema';
import {storySample} from './reading-samples';
const cartoon='Original rounded cartoon line art, flat pastel colors, clear charcoal outlines, white background. Mother around 32 with tied brown hair and a sage shirt; small son with a pale yellow jacket. Characters in the lower half. Upper central 45 percent empty. No text or effects lettering.';
const comicBodies=['','お迎えの帰り道。私の頭は、夕飯のことでいっぱいだった。','息子は立ち止まり、拾った葉っぱを袋にしまっていた。','「一枚だけにしようね」そう言うと、息子は袋をのぞきこんだ。','一枚を差し出して言った。\n「これ、ママに似合う色」\n私はそっと受け取った。','私が夕飯のことを考えていた帰り道。\nこの子は、私に似合う色を考えていた。\n\n親子の日々をフォローで。'];
export const comicSample:Plan={...storySample,title:'帰り道の小さなおみやげ',artDirection:cartoon,slides:comicBodies.map((body,i)=>({...storySample.slides[i],title:i===0?'葉っぱを一枚だけ\n選んだ理由':'',body,illustration:cartoon+' Scene: a mother and son returning home with a little bag of collected leaves.'})),caption:'帰り道の、ささやかな贈りものを描いた創作の漫画です。\n今日の小さな出来事を、また読みたい方はフォローしていただけたらうれしいです。\n#子育て #親子の時間 #日常漫画'};
const card='Original small needlework-like mother and child motif at the bottom 25 percent of a warm ivory paper background. Very subtle fabric texture. Upper 75 percent almost plain and clear. Mother in her 30s, gentle silhouette. No writing, logos or signatures.';
const words=['','次の予定を急かすより、\n見つけた葉っぱを一緒に見る。','先に答えを教えるより、\n話し終えるまで耳を傾ける。','うまく描けたか聞くより、\n描いている横顔を見つめる。','もっとゆっくり向き合えたら。\n寝顔を見て、そう思う夜がある。','その思いに気づいた今から、\nまた話を聞く時間をつくれる。'];
export const quoteSample:Plan={...storySample,quoteFlow:'contrast-resolution-v1',title:'今日のやさしさをひとつ',artDirection:card,slides:words.map((body,i)=>({...storySample.slides[i],title:i===0?'今日のやさしさを\nひとつだけ':'',body,illustration:i===words.length-1?'Original closing card, soft pale rose fabric border and large plain ivory paper area in the upper center. Quiet morning light, no people, writing, logos or signatures.':card})),caption:'毎日の小さな場面を見つめる、オリジナルのことばです。\n今日の自分に渡したい言葉を、ひとつ見つけてもらえたらうれしいです。\nこうした言葉をまた読みたい方はフォローしてお待ちください。\n#日々の気づき #子育て #自分のペース'};
const places=['家族の車','休日の公園','旅行の支度','朝の食卓','海辺の散歩','夕方の玄関'];
const presentScenes=[
 'The family driveway with an oak fence and one large tree. A family minivan with its tailgate open, two child seats visible, a stroller and several colorful bags. Parents around 32 and 34 help two preschool children get ready.',
 'A park with a large tree, a pond and a bench. Young parents play ball with small children, a stroller and picnic luggage nearby.',
 'A bedroom with a blue window curtain. Parents in their thirties pack a large suitcase with children, small shoes and a stuffed toy beside it.',
 'A dining table beside the same garden window. Parents help small children eat, with booster seats and several small cups.',
 'A seaside path beside a white railing and lighthouse. Young parents carry beach toys while small children run ahead.',
 'A home entry with an oak bench and narrow window. Parents help children remove small boots, with outdoor bags and a toy on the floor.'
];
const futureScenes=[
 'The same driveway, oak fence and tree from the same viewpoint. Parents now around 52 and 54 prepare a compact car for a relaxed outing, with two small bags. No child seats or stroller. Their adult children live independently.',
 'The same park tree, pond and bench from the same viewpoint. Parents in their fifties enjoy coffee on the bench with two cups and one light bag, with space for a quiet walk.',
 'The same bedroom and blue curtain. Parents in their fifties close two small travel bags, ready to leave together at an unhurried pace.',
 'The same dining table and garden window. Parents in their fifties share breakfast with two regular cups, with no booster seats.',
 'The same seaside path, railing and lighthouse from the same viewpoint. Parents in their fifties walk together, carrying only a small shoulder bag.',
 'The same entry, oak bench and narrow window. Parents in their fifties put down two light bags and adult shoes after a peaceful outing.'
];
export const comparisonSample:Plan={...storySample,title:'休日の景色が変わるころ',artDirection:'Original warm watercolor everyday life, consistent muted rose and soft natural light. Same recognizable location landmarks within each pair. People may appear and age naturally. No text, dates or collages.',slides:places.map((place,i)=>({...storySample.slides[i],title:i===0?'休日の景色が変わるころ':'',body:'',illustration:presentScenes[i]+' No writing or dates.'})),comparisons:places.map((place,i)=>({place,camera:'Fixed eye-level wide view. Keep the same background landmarks and camera position; vehicles, people and activities can change.',nowIllustration:presentScenes[i]+' No writing or dates.',futureIllustration:futureScenes[i]+' No writing or dates.',nowCaption:'',futureCaption:''})),caption:'今の休日と、子どもが成長した先の休日を想像した創作イラストです。\nその時々で変わる家族の暮らしと楽しみを描いています。未来は人それぞれ。\nこうした日々の気づきをまた読みたい方はフォローしていただけたらうれしいです。\n#親子の時間 #家族の休日 #想像の未来'};
