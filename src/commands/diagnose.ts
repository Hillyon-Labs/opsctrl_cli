import { Command } from 'commander';
import ora from 'ora';
import { DEFAULT_API_URL, loadConfig } from '../core/config.js';
import { diagnosePod } from '../core/client.js';

export function registerDiagnoseCommand(program: Command) {
  program
    .command('diagnose <pod>')
    .description('Diagnose a pod using logs and events')
    .option('-n, --namespace <ns>', 'Kubernetes namespace', 'default')
    .action(async (pod, options) => {
      const spinner = ora(`Diagnosing pod: ${pod}`).start();

      try {
        const token = "getAccessToken()";
        const config = loadConfig();
        const result = await diagnosePod({
          pod,
          namespace: options.namespace,
          token,
          apiUrl: DEFAULT_API_URL
        });

        spinner.succeed(`Diagnosis complete`);
        console.log(`\n📋 Diagnosis: ${result.diagnosis}\n💡 Suggestion: ${result.suggestion}`);
      } catch (err: any) {
        spinner.fail('Failed to diagnose pod');
        console.error(err.message || err);
      }
    });
}
