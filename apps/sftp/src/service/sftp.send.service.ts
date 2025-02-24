import { HttpStatus } from '@nestjs/common';
import * as fs from 'fs';
import { Model } from 'mongoose';
import { basename, dirname } from 'path';

import {
  copyFileToArchivedAndCompress,
  scanFilesSpecificTypeOndir,
} from '@/application/utils/File/file-management.service';
import {
  AesEncryptDecrypt,
  AesTrxType,
} from '@/application/utils/Hash/aes.helper';

import { ExceptionHandler } from '../../../utils/logger/handler';
import { IAccount, LoggingData } from '../../../utils/logger/transport';
import {
  SftpOutgoingConfig,
  SftpServerDestinationConfig,
} from '../models/sftp.outgoing.config';
import { SftpOutgoingLogDocument } from '../models/sftp.outgoing.log';

/**
 * This service only provide for sftp using multiple server
 */
export class SftpSendService {
  private readonly sftpOutgoingConfig: SftpOutgoingConfig;
  private readonly sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>;
  private readonly exceptionHandler: ExceptionHandler;

  constructor(
    cronConfig: SftpOutgoingConfig,
    sftpOutgoingLogModel: any,
    exceptionHandler: ExceptionHandler,
  ) {
    this.sftpOutgoingConfig = cronConfig;
    this.sftpOutgoingLogModel = sftpOutgoingLogModel;
    this.exceptionHandler = exceptionHandler;
  }

  /**
   * Call this function where implement the JobService interface,
   * inside runTheJobs function after do your logic
   * Check ExampleJobService for the example
   */
  async sendFile(): Promise<boolean> {
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();
    const startTime = new Date();

    const isValid = this.validateParam(this.sftpOutgoingConfig);
    if (!isValid) {
      // insert log
      await this.loggerSftpSend(
        this.sftpOutgoingConfig,
        false,
        'SFTPSendService - sendFile',
        {
          user_id: 'sftp',
          message: 'Sftp config params is invalid',
        },
        startTime,
        HttpStatus.BAD_REQUEST,
      );
      return false;
    }

    try {
      const localFile = await fs.readFileSync(
        this.sftpOutgoingConfig.generated_file,
      );
      const destinationList: any = this.sftpOutgoingConfig.server_destination;

      const configLog = { ...this.sftpOutgoingConfig };
      delete configLog.server_destination;

      if (destinationList.length > 0) {
        for (let i = 0; i < destinationList.length; i++) {
          const sftpConfiguration: any = {
            host: destinationList[i].host,
            port: destinationList[i].port,
            username: destinationList[i].username,
          };

          configLog.server_destination = [{ ...sftpConfiguration }];

          if (destinationList[i].sshKey) {
            sftpConfiguration.privateKey = fs.readFileSync(
              destinationList[i].sshKey,
            );
          }

          if (destinationList[i].password) {
            // decode the password
            const password = AesEncryptDecrypt(
              AesTrxType.DECRYPT,
              destinationList[i].password,
            );

            sftpConfiguration.password = password;
          }
          await sftp
            .connect(sftpConfiguration)
            .then(() => {
              // add timestamp to file name
              const file = destinationList[i].fileAndPath;

              let filePath = file;
              if (this.sftpOutgoingConfig.use_timestamp) {
                const timestamp = '.' + new Date().toISOString();
                const indexExtension = file.lastIndexOf('.');
                filePath = [
                  file.slice(0, indexExtension),
                  timestamp,
                  file.slice(indexExtension),
                ].join('');
              }

              return sftp.put(localFile, filePath);
            })
            .then(async () => {
              console.log(
                `File ${this.sftpOutgoingConfig.generated_file} has send to ${destinationList[i].host}`,
              );

              // insert log
              await this.loggerSftpSend(
                this.sftpOutgoingConfig,
                false,
                'SFTPSendService - sendFile',
                {
                  user_id: 'sftp',
                  message: `File ${this.sftpOutgoingConfig.generated_file} has send to ${destinationList[i].host}`,
                },
                startTime,
              );

              return sftp.end();
            })
            .catch(async (err) => {
              // insert log
              await this.loggerSftpSend(
                this.sftpOutgoingConfig,
                false,
                'SFTPSendService - sendFile',
                {
                  user_id: 'sftp',
                  message: err.message,
                  stack: err.stack,
                },
                startTime,
                HttpStatus.INTERNAL_SERVER_ERROR,
              );

              return sftp.end();
            });
        }
      }

      return true;
    } catch (err) {
      const configLog = { ...this.sftpOutgoingConfig };
      delete configLog.server_destination;

      // insert log
      await this.loggerSftpSend(
        this.sftpOutgoingConfig,
        true,
        'SFTPSendService - sendFile',
        {
          user_id: 'sftp',
          message: err.message,
          stack: err.stack,
        },
        startTime,
        HttpStatus.BAD_REQUEST,
      );

      return false;
    }
  }

