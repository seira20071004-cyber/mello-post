import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {writeFile,mkdir} from 'node:fs/promises';
GlobalFonts.registerFromPath(process.env.MELLO_ICON_FONT||'/System/Library/Fonts/Supplemental/Georgia.ttf','MelloWordmark');
// The app's existing flower motif, drawn as a legible home-screen mark.
await mkdir('public/icons',{recursive:true});
for(const size of [180,192,512]){const canvas=createCanvas(size,size),c=canvas.getContext('2d');c.scale(size/512,size/512);c.fillStyle='#b57584';c.fillRect(0,0,512,512);c.strokeStyle='#fff9ed';c.lineWidth=14;c.lineCap='round';c.beginPath();c.moveTo(256,282);c.quadraticCurveTo(263,330,250,354);c.stroke();
for(let i=0;i<5;i++){c.save();c.translate(256,220);c.rotate(i*Math.PI*2/5);c.fillStyle='#fff4e8';c.beginPath();c.ellipse(0,-52,39,59,0,0,Math.PI*2);c.fill();c.restore();}c.fillStyle='#d9b36d';c.beginPath();c.arc(256,220,29,0,Math.PI*2);c.fill();c.fillStyle='#f8e2db';c.beginPath();c.ellipse(284,315,34,16,-.5,0,Math.PI*2);c.fill();c.font='400 55px MelloWordmark';c.textAlign='center';c.fillStyle='#fff9ed';c.fillText('mellō',256,405);await writeFile(`public/icons/mello-${size}.png`,canvas.toBuffer('image/png'));}
