import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { createDSPProviders } from '@utils/dsp/providers';

export class DSPModule {
  public static forRoor(options: HttpsOptions) {
    const providers = createDSPProviders(options);
    return {
      module: DSPModule,
      providers: providers,
    };
  }
}
