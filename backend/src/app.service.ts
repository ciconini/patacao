import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  async getHealth() {
    // TODO: Add actual health checks for Firestore and Redis
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      checks: {
        firestore: 'healthy',
        redis: 'healthy',
      },
    };
  }
}

