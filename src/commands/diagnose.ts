import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import k8s from '@kubernetes/client-node';
import { diagnosePod } from '../core/diagnosis';
import { verboseLogDiagnosis } from '../utils/utils';

export function registerDiagnoseCommand(program: Command) {
  program
    .command('diagnose')
    .argument('<podName>', 'Name of the pod to diagnose')
    .option('-n, --namespace <namespace>', 'Kubernetes namespace', 'default')
    .option('--context <context>', 'Kubeconfig context to use')
    .option('--verbose <verbose>', 'Enable verbose output for diagnostics')
    .option('-c, --container <name>', 'Specify container name to fetch logs from (optional)')
    .description('Diagnose a Kubernetes pod using logs, events, and AI')
    .action(
      async (
        podName: string,
        options: { namespace: string; context?: string; container?: string; verbose?: boolean },
      ) => {
        const { namespace, context, container, verbose } = options;

        const spinner = ora(`Diagnosing pod ${podName} in namespace ${namespace}...`).start();

        try {
          const kc = new k8s.KubeConfig();
          kc.loadFromDefault();

          if (context) {
            kc.setCurrentContext(context);
          }

          // Future improvement: pass `kc` to diagnosis helpers for context-aware support

          const result = await diagnosePod(podName, namespace, container);

          if (verbose) verboseLogDiagnosis(result);

          process.exit(0);
        } catch (err: any) {
          console.log(err);

          spinner.fail(`Failed to diagnose pod: ${(err as Error).message}`);
          console.error(chalk.red(err.message || err));
          process.exit(1);
        }
      },
    );
}
