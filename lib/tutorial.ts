import type {Input} from './schema';
export type TutorialStep='theme'|'mode'|'details'|'target'|'count'|'now-year'|'future-year'|'age'|'ratio'|'account'|'template'|'color'|'tone'|'reference'|'quality'|'generate'|'edit'|'images'|'caption'|'save'|'download'|'open-library'|'library';
export type TutorialHint={id:TutorialStep;title:string;body:string;action?:boolean;optional?:boolean};
export function tutorialSteps(mode:Input['mode']):TutorialHint[]{return [
  {id:'theme',title:'まずは、テーマを入力しましょう',body:'どんな投稿にしたいですか？ 日常の出来事や伝えたいことを、あなたの言葉で２文字以上入力してください。例：寝かしつけのあとに気づいた、今日の小さな幸せ。'},
  {id:'mode',title:'伝え方のモードを選びましょう',body:'物語１は水彩の物語、物語２はゆるい漫画。思いを綴る・情報を伝える・いまと未来・言い換えも選べます。気になる伝え方を選んでください。'},
  {id:'details',title:'もう少し詳しい内容も伝えられます',body:'入れたい出来事・会話・伝えたい気持ちがあれば書いてみましょう。実体験がある場合は、その内容を書くと文章に反映されます。まだ決まっていなければ空欄で進めます。',optional:true},
  {id:'target',title:'誰に届けたい投稿ですか？',body:'「２歳の子のイヤイヤ期に悩むママ」など、読んでほしい相手を具体的に書いてみましょう。相手に合わせた言葉になります。空欄でも進めます。',optional:true},
  {id:'count',title:'投稿の枚数を選びましょう',body:'迷ったら６枚がおすすめです。枚数が多いほど内容を分けて伝えられます。モードによって生成する背景の数とAPI利用料も変わります。'},
  ...(mode==='comparison'?[{id:'now-year' as const,title:'いまの年を決めましょう',body:'比較する「いま」の年です。画像の年表示に使います。'},{id:'future-year' as const,title:'何年後と比べますか？',body:'現在より後の年を選びましょう。同じ家族や場所の暮らしの変化を描きます。'}]:[]),
  {id:'age',title:'登場する大人の見た目を選びます',body:'初期値は30代です。「届けたい相手」の年齢とは別で、イラストに登場する大人の見た目を決める設定です。'},
  {id:'ratio',title:'画像の形を選びましょう',body:'Instagramのフィード投稿なら4:5がおすすめです。正方形や9:16も選べます。'},
  {id:'account',title:'普段の発信内容も添えられます',body:'「子育ての声かけ」「親子の会話」など、今後も届けたい発信内容があれば入力します。フォロー案内に使います。空欄でも大丈夫です。',optional:true},
  {id:'template',title:'投稿の雰囲気を選びましょう',body:'ペタル・リーフ・インクから、好みのデザインを選べます。あとから変更もできます。'},
  {id:'color',title:'メインカラーを選べます',body:'投稿のアクセントになる色です。気に入った色に変えても、そのままでも大丈夫です。'},
  {id:'tone',title:'文章の雰囲気を選びましょう',body:'親しみやすく、落ち着いて、明るく、簡潔に。伝えたい相手や思いに合う雰囲気を選びます。'},
  {id:'reference',title:'参考画像があれば添えられます',body:'色使いや雰囲気の参考にしたい画像を設定できます。必須ではありません。画像は生成時にOpenAIへ送信されるので、使ってよいものを選んでください。',optional:true},
  {id:'quality',title:'生成する画像の品質を選びます',body:'最初は「お試し（低コスト）」がおすすめです。品質を上げるとAPI利用料も変わります。'},
  {id:'generate',title:'入力できたら、実際に文章を生成します',body:'下の「AIで投稿の構成をつくる」を押してください。ここからは実際のAI生成で、API利用料がかかります。チュートリアルの案内自体は無料です。生成に失敗した場合は、入力を確認して同じボタンからやり直せます。',action:true},
  {id:'edit',title:'生成した文章は、そのまま編集できます',body:'スライドを選び、文章や改行を直してみましょう。字体・色・文字の大きさなども変更できます。文字やデザインの編集でAPI料金はかかりません。'},
  {id:'images',title:'文章が整ったら、背景を生成しましょう',body:'実際の「背景をつくる」ボタンでイラストを生成します。画像生成にはAPI利用料がかかります。未生成の背景だけを作れるので、失敗したときも完成済みの画像は残ります。お手持ちの画像を設定することもできます。',action:true},
  {id:'caption',title:'キャプションも確認しましょう',body:'Instagramの投稿に添える文章です。あなたの言葉に直したり、ハッシュタグを調整できます。'},
  {id:'save',title:'仕上がったら「保存へ進む」を押します',body:'文章と背景を確認したら、実際の「保存へ進む」ボタンからダウンロード画面へ進んでください。',action:true},
  {id:'download',title:'実際に画像をダウンロードしましょう',body:'「全スライドをZIPで保存」で画像とキャプションをまとめて保存できます。各画像のPNGボタンから１枚だけ保存することもできます。端末に保存したものを、ご自身でInstagramへ投稿します。',action:true},
  {id:'open-library',title:'あとから編集できる場所も見てみましょう',body:'「保存してマイスタジオへ」を押してください。今つくった投稿はこのブラウザに保存されていて、あとから続きを編集できます。',action:true},
  {id:'library',title:'準備完了。mellōを活用しましょう！',body:'ここがマイスタジオです。「続きから編集」で文章やデザインを直せます。新しい投稿をつくるときは「投稿をつくる」から。これからも、あなたの想いをかたちにしていきましょう。'},
];}
export function nextTutorialStep(step:TutorialStep,mode:Input['mode'],direction=1):TutorialStep{
  const steps=tutorialSteps(mode),index=steps.findIndex(s=>s.id===step);return steps[Math.max(0,Math.min(steps.length-1,index+direction))].id;
}
export function canAdvanceTutorial(step:TutorialStep,input:Input,busy:boolean):boolean{
  if(busy)return false;
  if(step==='theme')return input.theme.trim().length>=2;
  if(step==='future-year')return input.futureYear>input.nowYear;
  return !tutorialSteps(input.mode).find(s=>s.id===step)?.action;
}
export function tutorialForScreen(step:TutorialStep,phase:number,view:'editor'|'library',imagesComplete:boolean):TutorialStep{
  if(view==='library'||step==='library')return 'library';
  if(phase===2)return step==='open-library'?'open-library':'download';
  const steps=tutorialSteps('story'),index=steps.findIndex(s=>s.id===step);
  const inputStep=(index>=0&&index<=steps.findIndex(s=>s.id==='generate'))||step==='now-year'||step==='future-year';
  if(phase===1){
    if(inputStep||step==='download'||step==='open-library')return 'edit';
    if(step==='images'&&imagesComplete)return 'caption';
    return step;
  }
  return inputStep?step:'theme';
}
