import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlContextType } from '@nestjs/graphql';
import { GraphQLResolveInfo } from 'graphql/type/definition';
import { GraphQLError } from 'graphql/error';
import { LogLevel } from '../logger/winston.logger.config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<GqlContextType>() === 'graphql') {
      const gqlHost = GqlArgumentsHost.create(host);
      const { requestId } = gqlHost.getContext<{
        requestId?: string;
      }>();
      const info = gqlHost.getInfo<GraphQLResolveInfo>();

      const operationType = info?.parentType?.name;
      const operationName = info?.fieldName;
      const variableValues = gqlHost.getArgs<Record<string, unknown>>();

      const logContents = {
        requestId,
        operationType,
        operationName,
        variableValues,
      };

      let code: string | number;
      let statusCode: number;
      let message: string;
      let stack: string | undefined;
      let logLever: LogLevel;

      if (exception instanceof HttpException) {
        logLever = LogLevel.WARN;
        statusCode = exception.getStatus();

        const getResponse = exception.getResponse();
        code = this.hasExceptionCode(getResponse)
          ? getResponse.code
          : exception.getStatus();

        message = exception.message;
        stack = exception.stack;
      } else if (exception instanceof Error) {
        logLever = LogLevel.ERROR;
        code = this.hasErrorCode(exception)
          ? exception.extensions.code
          : 'INTERNAL_SERVER_ERROR';
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = exception.message;
        stack = exception.stack;
      } else {
        logLever = LogLevel.ERROR;
        code = 'INTERNAL_SERVER_ERROR';
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Internal server error occurred';
        stack = this.hasStack(exception) ? exception.stack : undefined;
      }

      this.logger.log({
        level: logLever,
        ...logContents,
        message,
        stack,
      });

      return new GraphQLError(message, {
        extensions: {
          code,
          statusCode,
          message,
          stack,
          logged: true,
        },
      });
    }
  }

  private hasErrorCode(
    exception: unknown,
  ): exception is { extensions: { code: string } } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'extensions' in exception &&
      typeof exception.extensions === 'object' &&
      exception.extensions !== null &&
      'code' in exception.extensions
    );
  }

  private hasExceptionCode(
    getResponse: string | object,
  ): getResponse is { code: string | number } {
    return (
      typeof getResponse === 'object' &&
      getResponse !== null &&
      'code' in getResponse
    );
  }

  private hasStatusCode(
    getResponse: string | object,
  ): getResponse is { statusCode: number } {
    return (
      typeof getResponse === 'object' &&
      getResponse !== null &&
      'statusCode' in getResponse
    );
  }

  private hasStack(exception: unknown): exception is { stack: string } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'stack' in exception
    );
  }
}
