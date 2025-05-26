export type Rule = {
  id: string;
  match: {
    logs?: MatchLine[];
    events?: MatchLine[];
    containerStates?: string[];
  };
  diagnosis: {
    confidence_score: number;
    diagnosis_summary: string;
    suggested_fix: string;
    incident_tags: string[];
  };
};

export type MatchLine = string | { type: 'string' | 'regex'; value: string };

export type LocalDiagnosisResult = Rule['diagnosis'] & {
  matched: true;
  ruleId: string;
};

export type PreliminaryCheckOutcome =
  | { handled: true; result: LocalDiagnosisResult }
  | { handled: false; reason: 'low-confidence'; match: LocalDiagnosisResult };
