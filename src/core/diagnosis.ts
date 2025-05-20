import { SanitizedPodDiagnostics } from '../common/interface/sanitizedPodDiagnostics';

import k8s, { CoreV1Event } from '@kubernetes/client-node';
import { PodStatus } from '../common/interface/podStatus';
import { ContainerStatusSummary } from '../common/interface/containerStatus';
import { parseContainerState } from '../utils/utils';
import chalk from 'chalk';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const coreV1 = kc.makeApiClient(k8s.CoreV1Api);
const log = new k8s.Log(kc);

/**
 * Diagnoses the specified Kubernetes pod by collecting its status, recent events, and container logs.
   ====================================================================
 * This function gathers diagnostic information for a given pod in a namespace, including:
 * - Pod phase and container states
 * - Recent Kubernetes events related to the pod
 * - Recent logs from all containers (init and main), sanitized for sensitive data
 *
 * @param podName - The name of the pod to diagnose.
 * @param namespace - The namespace in which the pod resides.
 * @param container
 * @returns A promise that resolves to a `SanitizedPodDiagnostics` object containing the pod's diagnostic information.
 */
export async function diagnosePod(
  podName: string,
  namespace: string,
  container?: string,
): Promise<SanitizedPodDiagnostics> {
  const [status, events, logs] = await Promise.all([
    getPodStatus(podName, namespace),
    getPodEvents(podName, namespace),
    getContainerLogs(podName, namespace, container),
  ]);

  const sanitizedLogs = sanitizeLogs(logs);

  return {
    podName,
    namespace,
    phase: status.phase,
    containerState: status.containerStates,
    events,
    recentLogs: sanitizedLogs,
  };
}

async function getPodStatus(podName: string, namespace: string): Promise<PodStatus> {
  const pod: k8s.V1Pod = await coreV1.readNamespacedPod({
    name: podName,
    namespace,
    pretty: 'true',
  });

  const phase = pod.status?.phase || 'Unknown';

  const containerStates: ContainerStatusSummary[] = [];

  const initContainers = pod.status?.initContainerStatuses || [];
  const mainContainers = pod.status?.containerStatuses || [];

  initContainers.forEach((initContainer) => {
    containerStates.push(parseContainerState(initContainer, 'init'));
  });

  mainContainers.forEach((mainContainer) => {
    containerStates.push(parseContainerState(mainContainer, 'main'));
  });

  return { phase, containerStates };
}

/**
 * Fetches recent Kubernetes events related to the specified pod.
 * @param podName - The name of the pod to fetch events for.
 * @param namespace - The namespace in which the pod resides.
 * @returns A promise that resolves to an array of event messages related to the pod.
 */
export async function getPodEvents(podName: string, namespace: string): Promise<string[]> {
  try {
    const res = await coreV1.listNamespacedEvent({ namespace, limit: 10, timeoutSeconds: 10 });

    const events: CoreV1Event[] = res.items;

    const filteredEvents = events
      .filter((event) => event.involvedObject?.name === podName)
      .sort((a, b) => {
        const aTime = new Date(a.lastTimestamp || a.eventTime || '').getTime();
        const bTime = new Date(b.lastTimestamp || b.eventTime || '').getTime();
        return bTime - aTime;
      })
      .slice(0, 20);

    return filteredEvents.map((e) => e.message || '(no message)');
  } catch (err) {
    console.error(`Error fetching events for pod ${podName}:`, err);
    return ['Failed to fetch events'];
  }
}

/**
 * Fetches logs from the specified pod and container in a Kubernetes cluster.
 * ====================================================================
 * @param podName
 * @param namespace
 * @param container
 * @param tailLines
 * @returns
 */
export async function getContainerLogs(
  podName: string,
  namespace: string,
  container?: string,
  tailLines = 200,
): Promise<string[]> {
  try {
    const coreV1 = kc.makeApiClient(k8s.CoreV1Api);

    // Fetch pod so we can list all containers
    const pod = await coreV1.readNamespacedPod({ name: podName, namespace });
    const allContainers = [
      ...(pod.status?.initContainerStatuses || []).map((c) => ({
        name: c.name,
        type: 'init' as const,
      })),
      ...(pod.status?.containerStatuses || []).map((c) => ({
        name: c.name,
        type: 'main' as const,
      })),
    ];

    if (container) {
      // Fetch logs for the specified container only
      try {
        const rawLog = await coreV1.readNamespacedPodLog({
          name: podName,
          namespace,
          container,
          tailLines,
        });
        return rawLog
          .split('\n')
          .filter(Boolean)
          .map((line) => `[${container}] ${line}`);
      } catch (err) {
        console.error(`Error fetching logs for container ${container}:`, err);
        return [`[${container}] Failed to fetch logs`];
      }
    }

    // No container specified: try all
    const logPromises = allContainers.map(async ({ name, type }) => {
      try {
        const rawLog = await coreV1.readNamespacedPodLog({ name: podName, namespace, tailLines });

        return rawLog
          .split('\n')
          .filter(Boolean)
          .map((line) => `[${type}:${name}] ${line}`);
      } catch (err: any) {
        // 🧠 Detect the "must specify container" error and surface options

        const parsedError = JSON.parse(err?.body);
        const message = parsedError?.message || 'Please specify a container name';

        console.log(`[${type}:${name}] Failed to fetch logs`);
        console.error('Error:', chalk.red(message));

        process.exit(1);
      }
    });

    const logChunks = await Promise.all(logPromises);
    return logChunks.flat();
  } catch (err) {
    console.error(`Failed to get logs for pod ${podName}:`, err);
    return ['Failed to fetch container logs'];
  }
}

export function sanitizeLogs(logLines: string[]): string[] {
  const ipRegex = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi;
  const tokenRegex = /\b(?:eyJ[^\s"]+|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36,})\b/g;
  const ansiEscapeRegex = /\x1b\[[0-9;]*m/g;

  return logLines.map((line) =>
    line
      .replace(ipRegex, 'REDACTED_IP')
      .replace(emailRegex, 'REDACTED_EMAIL')
      .replace(tokenRegex, 'REDACTED_SECRET')
      .replace(ansiEscapeRegex, '')
      .replace(/\s{2,}/g, ' ') // collapse excessive spacing
      .trim(),
  );
}
