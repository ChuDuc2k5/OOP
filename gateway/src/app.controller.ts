import { Controller, Get } from '@nestjs/common';
import { BackendService } from './backend.service';

@Controller()
export class AppController {
  constructor(private readonly backend: BackendService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'Pharmacy.Gateway' };
  }

  @Get('health/backend')
  backendHealth() {
    return this.backend.health();
  }
}

