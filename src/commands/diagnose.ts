import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import k8s from '@kubernetes/client-node';
import { diagnosePod } from '../core/diagnosis';

export function registerDiagnoseCommand(program: Command) {
  program
    .command('diagnose')
    .argument('<podName>', 'Name of the pod to diagnose')
    .option('-n, --namespace <namespace>', 'Kubernetes namespace', 'default')
    .option('--context <context>', 'Kubeconfig context to use')
    .option('-c, --container <name>', 'Specify container name to fetch logs from (optional)')
    .description('Diagnose a Kubernetes pod using logs, events, and AI')
    .action(
      async (
        podName: string,
        options: { namespace: string; context?: string; container?: string },
      ) => {
        const { namespace, context, container } = options;

        const spinner = ora(`Diagnosing pod ${podName} in namespace ${namespace}...`).start();

        try {
          const kc = new k8s.KubeConfig();
          kc.loadFromDefault();

          if (context) {
            kc.setCurrentContext(context);
          }

          // Future improvement: pass `kc` to diagnosis helpers for context-aware support

          const result = await diagnosePod(podName, namespace, container);

          console.log(`\n${chalk.red('🚨 Pod Phase:')} ${result.phase}`);

          console.log(chalk.yellow('📦 Containers:'));
          for (const state of result.containerState) {
            console.log(`- [${state.type}] ${state.name}: ${state.state}`);
          }

          if (result.events.length) {
            console.log(chalk.cyan('\n🧾 Events:'));
            result.events.forEach((e) => console.log(`- ${e}`));
          }

          if (result.recentLogs.length) {
            console.log(chalk.green('\n📜 Logs (Sanitized):'));
            result.recentLogs.slice(0, 15).forEach((line) => console.log(line));
          }

          spinner.succeed(`Successfully diagnosed pod ${podName}`);
          process.exit(0);
        } catch (err: any) {
          spinner.fail(`Failed to diagnose pod: ${(err as Error).message}`);
          console.error(chalk.red(err.message || err));
          process.exit(1);
        }
      },
    );
}
