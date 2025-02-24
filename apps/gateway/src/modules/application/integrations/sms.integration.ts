import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { catchError, firstValueFrom } from "rxjs";
import * as fs from 'fs';
import * as https from 'https';

@Injectable()
export class SmsIntegrationService {
  private httpService: HttpService;
  private url: string;
  private user: string;
  private pass: string;
  private caFile: string;

  constructor(
    configService: ConfigService,
    httpService: HttpService,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('sms.host')}`;
    this.user = `${configService.get<string>('sms.user')}`;
    this.pass = `${configService.get<string>('sms.pass')}`;
    this.caFile = `${configService.get<string>('sms.ca')}`;
  }

  getUrl(): string {
    return this.url;
  }

  getUser(): string {
    return this.user;
  }

  getPass(): string {
    return this.pass;
  }

  async get(params): Promise<any> {

    console.log('<--- params :: sms.integration.ts --->')
    console.log(params)
    console.log('<--- params :: sms.integration.ts --->')

    const path = `${this.getUrl()}/cgi-bin/sendsms?user=${this.getUser()}&pass=${this.getPass()}&from=${params.from}&to=${params.to}&text=${encodeURI(params.text)}`;
    
    console.log('<--- path :: sms.integration.ts --->')
    console.log(path)
    console.log('<--- path :: sms.integration.ts --->')

    const { data } = await firstValueFrom(
      this.httpService.get(path).pipe(
        catchError((err: AxiosError) => {
          console.log('<--- error :: sms.integration.ts --->')
          console.log(err.message)
          console.log('<--- error :: sms.integration.ts --->')
          throw err.message;
        }),
      ),
    );

    console.log('<--- success :: sms.integration.ts --->');
    console.log(data);
    console.log('<--- success :: sms.integration.ts --->');

    return data;

    // return await lastValueFrom(
    //   this.httpService.
    //     get<any>(path)
    //     .pipe(
    //       map(async (res) => {
    //         console.log('<--- success :: sms.integration.ts --->')
    //         console.log(res)
    //         console.log('<--- success :: sms.integration.ts --->')
    //         return res;
    //       }),
    //       catchError(async (err) => {
    //         console.log('<--- error :: sms.integration.ts --->')
    //         console.log(err.message)
    //         console.log('<--- error :: sms.integration.ts --->')
    //         throw err.message;
    //       }),
    //     )
    // )
  }

  async getV2(params): Promise<any> {
   try {
    const path = `${this.getUrl()}/cgi-bin/sendsms?user=${this.getUser()}&pass=${this.getPass()}&from=${params.from}&to=${params.to}&text=${encodeURI(params.text)}`;
    
    console.log('<--- path :: sms.integration.ts --->')
    console.log(path)
    console.log('<--- path :: sms.integration.ts --->')

    const res = await this.httpService.axiosRef.get(path);

    console.log('<--- success :: sms.integration.ts --->');
    console.log(res);
    console.log('<--- success :: sms.integration.ts --->');
    return res;
   } catch (err) {
      console.log('<--- error :: sms.integration.ts --->')
      console.log(err.message)
      console.log('<--- error :: sms.integration.ts --->')
      throw err.message;
   }
  }

  async getV3(params) {
    const caFilePath = this.caFile;
    const caFile = fs.readFileSync(caFilePath);

    const requestOptions = {
      params: {
        user: this.getUser(),
        pass: this.getPass(),
        from: params.from,
        to: params.to,
        text: params.text
      },
      httpsAgent: new https.Agent({ ca: caFile }),
    };

    console.log('<--- params :: sms.integration.ts --->')
    console.log(params)
    console.log('<--- params :: sms.integration.ts --->')

    // const path = `${this.getUrl()}/cgi-bin/sendsms?user=${this.getUser()}&pass=${this.getPass()}&from=${params.from}&to=${params.to}&text=${encodeURI(params.text)}`;

    const path = `${this.getUrl()}/cgi-bin/sendsms`;

    console.log('<--- path :: sms.integration.ts --->')
    console.log(path)
    console.log('<--- path :: sms.integration.ts --->')

    const { data } = await firstValueFrom(
      this.httpService.get(path, requestOptions).pipe(
        catchError((err: AxiosError) => {
          console.log('<--- error :: sms.integration.ts --->')
          console.log(err.message)
          console.log('<--- error :: sms.integration.ts --->')
          throw err.message;
        }),
      ),
    );

    console.log('<--- success :: sms.integration.ts --->');
    console.log(data);
    console.log('<--- success :: sms.integration.ts --->');

    return data;
  }
}
