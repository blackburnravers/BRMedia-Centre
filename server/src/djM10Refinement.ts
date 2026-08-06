import { DjBpmAnalysisResult } from "./djBpmAnalysis";
import { DjDownbeatAnalysisResult } from "./djDownbeatAnalysis";
import { DjDynamicAnalysisResult } from "./djDynamicAnalysis";
import { DjGridValidationResult } from "./djGridValidation";
import { DjFinalGridDecisionResult } from "./djFinalGridDecision";
import { DjKeyAnalysisResult } from "./djKeyAnalysis";
import { scoreM10Confidence } from "./djM10Confidence";
export const DJ_M10_REFINEMENT_VERSION="analysis-refinement-m10-v1";
export type DjM10Pass={id:string;bpm:DjBpmAnalysisResult;downbeat:DjDownbeatAnalysisResult;dynamic:DjDynamicAnalysisResult;grid:DjGridValidationResult;decision:DjFinalGridDecisionResult};
export function selectM10AnalysisPass(passes:DjM10Pass[],key:DjKeyAnalysisResult,previousConfidence=0){
 const scored=passes.map(pass=>{const confidence=scoreM10Confidence({transientConsistency:pass.bpm.onsetQuality,beatSpacing:pass.bpm.phaseConsistency,phraseStrength:pass.downbeat.phraseAgreement,harmonicRhythm:key.harmonicRhythm,sectionAgreement:(pass.bpm.sectionAgreement+pass.downbeat.sectionAgreement)/2,wholeTrackAgreement:pass.grid.confidenceAfter});const penalty=(pass.decision.reviewRequired?.06:0)+(pass.grid.reasonCodes.includes("sustained-early-late-drift")?.08:0);return{...pass,confidence:{...confidence,score:Math.max(0,confidence.score-penalty)}}}).sort((a,b)=>b.confidence.score-a.confidence.score);
 const selected=scored[0],improvement=selected.confidence.score-previousConfidence;
 return{version:DJ_M10_REFINEMENT_VERSION,selected,passes:scored.map(p=>({id:p.id,confidence:p.confidence.score,bpm:p.bpm.bpm,reviewRequired:p.decision.reviewRequired})),previousConfidence,newConfidence:selected.confidence.score,improvement,improvementReason:improvement>=.03?"weighted-multi-pass-solution-improved":improvement<=-.03?"new-evidence-reduced-confidence":"confidence-stable",analysisPassUsed:selected.id};
}
