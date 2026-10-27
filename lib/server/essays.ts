import type {Input,Plan} from '../schema';
export const essaySummaryDirection=`【最後の１枚は、思いのまとめとフォロー案内】
表紙と本文を読んだ人に、結局何を伝えたかったかを最後のsummaryのbodyで明確にする。本文の中心となる思いを一つ決め、最後はそれを短く言い切るか、読者が持ち帰れる一文にまとめる。最後に新しい主張・別の悩み・別の話題を足さず、単なる「大丈夫」「それでいい」だけにもせず、何がどう大切なのかを本文から回収する。本文の柔らかい語り口と余韻を残し、説教や長い箇条書きにはしない。
最後の同じbodyに、空行で分けて短いフォロー案内を添える。必ず「フォロー」を含め、キャプションだけへ移さない。input.accountTopicがあればその発信内容、空欄なら今回のテーマに関連する思いや気づきを次も読めることを伝える。偽の実績・肩書き・投稿頻度は作らない。例文はコピーせず、本文の主旨に合わせる。followCTAフィールドは空にし、画像内に専用の広告帯は作らない。
枚数はcomposition.slideCountを厳守。最後の１枚をまとめに使い、ページを追加して指定枚数を超えない。７枚なら「表紙１枚＋思いを綴る本文５枚＋まとめとフォロー１枚」。ほかの指定枚数でも、表紙と最後を確保して本文を配分する。`;
export function essayEndingIssues(plan:Plan,input:Pick<Input,'mode'>):string[]{
  if(input.mode!=='essay')return [];
  const ending=plan.slides.at(-1),issues:string[]=[];
  if(ending?.layout!=='summary')issues.push('エッセイの最後は、伝えたかった思いをまとめるスライドにしてください');
  if(!ending?.body.includes('フォロー'))issues.push('エッセイの最後のまとめ本文に、短いフォロー案内を入れてください');
  const summary=(ending?.body||'').split(/\n+/).filter(line=>!line.includes('フォロー')).join('').trim();
  if(summary.length<12)issues.push('エッセイの最後はフォロー案内だけにせず、本文で伝えたかった思いをまとめてください');
  return issues;
}
