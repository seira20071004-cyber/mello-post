import type { Plan } from './schema';
// Explicit, offline sample. Never returned as an AI generation result.
export const samplePlan: Plan = {
  title: '40代からの、わたしをいたわる美容習慣5選',
  followCTA:'無理なく続ける大人の美容のヒントを、これからも。次の投稿も読みたい方はフォローしてね。',
  artDirection: 'Elegant editorial watercolor, dusty rose, warm beige, ivory, gentle botanical shadows; calm adult women and unbranded skincare objects. No text.',
  items: [
    {id:1,title:'うるおいを、やさしく守る',body:'洗顔後は、肌に合った保湿を。こすらず、手のひらでそっとなじませましょう。'},
    {id:2,title:'紫外線対策を、毎日の習慣に',body:'日焼け止めは表示に沿って使い、帽子や日傘も組み合わせて。外で過ごす日は塗り直しも意識して。'},
    {id:3,title:'眠る前に、ひと息つく',body:'寝る前は照明を落として、ゆったり過ごす時間を。自分に合った睡眠のリズムを大切に。'},
    {id:4,title:'食卓に、いろいろな彩りを',body:'主食・主菜・副菜を組み合わせ、無理なくバランスよく。特定の食材だけに偏らないことが大切です。'},
    {id:5,title:'鏡の前で、自分にやさしく',body:'年齢による変化も、自分らしさのひとつ。小さな心地よさを見つけながら、続けられるケアを。'},
  ],
  slides: [
    {title:'がんばりすぎていない？\n40代からの美容習慣5選',body:'がんばりすぎず、心地よく。\n今日からできる小さなケア。',emphasis:'毎日に、やさしいひと工夫',illustration:'A graceful woman in her forties with a natural relaxed expression, linen blouse, watercolor camellia blossoms, unbranded skincare bottle.',layout:'cover',itemIds:[],nextTeaser:'まずは、朝と夜に肌を守る二つのケアから'},
    {title:'肌を守る、\n朝と夜のひと手間',body:'毎日少しずつ、肌にやさしい習慣を。',emphasis:'肌に合うものを選んで',illustration:'Unbranded ceramic skincare bottles and a linen sun hat, delicate botanical flowers.',layout:'editorial',itemIds:[1,2],nextTeaser:'ケアを終えたら、次は休む時間を整えて'},
    {title:'一日の終わりに、\n休むための時間を',body:'心地よい夜のリズムを整えましょう。',emphasis:'夜は、ゆっくり自分の時間',illustration:'A ceramic tea cup and linen pillow in a quiet warm bedroom, lavender sprigs.',layout:'split',itemIds:[3],nextTeaser:'休息だけでなく、食卓でもできることは？'},
    {title:'食卓の彩りを、\n少しだけ豊かに',body:'できることから、無理なく続けて。',emphasis:'バランスよく、楽しんで',illustration:'A beautiful ceramic plate of colorful vegetables, grains, and fish on a linen table.',layout:'editorial',itemIds:[4],nextTeaser:'習慣を続けるために大切な、もう一つのこと'},
    {title:'自分らしい美しさを、\n大切にする',body:'小さな積み重ねを、自分のペースで。',emphasis:'心地よさを、いちばんに',illustration:'A graceful mature woman looking softly at a small hand mirror, no visible hands, warm watercolor flowers.',layout:'split',itemIds:[5],nextTeaser:'最後に、今日から始めるポイントをおさらい'},
    {title:'今日のわたしに、\nできることから。',body:'保湿・紫外線対策・睡眠・食事・自分をいたわる気持ち。\n\nひとつずつ、あなたのペースで始めてみませんか。',emphasis:'保存して、明日の習慣に',illustration:'Five delicate camellia blossoms and a folded linen cloth, calm warm beige still life.',layout:'summary',itemIds:[],nextTeaser:''},
  ],
  caption: '毎日のケア、ついがんばりすぎていませんか？🌷\n\n40代からは、自分の心地よさを大切にした美容習慣を。\n\n1. 肌に合った保湿をやさしく\n2. 日焼け止めや日傘で紫外線対策\n3. 眠る前にゆったり過ごす時間を\n4. 食卓のバランスと彩りを意識\n5. 自分らしさを大切にする\n\nまずはひとつ、続けられそうなことから。肌の状態には個人差があります。気になる症状があるときは専門家へ相談してくださいね。\n\nあとで見返せるように保存して、あなたの習慣もコメントで教えてください。\n\n#40代美容 #大人の美容 #美容習慣 #暮らしを楽しむ #自分を大切に',
};
