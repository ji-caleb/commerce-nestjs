import { Injectable, Logger } from '@nestjs/common';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigService as NestConfigService } from '@nestjs/config/dist/config.service';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { LogLevel } from '../logger/winston.logger.config';

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  private readonly logger: Logger;

  constructor(private readonly nestConfigService: NestConfigService) {
    this.logger = new Logger(this.constructor.name);
  }

  createGqlOptions(): ApolloDriverConfig {
    return {
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: false,
      introspection: true,
      plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
      formatError: (error) => {
        if (!error.extensions?.logged) {
          this.logger.error({
            level: LogLevel.ERROR,
            message: error.message,
            code: error.extensions?.code,
            stack: error.extensions?.stacktrace,
          });
        }

        return {
          message: error.message,
          path: error.path,
          extensions: {
            code: error.extensions?.code,
            statusCode: error.extensions?.statusCode ?? 400,
            message: error.message,
            ...(this.nestConfigService.get('NODE_ENV') === 'development' && {
              stack: error.extensions?.stack ?? error.extensions?.stacktrace,
            }),
          },
        };
      },
    };
  }
}
