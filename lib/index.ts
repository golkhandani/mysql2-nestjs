import 'reflect-metadata';
import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  ModuleMetadata,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';

import { ModuleRef } from '@nestjs/core/injector/module-ref';
import { createPool, Pool, PoolOptions } from 'mysql2/promise';

export function helloMsn() {
  return 'hello mysql2 nestjs';
}

const NEST_MYSQL2_OPTIONS = 'NEST_MYSQL2_OPTIONS';
const NEST_MYSQL2_CONNECTION = 'NEST_MYSQL2_CONNECTION';

export interface NestMysql2Options extends PoolOptions {}

export interface NestMysql2OptionsFactory {
  createNestMysql2Options(): Promise<NestMysql2Options> | NestMysql2Options;
}

export interface NestMysql2AsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<NestMysql2OptionsFactory>;
  useClass?: Type<NestMysql2OptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<NestMysql2Options> | NestMysql2Options;
}

@Injectable()
class NestMysql2Service {
  private readonly logger: Logger;
  private pool: Pool;
  constructor(
    @Inject(NEST_MYSQL2_OPTIONS)
    private _NestMysql2Options: NestMysql2Options,
  ) {
    this.logger = new Logger('MySQL');
  }
  async getPool() {
    if (!this.pool) {
      try {
        this.pool = createPool(this._NestMysql2Options);
        await this.pool.query('SELECT 1+1;');
        this.logger.log('MySQL connected...');
      } catch (error) {
        this.logger.error("MySQL can't connect", error.message);
      }
    }
    return this.pool;
  }
}

const connectionFactory = {
  provide: NEST_MYSQL2_CONNECTION,
  useFactory: async (NestMysql2Service: NestMysql2Service): Promise<Pool> => {
    return await NestMysql2Service.getPool();
  },
  inject: [NestMysql2Service],
};

function createNestMysql2Providers(options: NestMysql2Options) {
  return [
    {
      provide: NEST_MYSQL2_OPTIONS,
      useValue: options,
    },
  ];
}

@Global()
@Module({
  providers: [NestMysql2Service, connectionFactory],
  exports: [NestMysql2Service, connectionFactory],
})
export class NestMysql2Module implements OnApplicationShutdown {
  constructor(
    @Inject(NEST_MYSQL2_OPTIONS)
    private readonly options: NestMysql2Options,
    @Inject(NEST_MYSQL2_CONNECTION)
    private readonly pool: Pool,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Registers a configured NestMysql2 Module for import into the current module
   */
  public static register(options: NestMysql2Options): DynamicModule {
    return {
      module: NestMysql2Module,
      providers: createNestMysql2Providers(options),
    };
  }

  /**
   * Registers a configured NestMysql2 Module for import into the current module
   * using dynamic options (factory, etc)
   */
  public static registerAsync(options: NestMysql2AsyncOptions): DynamicModule {
    return {
      module: NestMysql2Module,
      providers: [...this.createProviders(options)],
      imports: options.imports || [],
    };
  }

  private static createProviders(options: NestMysql2AsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createOptionsProvider(options)];
    }

    return [
      this.createOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createOptionsProvider(
    options: NestMysql2AsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: NEST_MYSQL2_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    // For useExisting...
    return {
      provide: NEST_MYSQL2_OPTIONS,
      useFactory: async (optionsFactory: NestMysql2OptionsFactory) =>
        await optionsFactory.createNestMysql2Options(),
      inject: [options.useExisting || options.useClass],
    };
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

export { Pool as Mysql };
export const InjectMysql = () => {
  return Inject(NEST_MYSQL2_CONNECTION);
};
