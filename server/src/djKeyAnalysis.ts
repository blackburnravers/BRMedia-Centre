export const DJ_KEY_ANALYSIS_VERSION = "musical-key-chroma-m10-v1";
export type DjKeyAnalysisResult = { version: typeof DJ_KEY_ANALYSIS_VERSION; key: string | null; confidence: number; correlation: number; margin: number; harmonicRhythm: number; coverage: number; reviewRequired: boolean; reasonCodes: string[] };
const NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],MAJOR=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],MINOR=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
function corr(a:number[],b:number[]){const am=a.reduce((x,y)=>x+y,0)/12,bm=b.reduce((x,y)=>x+y,0)/12;let n=0,x=0,y=0;for(let i=0;i<12;i++){const p=a[i]-am,q=b[i]-bm;n+=p*q;x+=p*p;y+=q*q;}return x&&y?n/Math.sqrt(x*y):0;}
const rotate=(profile:number[],tonic:number)=>Array.from({length:12},(_,pitch)=>profile[(pitch-tonic+12)%12]);

export function analyseMusicalKey(samples:readonly number[],sampleRate:number):DjKeyAnalysisResult{
  const size=4096,hop=2048,totalChroma=new Array(12).fill(0),frames:number[][]=[];
  for(let start=0;start+size<=samples.length;start+=hop){const chroma=new Array(12).fill(0);let energy=0;
    for(let pitch=0;pitch<12;pitch++)for(let octave=2;octave<=6;octave++){const frequency=440*2**((pitch-9+(octave-4)*12)/12);if(frequency>=sampleRate*.46)continue;const omega=2*Math.PI*frequency/sampleRate,coefficient=2*Math.cos(omega);let q0=0,q1=0,q2=0;for(let i=0;i<size;i++){const window=.5-.5*Math.cos(2*Math.PI*i/(size-1));q0=samples[start+i]*window+coefficient*q1-q2;q2=q1;q1=q0;}const power=Math.max(0,q1*q1+q2*q2-coefficient*q1*q2);chroma[pitch]+=Math.sqrt(power);energy+=power;}
    if(energy<1e-8)continue;const sum=chroma.reduce((a,b)=>a+b,0)||1,normal=chroma.map(v=>v/sum);frames.push(normal);normal.forEach((v,i)=>totalChroma[i]+=v);
  }
  const coverage=clamp(frames.length/48);if(frames.length<6)return{version:DJ_KEY_ANALYSIS_VERSION,key:null,confidence:0,correlation:0,margin:0,harmonicRhythm:0,coverage,reviewRequired:true,reasonCodes:["insufficient-harmonic-evidence"]};
  const sum=totalChroma.reduce((a,b)=>a+b,0)||1,normal=totalChroma.map(v=>v/sum),candidates=NAMES.flatMap((name,tonic)=>[{key:name,score:corr(normal,rotate(MAJOR,tonic))},{key:`${name}m`,score:corr(normal,rotate(MINOR,tonic))}]).sort((a,b)=>b.score-a.score);
  const margin=clamp((candidates[0].score-candidates[1].score)/.18);let movement=0;for(let i=1;i<frames.length;i++)movement+=frames[i].reduce((s,v,p)=>s+Math.abs(v-frames[i-1][p]),0)/2;const harmonicRhythm=clamp(movement/Math.max(1,frames.length-1)*3),confidence=clamp(Math.max(0,candidates[0].score)*.48+margin*.32+coverage*.15+harmonicRhythm*.05),reviewRequired=confidence<.58||margin<.2;
  return{version:DJ_KEY_ANALYSIS_VERSION,key:reviewRequired?null:candidates[0].key,confidence,correlation:candidates[0].score,margin,harmonicRhythm,coverage,reviewRequired,reasonCodes:reviewRequired?["musical-key-ambiguous"]:[]};
}
