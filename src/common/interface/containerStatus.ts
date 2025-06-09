export interface ContainerStatusSummary {
  name: string;
  type: 'init' | 'main';
  state: string;
  reason?: string;
}
