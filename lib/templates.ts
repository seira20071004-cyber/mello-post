import type { Input } from './schema';
export const templates = {
  petal: {name: 'ペタル', label: '上品なピンク・ベージュ', english: 'PETAL', bg: '#fbf3ed', paper: '#fffaf7', accent: '#ba7886', ink: '#513a3e', muted: '#806a6b', line: '#dfc1bd', font: 'Noto Serif JP', style: 'delicate editorial watercolor, dusty rose and warm beige, refined botanical details, graceful adult characters, soft natural lighting', radius: 38},
  leaf: {name: 'リーフ', label: 'ナチュラル・シンプル', english: 'LEAF', bg: '#f1f2e9', paper: '#fafaf5', accent: '#7c8c70', ink: '#354334', muted: '#65715e', line: '#c5cfbb', font: 'Noto Serif JP', style: 'airy hand-painted natural editorial illustration, sage green, oat and ivory, botanical leaves, organic textures, soft daylight', radius: 70},
  ink: {name: 'インク', label: 'モダン・スタイリッシュ', english: 'INK', bg: '#eeeae4', paper: '#faf8f5', accent: '#6a6479', ink: '#2b2b37', muted: '#686471', line: '#c2becb', font: 'Noto Sans JP', style: 'sophisticated modern editorial illustration, muted charcoal, stone, lilac, architectural composition, minimal restrained details', radius: 10},
} as const;
export function tokens(input: Pick<Input, 'template' | 'color'>) { return {...templates[input.template], accent: input.color}; }
export function readableInk(color: string) {
  const rgb = color.slice(1).match(/../g)!.map(n => parseInt(n,16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] > .179 ? '#241e24' : '#ffffff';
}
