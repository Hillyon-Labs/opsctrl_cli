import { ContainerStatusSummary } from './containerStatus';

export interface PodStatus {
  phase: string;
  containerStates: ContainerStatusSummary[];
}
