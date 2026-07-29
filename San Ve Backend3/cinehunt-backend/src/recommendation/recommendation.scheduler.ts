import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { catchError, firstValueFrom, map, of, timeout } from 'rxjs';

export interface HealthPayload {
  status?: string;
  modelLoaded?: boolean;
  modelVersion?: string | null;
  trainedAt?: string | null;
  knownUsers?: number;
  training?: { running?: boolean };
  effect?: string;
}

type HealthSnapshot = {
  reachable: boolean;
  checkedAt: string | null;
  payload: HealthPayload | null;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value?.trim()) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

@Injectable()
export class RecommendationScheduler implements OnModuleInit {
  private readonly logger = new Logger(RecommendationScheduler.name);
  private readonly baseUrl: string;
  private readonly enabled: boolean;
  private lastHealth: HealthSnapshot = {
    reachable: false,
    checkedAt: null,
    payload: null,
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = (
      this.configService.get<string>('RECOMMENDATION_SERVICE_URL') ??
      'http://localhost:8000'
    ).replace(/\/+$/, '');

    const isProduction =
      this.configService.get<string>('NODE_ENV')?.toLowerCase() === 'production';
    const configured =
      this.configService.get<string>('RECOMMENDATION_TRAIN_ENABLED') ??
      this.configService.get<string>('RECOMMENDATION_AUTO_TRAIN');
    this.enabled = parseBoolean(configured, !isProduction);
  }

  async onModuleInit(): Promise<void> {
    await this.checkHealth(true);
  }

  getLastHealth(): HealthSnapshot {
    return this.lastHealth;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'recommendation-retrain',
  })
  async scheduledRetrain(): Promise<void> {
    if (!this.enabled) return;
    await this.triggerTraining('cron');
  }

  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'recommendation-health',
  })
  async scheduledHealthCheck(): Promise<void> {
    await this.checkHealth(false);
  }

  async triggerTraining(source: string): Promise<{
    triggered: boolean;
    message: string;
  }> {
    if (!this.enabled && source === 'cron') {
      return { triggered: false, message: 'Lịch train tự động đang tắt.' };
    }

    const url = `${this.baseUrl}/train`;
    this.logger.log(`Yêu cầu train lại model gợi ý (nguồn: ${source})...`);

    const result: { ok: boolean; status?: number; error?: Error } =
      await firstValueFrom(
        this.httpService.post<unknown>(url, {}).pipe(
          timeout(20_000),
          map((response) => ({
            ok: response.status === 202 || response.status === 200,
            status: response.status,
          })),
          catchError((error: Error) => of({ ok: false, error })),
        ),
      );

    if (result.ok) {
      this.logger.log('Đã gửi yêu cầu train. Theo dõi GET /health của Python service.');
      return { triggered: true, message: 'Đã gửi yêu cầu train lại model.' };
    }

    this.logger.warn(
      `Không train lại được model: ${result.error?.message ?? `HTTP ${String(result.status)}`}. ` +
        `Kiểm tra recommendation-service tại ${this.baseUrl}.`,
    );
    return {
      triggered: false,
      message: `Không gọi được ${url}. Service gợi ý có đang chạy không?`,
    };
  }

  async checkHealth(isBoot: boolean): Promise<HealthPayload | null> {
    const url = `${this.baseUrl}/health`;
    const payload = await firstValueFrom(
      this.httpService.get<HealthPayload>(url).pipe(
        timeout(5_000),
        map((response) => response.data),
        catchError(() => of(null)),
      ),
    );

    this.lastHealth = {
      reachable: payload !== null,
      checkedAt: new Date().toISOString(),
      payload,
    };

    if (!payload) {
      this.logger[isBoot ? 'error' : 'warn'](
        `Recommendation service không phản hồi tại ${this.baseUrl}. ` +
          'Hệ thống vẫn chạy bằng fallback popularity. Khởi động bằng ' +
          '`npm run start:stack` hoặc script start-all ở thư mục gốc.',
      );
      return null;
    }

    if (!payload.modelLoaded) {
      this.logger.warn(
        'Recommendation service đang chạy nhưng chưa nạp model. ' +
          'Chạy `npm run recommendation:train` trong backend hoặc `python train.py`.',
      );
      return payload;
    }

    this.logger.log(
      `Recommendation service OK: model ${payload.modelVersion ?? 'không rõ'}, ` +
        `train lúc ${payload.trainedAt ?? 'không rõ'}, ${payload.knownUsers ?? 0} user.`,
    );
    return payload;
  }
}
