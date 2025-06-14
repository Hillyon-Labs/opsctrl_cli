import { PodStatus } from './podStatus';

export interface DiagnoseRequest {
  podName: string;
  namespace: string;
  logs: string[];
  events?: string[];
  phase?: string;
  containerState?: PodStatus; // refine if needed
}

export interface CredentialsFile {
  authenticated: boolean;
  token: string;
  user_id: string;
  first_name?: string;
}
