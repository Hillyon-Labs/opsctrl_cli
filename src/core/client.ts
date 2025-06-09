import { DEFAULT_API_URL, getLocalAuthToken } from './config';
import axios from 'axios';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { DiagnoseRequest } from '../common/interface/client.interface';
import { printErrorAndExit } from '../utils/utils';

const gzipAsync = promisify(gzip);

export async function runFurtherDiagnosis(payload: DiagnoseRequest): Promise<any> {
  try {
    const compressed = await gzipAsync(Buffer.from(JSON.stringify(payload)));

    const token = getLocalAuthToken();

    const response = await axios.post(`${DEFAULT_API_URL}/diagnose`, compressed, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error: any) {
    printErrorAndExit(error.response?.data.message ?? 'External request failed');
  }
}
