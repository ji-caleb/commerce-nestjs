import {
  WinstonModuleOptions,
  WinstonModuleOptionsFactory,
} from 'nest-winston';
import { format, transports } from 'winston';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

export const LogLevel = {
  SILLY: 'silly',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const customFormat = format.printf(
  ({ timestamp, level, context, message, ...rest }) => {
    return JSON.stringify({
      timestamp,
      level,
      context,
      message,
      ...rest,
    });
  },
);

@Injectable()
export class WinstonConfigService implements WinstonModuleOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createWinstonModuleOptions(): WinstonModuleOptions {
    const env: string = this.configService.getOrThrow('NODE_ENV');
    return {
      level: env === 'production' ? LogLevel.INFO : LogLevel.SILLY,
      format: format.combine(customFormat, format.timestamp(), format.ms()),
      transports: [
        new transports.Console({
          level: env === 'production' ? LogLevel.INFO : LogLevel.SILLY,
          format: format.combine(
            customFormat,
            format.timestamp(),
            format.ms(),
            format.colorize({ all: true }),
          ),
        }),
      ],
    };
  }
}
