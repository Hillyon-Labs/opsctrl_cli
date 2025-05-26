import { ContainerStatusSummary } from './containerStatus';

export interface SanitizedPodDiagnostics {
  podName: string;
  namespace: string;
  phase: string;
  containerState: ContainerStatusSummary[];
  events: string[];
  recentLogs: string[];
}

export type DiagnoseOutcome = {
  result: SanitizedPodDiagnostics;
  warnings: string[];
};
