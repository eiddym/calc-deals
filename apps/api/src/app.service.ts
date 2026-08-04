import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      ok: true,
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}
