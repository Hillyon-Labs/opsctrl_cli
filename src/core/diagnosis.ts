import { SanitizedPodDiagnostics } from '../common/interface/sanitizedPodDiagnostics';

import k8s, { CoreV1Event } from '@kubernetes/client-node';
import { PodStatus } from '../common/interface/podStatus';
import { ContainerStatusSummary } from '../common/interface/containerStatus';
import { parseContainerState, printErrorAndExit } from '../utils/utils';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import perfomance from 'perf_hooks';

import {
  LocalDiagnosisResult,
  MatchLine,
  PreliminaryCheckOutcome,
  Rule,
} from '../common/interface/rules';
import { runFurtherDiagnosis } from './client';

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
): Promise<SanitizedPodDiagnostics | any> {
  const start = performance.now();

  const [status, events, logs] = await Promise.all([
    getPodStatus(podName, namespace),
    getPodEvents(podName, namespace),
    getContainerLogs(podName, namespace, container),
  ]);

  const sanitizedLogs = sanitizeLogs(logs);

  const localMatch = runLocalDiagnosis(status.containerStates, events, sanitizedLogs);

  if (localMatch) {
    const outcome = handlePreliminaryDiagnostic(localMatch);

    if (outcome.handled) {
      console.log(`\n ${chalk.green(`Suggested Fix : ${outcome.result.suggested_fix}`)}`);
    }
  }

  const response = await runFurtherDiagnosis({
    podName,
    namespace,
    logs: sanitizedLogs,
    events: events,
    phase: status.phase,
    containerState: status,
  });

  console.log(`\n✅ ${chalk.green(response)}`);

  const end = performance.now();
  const durationSeconds = ((end - start) / 1000).toFixed(1);
  console.log(`\n⏱ Resolved in ${durationSeconds}s`);

  process.exit(0);
}

async function getPodStatus(podName: string, namespace: string): Promise<PodStatus> {
  try {
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
  } catch (error: any) {
    const parsedError = JSON.parse(error?.body);
    const message = parsedError?.message ?? 'Failed to fetch pod status';

    printErrorAndExit(message);
  }
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
    console.log(err);

    console.error(`\n ${chalk.red(`Error fetching events for pod ${podName}`)}`);

    printErrorAndExit(`Error fetching events for pod ${podName}`);
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
        printErrorAndExit(`Error fetching logs for container ${container}`);
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

        console.log(`\n [${type}:${name}] Failed to fetch logs`);
        printErrorAndExit(`${chalk.red(message)}`);
      }
    });

    const logChunks = await Promise.all(logPromises);
    return logChunks.flat();
  } catch (err: any) {
    const parsedError = JSON.parse(err?.body) ?? null;
    const message = parsedError?.message || 'Failed to fetch logs';

    printErrorAndExit(message);
  }
}

export function runLocalDiagnosis(
  containerStates: ContainerStatusSummary[],
  events: string[],
  logs: string[],
): LocalDiagnosisResult | null {
  const ruleFiles = loadAllRules(); // JSON objects from rules folder

  const allHealthy =
    containerStates.every(
      (cs) => cs.state === 'Running' || cs.state.startsWith('Terminated: Completed'),
    ) && events.length === 0;

  if (allHealthy) {
    console.log(chalk.green(`✅ Pod appears healthy. No issues detected.`));
    process.exit(0);
  }

  for (const rule of ruleFiles) {
    const matchingContainerState = rule.match.containerStates?.some((state: any) =>
      containerStates.some((cs) => cs.state.includes(state)),
    );

    const matchLogs = rule.match.logs?.some((matcher: any) =>
      logs.some((line) => matchLine(line, matcher)),
    );

    const matchEvents = rule.match.events?.some((matcher: any) =>
      events.some((line) => matchLine(line, matcher)),
    );

    if (matchingContainerState || matchLogs || matchEvents) {
      return {
        ...rule.diagnosis,
        matched: true,
        ruleId: rule.id,
      };
    }
  }

  console.info(
    chalk.yellow(
      '\n INFO: Preliminary diagnostics found no matching errors escalation in progress.',
    ),
  );
  return null;
}

function matchLine(line: string, matcher: MatchLine): boolean {
  if (!line || !matcher) return false;

  if (typeof matcher === 'string') {
    return line.toLowerCase().includes(matcher.toLowerCase());
  }

  if (!matcher.value) return false;

  try {
    return matcher.type === 'regex'
      ? new RegExp(matcher.value, 'i').test(line)
      : line.toLowerCase().includes(matcher.value.toLowerCase());
  } catch {
    return false;
  }
}

export function loadAllRules(): Rule[] {
  const rulesPath = path.join(__dirname, '../common/rules/rules.json');
  const data = fs.readFileSync(rulesPath, 'utf-8');
  const rules = JSON.parse(data);

  rules.forEach((rule: Rule, i: number) => {
    if (!rule.id || !rule.diagnosis || typeof rule.diagnosis.diagnosis_summary !== 'string') {
      console.warn(`Invalid rule format at index ${i}`);
    }
  });

  if (!Array.isArray(rules)) {
    console.warn('Expected rules.json to contain an array of rules.');
  }

  return rules;
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

export function handlePreliminaryDiagnostic(match: LocalDiagnosisResult): PreliminaryCheckOutcome {
  const { confidence_score, diagnosis_summary } = match;

  if (confidence_score >= 0.92) {
    console.log(chalk.green(`\n ✅ Diagnosis locked: ${diagnosis_summary}`));
    return { handled: true, result: match };
  }

  console.log(chalk.yellow(`\n ⚠️  Preliminary diagnosis: ${diagnosis_summary}`));
  console.log(
    chalk.gray(`\n 🔍We’re double-checking logs and cluster context to refine this result...`),
  );

  return { handled: false, reason: 'low-confidence', match };
}