  /**
   * Improvement of function this.sendFile
   * Add function parameter so can set value dynamically
   * Archived after send
   * @param config
   */
  async sendFileAndArchived(config: SftpOutgoingConfig): Promise<boolean> {
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();
    const startTime = new Date();

    const isValid = this.validateParam(config);
    if (!isValid) {
      // insert log
      await this.loggerSftpSend(
        this.sftpOutgoingConfig,
        false,
        'SFTPSendService - sendFileAndArchived',
        {
          user_id: 'sftp',
          message: 'Sftp config params is invalid',
        },
        startTime,
        HttpStatus.BAD_REQUEST,
      );
      return false;
    }

    try {
      const localFile = await fs.readFileSync(config.generated_file);
      const dirPath = dirname(config.generated_file) + '/';
      const fileName = basename(config.generated_file);

      const destinationList: any = this.sftpOutgoingConfig.server_destination;

      const configLog = { ...this.sftpOutgoingConfig };
      delete configLog.server_destination;

      if (destinationList.length > 0) {
        let statusRes = false;

        for (let i = 0; i < destinationList.length; i++) {
          const sftpConfiguration: any = {
            host: destinationList[i].host,
            port: destinationList[i].port,
            username: destinationList[i].username,
          };

          configLog.server_destination = [{ ...sftpConfiguration }];

          if (destinationList[i].sshKey) {
            sftpConfiguration.privateKey = fs.readFileSync(
              destinationList[i].sshKey,
            );
          }

          if (destinationList[i].password) {
            // decode the password
            const password = AesEncryptDecrypt(
              AesTrxType.DECRYPT,
              destinationList[i].password,
            );
            sftpConfiguration.password = password;
          }
          await sftp
            .connect(sftpConfiguration)
            .then(() => {
              // add timestamp to file name
              const file = destinationList[i].fileAndPath;

              let filePath = file;
              if (config.use_timestamp) {
                const timestamp = '.' + new Date().toISOString();
                const indexExtension = file.lastIndexOf('.');
                filePath = [
                  file.slice(0, indexExtension),
                  timestamp,
                  file.slice(indexExtension),
                ].join('');
              }

              return sftp.put(localFile, filePath);
            })
            .then(async () => {
              console.log(
                `File ${config.generated_file} has send to ${destinationList[i].host}`,
              );
              statusRes = true;

              // insert log
              await this.loggerSftpSend(
                this.sftpOutgoingConfig,
                false,
                'SFTPSendService - sendFileAndArchived',
                {
                  user_id: 'sftp',
                  message: `File ${this.sftpOutgoingConfig.generated_file} has send to ${destinationList[i].host}`,
                },
                startTime,
              );

              return sftp.end();
            })
            .catch(async (err) => {
              // insert log
              await this.loggerSftpSend(
                this.sftpOutgoingConfig,
                false,
                'SFTPSendService - sendFileAndArchived',
                {
                  user_id: 'sftp',
                  message: err.message,
                  stack: err.stack,
                },
                startTime,
                HttpStatus.INTERNAL_SERVER_ERROR,
              );
              return sftp.end();
            });
        }

        if (statusRes) {
          await copyFileToArchivedAndCompress(dirPath, fileName, true);
        }
      }

      return true;
    } catch (err) {
      const configLog = { ...this.sftpOutgoingConfig };
      delete configLog.server_destination;

      // insert log
      await this.loggerSftpSend(
        this.sftpOutgoingConfig,
        false,
        'SFTPSendService - sendFileAndArchived',
        {
          user_id: 'sftp',
          message: err.message,
          stack: err.stack,
        },
        new Date(),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      return false;
    }
  }

  /**
   * For sftp task when need monitor file,
   * send it, and archived
   * If you want to scan folder,
   * add slash (/) after folder name at generated_file property
   */
  async fileMonitoringOrDirectSendFile() {
    const startTime = new Date();

    try {
      const filePath = this.sftpOutgoingConfig.generated_file;
      const serverCount = this.sftpOutgoingConfig.server_destination.length;

      if (serverCount === 0) {
        // insert log
        await this.loggerSftpSend(
          this.sftpOutgoingConfig,
          false,
          'SFTPSendService - fileMonitoringOrDirectSendFile',
          {
            user_id: 'sftp',
            message: 'Server count == 0',
          },
          startTime,
          HttpStatus.BAD_REQUEST,
        );
        return false;
      }

      // check if dir or file
      const isDir = fs.lstatSync(filePath).isDirectory();
      if (isDir) {
        const files = scanFilesSpecificTypeOndir(
          filePath,
          this.sftpOutgoingConfig.file_extension,
          [],
        );
        if (files.length === 0) {
          console.log(
            `At ${this.sftpOutgoingConfig.generated_file}, there is no file to send...`,
          );
          // insert log
          await this.loggerSftpSend(
            this.sftpOutgoingConfig,
            false,
            'SFTPSendService - fileMonitoringOrDirectSendFile',
            {
              user_id: 'sftp',
              message: `At ${this.sftpOutgoingConfig.generated_file}, there is no file to send...`,
            },
            startTime,
            HttpStatus.BAD_REQUEST,
          );
          return false;
        }

        for (let i = 0; i < files.length; i++) {
          const serverDest = [];

          for (let j = 0; j < serverCount; j++) {
            serverDest.push(
              new SftpServerDestinationConfig(
                this.sftpOutgoingConfig.server_destination[j].label,
                this.sftpOutgoingConfig.server_destination[j].host,
                this.sftpOutgoingConfig.server_destination[j].port,
                this.sftpOutgoingConfig.server_destination[j].username,
                this.sftpOutgoingConfig.server_destination[j].sshKey,
                this.sftpOutgoingConfig.server_destination[j].fileAndPath +
                  files[i],
                this.sftpOutgoingConfig.server_destination[j].password,
              ),
            );
          }

          const sftpConfig = new SftpOutgoingConfig(
            {},
            this.sftpOutgoingConfig.generated_file + files[i],
            this.sftpOutgoingConfig.file_extension,
            serverDest,
            true,
          );

          await this.sendFileAndArchived(sftpConfig);
        }
      } else {
        await this.sendFile();
      }
    } catch (e) {
      await this.loggerSftpSend(
        this.sftpOutgoingConfig,
        true,
        'SFTPSendService - fileMonitoringOrDirectSendFile',
        {
          user_id: 'sftp',
          message: e.message,
          stack: e.stack,
        },
        startTime,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Write log for every transaction
   * @param config
   * @param generatedFile
   * @param destinationLabel
   * @param host
   * @param filePath
   * @param statusCode
   * @param errorMessage
   */
  async writeLog(
    config: SftpOutgoingConfig,
    generatedFile: string,
    destinationLabel: string,
    host: string,
    filePath: string,
    statusCode: string,
    errorMessage: string,
  ) {
    const log = new this.sftpOutgoingLogModel({
      sftp_config: config,
      file_at_local: generatedFile,
      destination_label: destinationLabel,
      host: host,
      file_path: filePath,
      status_code: statusCode,
      error_message: errorMessage,
    });
    await log.save();
  }

  /**
   * For validate params
   * @param config
   */
  async validateParam(config: SftpOutgoingConfig): Promise<boolean> {
    const configLog = { ...config };
    const serverDestinationCounts = config.server_destination.length;
    delete configLog.server_destination;

    if (config.generated_file == '') {
      await this.writeLog(
        configLog,
        this.sftpOutgoingConfig.generated_file,
        '',
        '',
        '',
        '500',
        'Generated file is empty',
      );
      return false;
    }

    if (serverDestinationCounts == 0) {
      await this.writeLog(
        configLog,
        this.sftpOutgoingConfig.generated_file,
        '',
        '',
        '',
        '500',
        'No server destination',
      );
      return false;
    }

    return true;
  }

  async loggerSftpSend(
    payload: any,
    isError: boolean,
    step: string,
    error: any,
    start: Date,
    statusCode: number = HttpStatus.OK,
    notifOperation = false,
    notifCustomer = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    const result = error ? error : {};

    await this.exceptionHandler.handle({
      level: isError ? 'error' : 'verbose',
      notif_operation: notifOperation,
      notif_customer: notifCustomer,
      transaction_id: payload?.tracing_id ?? '-',
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload?.tracing_id ?? '-',
        statusCode: statusCode,
        method: 'kafka',
        url: 'cron',
        service: SftpSendService.name,
        step: step,
        taken_time: takenTime,
        result: result,
        param: payload,
        payload: {
          service: SftpSendService.name,
          user_id: new IAccount(payload.account),
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
