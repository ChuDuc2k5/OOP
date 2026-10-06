import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class BackendService {
  private readonly baseUrl = process.env.BACKEND_URL ?? 'http://localhost:5000';

  async health(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(new URL('/api/health', this.baseUrl), {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Backend request failed');
      const body = await response.json() as { status?: unknown; service?: unknown };
      if (typeof body.status !== 'string' || typeof body.service !== 'string') {
        throw new Error('Invalid backend response');
      }
      return { status: body.status, service: body.service };
    } catch {
      throw new ServiceUnavailableException('Không thể kết nối API .NET.');
    }
  }
}

