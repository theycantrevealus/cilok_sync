import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { InjectQueue } from '@nestjs/bull';
import { CacheStore } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CACHE_MANAGER,
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { NotificationNonTransactionDto } from 'apps/notification/src/models/notification-non-transaction.dto';
import { ObjectID, ObjectId } from 'bson';
import { Queue } from 'bull';
import { error } from 'console';
import mongoose, { Model, SchemaTypes, Types } from 'mongoose';
import { title } from 'process';
import { start } from 'repl';

import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import {
  identifierSSO,
  isMatchProgramSSO,
  ssoFormatToId,
} from '@/application/utils/Msisdn/formatter';
import { GlobalResponse } from '@/dtos/response.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  KeywordType,
  KeywordTypeDocument,
} from '@/keyword/models/keyword.type';
import { Location, LocationDocument } from '@/location/models/location.model';
import { LovService } from '@/lov/services/lov.service';
import { NotificationFirebaseAddDto } from '@/notification/dto/notification.firebase.add.dto';
import { NotificationGeneralMessageBuild } from '@/notification/services/notification.message.service';
import { NotificationService } from '@/notification/services/notification.service';
import { ProgramApprovalDTOResponse } from '@/program/dto/program.approval.dto';
import { ProgramDeleteDTOResponse } from '@/program/dto/program.delete.dto';
import {
  ProgramEditDTO,
  ProgramEditDTOResponse,
} from '@/program/dto/program.edit.dto.v2';
import {
  ProgramEditMainInfoDTO,
  ProgramEditMainInfoDTOResponse,
} from '@/program/dto/program.edit.main.info.dto.v2';
import {
  ProgramNotificationEditDTO,
  ProgramNotificationEditDTOResponse,
} from '@/program/dto/program.edit.notification.dto.v2';
import {
  ProgramTemplistAddDTO,
  ProgramTemplistAddDTOResponse,
} from '@/program/dto/program.templist.add';
import {
  ProgramApprovalLog,
  ProgramApprovalLogDocument,
} from '@/program/models/program.approval.log';
import {
  ProgramBlacklist,
  ProgramBlacklistDocument,
} from '@/program/models/program.blacklist.model';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import {
  ProgramNotification,
  ProgramNotificationDocument,
} from '@/program/models/program.notification.model.v2';
import {
  ProgramSegmentation,
  ProgramSegmentationDocument,
} from '@/program/models/program.segmentation.model';
import {
  ProgramTemplist,
  ProgramTemplistDocument,
} from '@/program/models/program.templist.model';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import { timeZone } from '../../../helper';
import { ProgramAddDTO } from '../dto/program.add.dto.v2';
import { ProgramChangeOwnerDTO } from '../dto/program.change.owner.dto';
import {
  ProgramIsDraftEditDTO,
  ProgramIsDraftEditDTOResponse,
} from '../dto/program.edit.isdraft.dto';
import { ProgramNotificationDTO } from '../dto/program.notification.dto';
import {
  ProgramWhitelist,
  ProgramWhitelistDocument,
} from '../models/program.whitelist.model';

const moment = require('moment-timezone');

@Injectable()
export class ProgramServiceV2 {
  // protected importWBListQueue: Queue;

  constructor(
    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,
    @InjectModel(ProgramSegmentation.name)
    private programSegmentationModel: Model<ProgramSegmentationDocument>,
    @InjectModel(ProgramNotification.name)
    private programNotificationModel: Model<ProgramNotificationDocument>,
    @InjectModel(ProgramApprovalLog.name)
    private programApprovalLogModel: Model<ProgramApprovalLogDocument>,
    @InjectModel(ProgramTemplist.name)
    private programTempListModel: Model<ProgramTemplistDocument>,
    @InjectModel(ProgramWhitelist.name)
    private programWModel: Model<ProgramWhitelistDocument>,
    @InjectModel(ProgramBlacklist.name)
    private programBModel: Model<ProgramBlacklistDocument>,
    @InjectModel(ProgramApprovalLog.name)
    private programApprovalLog: Model<ProgramApprovalLogDocument>,
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
    @InjectModel(KeywordType.name)
    private keywordType: Model<KeywordTypeDocument>,
    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,
    @InjectQueue('program') private readonly importWBListQueue: Queue,
    private accountService: AccountService,
    private appsService: ApplicationService,
    private notificationService: NotificationService,
    private lovService: LovService,
    private transactionOptional: TransactionOptionalService,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,

    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
  ) {
    // this.importWBListQueue = importWBListQueue;
  }

  async getJob(id: string) {
    return await this.importWBListQueue.getJob(id);
  }

  async addProgramListTemp(
    fileData: LocalFileDto,
    type: string,
    credential: Account,
  ) {
    return this.importWBListQueue
      .add(
        'program-list',
        {
          account: credential,
          type: type,
          list: fileData,
          bulkCount: 100,
        },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      });
  }

  async addProgramSegmentation(
    fileData: LocalFileDto,
    program: string,
    type: string,
    identifier: string,
    credential: any,
  ) {
    const response = new GlobalResponse();
    if (credential && credential.account_location) {
      const process = this.importWBListQueue
        .add(
          'program-list-segmentation',
          {
            program: new mongoose.Types.ObjectId(program),
            account: credential,
            type: type,
            list: fileData,
            identifier: identifier,
            bulkCount: 10,
          },
          { removeOnComplete: false },
        )
        .then((job) => {
          return { job: job.id };
        });

      const payload = {
        fileData: fileData,
        program: program,
        type: type,
      };

      const updateFields: any = {};

      // Cek apakah type adalah whitelist atau blacklist
      if (type === 'whitelist') {
        updateFields.is_whitelist = true;
        updateFields.is_blacklist = false; // optional jika kamu ingin set false
      } else if (type === 'blacklist') {
        updateFields.is_blacklist = true;
        updateFields.is_whitelist = false; // optional jika kamu ingin set false
      }

      // Update data di MongoDB
      await this.programModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(program) }, // Filter berdasarkan ID program
        { $set: updateFields }, // Fields yang di-update
        { new: true }, // Return the updated document
      );

      response.payload = payload;
      response.transaction_classify = 'UPLOAD FILE PROGRAM SEGMENTATION';

      if (process) {
        response.statusCode = HttpStatus.OK;
        response.message = 'Upload process successfully';
      } else {
        response.statusCode = HttpStatus.NO_CONTENT;
        response.message = 'Upload process failed';
      }
    } else {
      response.statusCode = HttpStatus.UNAUTHORIZED;
      response.message = 'No credential account found';
    }

    return response;
  }

  async deleteProgramTempList(param: string): Promise<any> {
    const process = await this.programTempListModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new GlobalResponse();
    response.transaction_classify = 'DELETE_BULK_PROGRAM_SEGMENTATION';
    if (process) {
      response.statusCode = HttpStatus.OK;
      response.message = 'Program temp list deleted successfully';
      response.payload = { data: process };
    } else {
      response.statusCode = HttpStatus.BAD_REQUEST;
      response.message = 'Program temp list failed to deleted';
      response.payload = { data: param };
    }

    return response;
  }

  async deleteBulkProgramTempList(data: any, soft = false): Promise<any> {
    const response = new GlobalResponse();
    response.payload = data;
    response.transaction_classify =
      'DELETE_ALL_PROGRAM_SEGMENTATION_BY_PROGRAM_AND_TYPE';
    const payload = {
      type: data.type,
      program: new mongoose.Types.ObjectId(data.program),
      identifier: data.identifier,
    };

    if (soft) {
      await this.programTempListModel
        .updateMany(payload, { $set: { deleted_at: new Date() } })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
        });
    } else {
      await this.programTempListModel
        .deleteMany(payload)
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
        });
    }

    return response;
  }

  async deleteUnmatchProgramTempList(data: any, soft = false): Promise<any> {
    const response = new GlobalResponse();
    response.payload = data;
    response.transaction_classify =
      'DELETE_ALL_UNMATCH_PROGRAM_SEGMENTATION_BY_PROGRAM_AND_TYPE';
    data.match = false;
    const payload = {
      type: data.type,
      program: new mongoose.Types.ObjectId(data.program),
      match: false,
    };

    if (soft) {
      await this.programTempListModel
        .updateMany(payload, { $set: { deleted_at: new Date() } })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.statusCode = HttpStatus.OK;
          response.message = 'Data delete success';
        });
    } else {
      await this.programTempListModel
        .deleteMany(payload)
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.statusCode = HttpStatus.OK;
          response.message = 'Data delete success';
        });
    }

    return response;
  }

  async addProgram(
    programData: ProgramV2,
    created_by: any,
    token = '',
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'PROGRAM_ADD';

    try {
      // Check for unique program name
      if (!(await this.checkUniqueProgram({ name: programData.name }))) {
        throw new BadRequestException([
          {
            isInvalidDataContent:
              'Duplicate program names are not allowed',
          },
        ])
      }

      // Check keyword registration if it exists
      if (programData.keyword_registration) {
        // Check if keyword registration is not the same as redeem keyword
        if (
          !(await this.checkKeywordRegistration({
            'eligibility.name': programData.keyword_registration,
          }))
        ) {
          throw new BadRequestException([
            {
              isInvalidDataContent:
                'The registration keyword cannot be the same as the redeem keyword',
            },
          ])
        }

        // Check unique keyword registration
        if (
          !(await this.checkUniqueProgram({
            keyword_registration: programData.keyword_registration,
          }))
        ) {
          throw new BadRequestException([
            {
              isInvalidDataContent:
                'The registration keyword is already in use in another program',
            },
          ])
        }
      }

      // Prepare program data
      const programToSave = {
        ...programData,
        created_by,
        program_approval: new mongoose.Types.ObjectId(
          await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_ADD'),
        ),
      };

      if (programData?.program_parent === null) {
        delete programToSave.program_parent;
      }

      // Save new program
      const newProgram = new this.programModel(programToSave);
      const savedProgram = await newProgram.save();

      // Handle program notifications
      if (programData?.program_notification?.length > 0) {
        await Promise.all(
          programData.program_notification.map(async (notificationData) => {
            const newNotification = new this.programNotificationModel({
              program: savedProgram._id,
              ...notificationData,
            });
            return newNotification.save();
          }),
        );

        // Send program approval notification
        const superior_var = await this.findProgramById(savedProgram._id);
        const getAccountService: any =
          await this.accountService.authenticateBusiness({ auth: token });
        const trace_id = this.transactionOptional.getTracingId(
          programData,
          response,
        );
        const isHQ =
          getAccountService?.account_location?.location_detail?.name === 'HQ';

        if (isHQ) {
          await this.sendProgramApprovalNotificationHQ(
            programData,
            savedProgram,
            created_by,
            superior_var,
            trace_id,
          );
        } else {
          await this.sendProgramApprovalNotificationNonHQ(
            programData,
            savedProgram,
            created_by,
            superior_var,
            trace_id,
          );
        }
      }

      // Prepare success response
      response.message = 'Program created successfully';
      response.statusCode = HttpStatus.OK;
      response.payload = savedProgram;
      return response;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException([
        {
          isInvalidDataContent: error.message || 'Program failed to be created',
        },
      ]);
    }
  }

  async addProgramNotification(
    request: ProgramNotification,
    credential: Account,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'PROGRAM_NOTIFICATION_ADD';
    const newObj = new this.programNotificationModel({
      ...request,
      created_by: credential,
    });
    const process = newObj
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.message = 'Program Notification Created Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = process;
      });

    return response;
  }

  async deleteProgramSegmentation(
    param: string,
  ): Promise<ProgramDeleteDTOResponse> {
    const process = await this.programSegmentationModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new ProgramDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Program Bonus Deleted Successfully';
      response.payload = process;
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: 'Program Failed to Delete' },
      ]);
      // response.status = 400;
      // response.message = 'Program Bonus Failed to Deleted';
    }
    return response;
  }

  async deleteProgramNotification(
    param: string,
  ): Promise<ProgramDeleteDTOResponse> {
    const process = await this.programNotificationModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new ProgramDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Program Notification Deleted Successfully';
      response.payload = process;
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: 'Program Failed to Delete' },
      ]);
      // response.status = 400;
      // response.message = 'Program Notification Failed to Deleted';
    }
    return response;
  }

  async editProgram(
    data: ProgramV2,
    param: string,
    account: Account,
  ): Promise<ProgramEditDTOResponse> {
    const statusApprove = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_APPROVE_HQ'),
    );
    const checkApprove: any = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(param),
    });

    const response = new ProgramEditDTOResponse();
    response.transaction_classify = 'PROGRAM_EDIT';

    let process;
    if (checkApprove.program_approval.equals(statusApprove)) {
      const duplicateKeyword = new this.programModel({
        ...data,
        program_edit: checkApprove?._id,
        name: `${data.name}-EDIT`,
        program_approval: new mongoose.Types.ObjectId(
          await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_ADD'),
        ),
        created_by: account,
      });
      process = await duplicateKeyword
        .save()
        .then(async (results) => {
          const superior_var = await this.findProgramById(param);
          const getAccountService = await this.accountService.detail(
            results?._id,
          );
          const trace_id = this.transactionOptional.getTracingId(
            data,
            response,
          );
          if (
            getAccountService.account_location.location_detail.name === 'HQ'
          ) {
            await this.sendProgramApprovalNotificationHQ(
              data,
              results,
              getAccountService,
              superior_var,
              trace_id,
            );
          } else {
            await this.sendProgramApprovalNotificationNonHQ(
              data,
              results,
              getAccountService,
              superior_var,
              trace_id,
            );
          }
          return results;
        })
        .catch((e) => {
          throw new Error(e.message);
        });
    } else {
      process = await this.programModel
        .findOneAndUpdate(
          { _id: param },
          {
            updated_at: Date.now(),
            ...data,
          },
        )
        .then(async (results) => {
          const superior_var = await this.findProgramById(param);
          const getAccountService = await this.accountService.detail(
            results?.created_by?._id,
          );
          const trace_id = this.transactionOptional.getTracingId(
            results,
            response,
          );
          if (
            getAccountService.account_location.location_detail.name === 'HQ'
          ) {
            await this.sendProgramApprovalNotificationHQ(
              data,
              results,
              getAccountService,
              superior_var,
              trace_id,
            );
          } else {
            await this.sendProgramApprovalNotificationNonHQ(
              data,
              results,
              getAccountService,
              superior_var,
              trace_id,
            );
          }
          return results;
        });
    }
    if (process) {
      response.message = 'Program Clone Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: 'Program Failed to Updated' },
      ]);
      // response.message = 'Program Failed to Updated';
      // response.status = 400;
      // response.payload = process;
    }
    return response;
  }

  async editMainInfo(
    data: ProgramEditMainInfoDTO,
    param: string,
    account: Account,
  ): Promise<ProgramEditMainInfoDTOResponse> {
    const statusApprove = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_APPROVE_HQ'),
    );

    const statusReject = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_REJECT_HQ'),
    );

    const statusRejectNonHQ = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_REJECT_NON_HQ'),
    );

    const statusNew = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_ADD'),
    );

    const checkApprove: any = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(param),
    });

    const response = new ProgramEditMainInfoDTOResponse();
    response.transaction_classify = 'PROGRAM_EDIT_MAIN_INFO';

    // Check keyword registration if it exists
    if (data.keyword_registration) {
      // Check if keyword registration is not the same as redeem keyword
      if (
        !(await this.checkKeywordRegistration({
          'eligibility.name': data.keyword_registration,
        }))
      ) {
        throw new BadRequestException([
          {
            isInvalidDataContent:
              'The registration keyword cannot be the same as the redeem keyword',
          },
        ])
      }

      // Check unique keyword registration
      if (checkApprove.keyword_registration !== data.keyword_registration) {
        if (
          !(await this.checkUniqueProgram({
            keyword_registration: data.keyword_registration,
          }))
        ) {
          throw new BadRequestException([
            {
              isInvalidDataContent:
                'The registration keyword is already in use in another program',
            },
          ])
        }
      }

    }

    let process;

    const programStatus = checkApprove?.program_approval?.toString();

    const checkStatusReject = programStatus === statusReject?.toString();
    const checkStatusRejectNonHQ =
      programStatus === statusRejectNonHQ?.toString();
    const checkstatusApproval = programStatus === statusApprove?.toString();
    const checkstatusIsDraft =
      programStatus === statusNew?.toString() && checkApprove.is_draft === true;

    console.log('checkStatusReject', checkStatusReject);
    console.log('checkstatusApproval', checkstatusApproval);
    console.log('checkstatusIsDraft', checkstatusIsDraft);

    // Jika Program Status tidak di izinkan edit
    if (
      !checkStatusReject &&
      !checkstatusApproval &&
      !checkstatusIsDraft &&
      !checkStatusRejectNonHQ
    ) {
      throw new BadRequestException([
        {
          isInvalidDataContent:
            'The program has a program status that does not support program editing',
        },
      ]);
    }

    const program_time_zone = timeZone(data.program_time_zone);
    const getProgramDetail = await this.findProgramById(param);

    if (checkApprove.program_approval.equals(statusApprove)) {
      if (!getProgramDetail) {
        throw new BadRequestException([
          { isInvalidDataContent: 'Program not found' },
        ]);
      }

      console.log(
        '=== VALIDASI EDIT NOT EDIT STAT END DATE',
        this.isExistDate(getProgramDetail, data),
      );
      if (this.isExistDate(getProgramDetail, data)) {
        if (getProgramDetail['keyword_linked'] == 0) {
          const validateStartEendDate = this.isProgramPeriodValid(
            data,
            program_time_zone,
            getProgramDetail,
          );

          if (!validateStartEendDate) {
            throw new BadRequestException([
              {
                isInvalidDataContent:
                  'start and end period smaller than your current date',
              },
            ]);
          }
        } else {
          const checkRestriction = await this.checkKeywordRestriction(
            data.start_period,
            data.end_period,
            getProgramDetail,
            program_time_zone,
          );
          console.log(
            '=== KEYWORD SUDAH ADA CONNECT KE PROGRAM',
            checkRestriction,
          );
          if (checkRestriction) {
            throw new BadRequestException([
              {
                isInvalidDataContent:
                  'The start and end period is smaller than the current date or the start and end period is between the start and end period keyword ranges',
              },
            ]);
          }
        }
      }

      const notifications: ProgramNotificationDTO[] = []; // mendeklarasikan variabel sebagai array kosong
      getProgramDetail.program_notification.map(async (notificationData) => {
        const viaArray = Array.isArray(notificationData.via)
          ? notificationData.via.map((id) => id?.toString())
          : notificationData.via;
        const notificationDTO: ProgramNotificationDTO = {
          template:
            notificationData.template == undefined
              ? ''
              : notificationData?.template?.toString(),
          template_content: notificationData.template_content,
          via: viaArray,
          receiver: [],
          notif_type: notificationData?.notif_type?.toString(),
        };
        notifications.push(notificationDTO); // menambahkan DTO ke dalam array
      });

      const duplicateProgram = new this.programModel({
        ...data,
        name: `${getProgramDetail.name}-EDIT`,
        program_notification: notifications, // menggunakan array DTO untuk properti program_notification
        program_approval: new mongoose.Types.ObjectId(
          await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_ADD'),
        ),
        created_by: account,
      });

      process = await duplicateProgram
        .save()
        .then(async (results) => {
          getProgramDetail.program_notification.map(async (notifcationData) => {
            const viaArray = Array.isArray(notifcationData.via)
              ? notifcationData.via.map((id) => id?.toString())
              : notifcationData.via;
            const newNotification = new this.programNotificationModel({
              template: notifcationData?.template?.toString(),
              template_content: notifcationData.template_content,
              program: results?._id,
              via: viaArray,
              receiver: [],
              notif_type: notifcationData?.notif_type?.toString(),
            });

            await newNotification
              .save()
              .then(async (returning) => {
                return returning;
              })
              .catch((e: Error) => {
                throw new Error(e.message);
              });
          });
          const getAccountService = await this.accountService.detail(
            results?.created_by?._id,
          );
          const trace_id = this.transactionOptional.getTracingId(
            data,
            response,
          );
          if (
            getAccountService.account_location.location_detail.name === 'HQ'
          ) {
            await this.sendProgramApprovalNotificationHQ(
              data,
              results,
              getAccountService,
              getProgramDetail,
              trace_id,
            );
          } else {
            await this.sendProgramApprovalNotificationNonHQ(
              data,
              results,
              getAccountService,
              getProgramDetail,
              trace_id,
            );
          }
          response.payload = data;
          return results;
        })
        .catch((e) => {
          if (e.code === 11000) {
            throw new BadRequestException([
              { isInvalidDataContent: 'Program with this name already exists' },
            ]);
          }
          throw e;
        });
    } else if (checkApprove.is_draft === false) {
      let updateData = false;
      if (
        checkApprove.program_approval.equals(statusReject) ||
        checkApprove.program_approval.equals(statusRejectNonHQ)
      ) {
        updateData = true;
      }
      await this.programModel
        .findOne({ _id: new mongoose.Types.ObjectId(param) })
        .exec()
        .then(async (program) => {
          console.log('=== CASE ELSE IF SUCCESS===');
          console.log(
            '=== VALIDASI EDIT NOT EDIT STAT END DATE',
            this.isExistDate(getProgramDetail, data),
          );
          if (this.isExistDate(getProgramDetail, data)) {
            const validateStartEendDate = this.isProgramPeriodValid(
              data,
              program_time_zone,
              getProgramDetail,
            );

            if (!validateStartEendDate) {
              throw new BadRequestException([
                {
                  isInvalidDataContent:
                    'start and end period smaller than your current date',
                },
              ]);
            }
          }

          if (program) {
            program.set({
              ...data,
              name: checkApprove.name,
              keyword_registration: checkApprove.keyword_registration,
              point_type: checkApprove.point_type,
              whitelist_counter: checkApprove.whitelist_counter,
              need_review_after_edit: updateData,
              is_draft: checkApprove.is_draft,
              program_approval: checkApprove.program_approval,
              updated_at: Date.now(),
            });

            await program.save();

            const superior_var = await this.findProgramById(param);
            const getAccountService = await this.accountService.detail(
              program?.created_by?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              data,
              response,
            );

            if (
              getAccountService.account_location.location_detail.name === 'HQ'
            ) {
              await this.sendProgramApprovalNotificationHQ(
                data,
                program,
                getAccountService,
                superior_var,
                trace_id,
              );
            } else {
              await this.sendProgramApprovalNotificationNonHQ(
                data,
                program,
                getAccountService,
                superior_var,
                trace_id,
              );
            }

            response.message = 'Program Main Info Updated Successfully';
            response.status = HttpStatus.OK;
            response.payload = data;
          } else {
            throw new BadRequestException([
              { isInvalidDataContent: 'Program not found.' },
            ]);
          }
        })
        .catch((error) => {
          throw new BadRequestException([
            {
              isInvalidDataContent: error?.message
                ? error?.message
                : 'Internal Server Error',
            },
          ]);
        });
    } else {
      let updateData = false;
      if (
        checkApprove.program_approval.equals(statusReject) ||
        checkApprove.program_approval.equals(statusRejectNonHQ)
      ) {
        updateData = true;
      }
      await this.programModel
        .findOne({ _id: new mongoose.Types.ObjectId(param) })
        .exec()
        .then(async (program) => {
          console.log('=== CASE ELSE IF SUCCESS===');
          console.log(
            '=== VALIDASI EDIT NOT EDIT STAT END DATE',
            this.isExistDate(getProgramDetail, data),
          );
          if (this.isExistDate(getProgramDetail, data)) {
            const validateStartEendDate = this.isProgramPeriodValid(
              data,
              program_time_zone,
              getProgramDetail,
            );
            console.log('=== VALUDATE ===', validateStartEendDate);
            if (!validateStartEendDate) {
              throw new BadRequestException([
                {
                  isInvalidDataContent:
                    'start and end period smaller than your current date',
                },
              ]);
              // throw new Error("start and end period smaller than your current date")
            }
          }

          if (program) {
            program.set({
              ...data,
              need_review_after_edit: updateData,
              updated_at: Date.now(),
            });

            await program.save();

            const superior_var = await this.findProgramById(param);
            const getAccountService = await this.accountService.detail(
              program?.created_by?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              data,
              response,
            );

            if (
              getAccountService.account_location.location_detail.name === 'HQ'
            ) {
              await this.sendProgramApprovalNotificationHQ(
                data,
                program,
                getAccountService,
                superior_var,
                trace_id,
              );
            } else {
              await this.sendProgramApprovalNotificationNonHQ(
                data,
                program,
                getAccountService,
                superior_var,
                trace_id,
              );
            }

            response.message = 'Program Main Info Updated Successfully';
            response.status = HttpStatus.OK;
            response.payload = data;
          } else {
            throw new BadRequestException([
              { isInvalidDataContent: 'Program not found' },
            ]);
          }
        })
        .catch((error) => {
          throw new BadRequestException([
            {
              isInvalidDataContent: error?.message
                ? error?.message
                : 'Internal Server Error',
            },
          ]);
        });
    }
    return response;
  }

  async editNotification(
    payload: ProgramNotificationEditDTO,
  ): Promise<ProgramNotificationEditDTOResponse> {
    const data = payload.data;
    const dtResponse = [];
    const errorResponse = [];
    if (data.length > 0) {
      const response = new ProgramNotificationEditDTOResponse();
      const idnotifProgram = data[0]['_id'];
      const statusApprove = new Types.ObjectId(
        await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_APPROVE_HQ'),
      );

      const statusReject = new Types.ObjectId(
        await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_REJECT_HQ'),
      );

      const statusRejectNonHQ = new Types.ObjectId(
        await this.appsService.getConfig(
          'DEFAULT_STATUS_PROGRAM_REJECT_NON_HQ',
        ),
      );

      const getNoticationisExist = await this.programNotificationModel.findOne({
        _id: new mongoose.Types.ObjectId(idnotifProgram),
      });
      if (!getNoticationisExist) {
        throw new BadRequestException([
          { isInvalidDataContent: 'Program Notification not found' },
        ]);
        // response.status = HttpStatus.NOT_FOUND;
        // response.message = 'Program Notification not found';
        // response.payload = {};
        // return response;
      }
      const checkApprove: any = await this.programModel.findOne({
        _id: getNoticationisExist.program,
      });
      let process;
      if (checkApprove.program_approval.equals(statusApprove)) {
        const getProgramDetail = await this.findProgramById(
          getNoticationisExist?.program,
        );
        if (!getProgramDetail) {
          throw new BadRequestException([
            { isInvalidDataContent: 'Program not found' },
          ]);
          // response.status = HttpStatus.NOT_FOUND;
          // response.message = 'Program not found';
          // response.payload = {};
          // return response;
        }

        // if (getProgramDetail['keyword-list'].length === 0) {
        //   // Lakukan sesuatu jika keyword-list kosong
        //   response.status = HttpStatus.NOT_FOUND;
        //   response.message =
        //     'The program does not have keywords linked to the program';
        //   response.payload = {};
        //   return response;
        // }

        const programDTO: ProgramEditMainInfoDTO = new ProgramEditMainInfoDTO();
        programDTO.name = getProgramDetail.name;
        programDTO.desc = getProgramDetail.desc;
        programDTO.start_period = getProgramDetail.start_period;
        programDTO.end_period = getProgramDetail.end_period;
        programDTO.point_type = getProgramDetail.point_type;
        programDTO.program_mechanism = getProgramDetail.program_mechanism;
        programDTO.program_owner = getProgramDetail.program_owner;
        programDTO.program_owner_detail = getProgramDetail.program_owner_detail;
        programDTO.keyword_registration = getProgramDetail.keyword_registration;
        programDTO.point_registration = getProgramDetail.point_registration;
        programDTO.threshold_alarm_expired =
          getProgramDetail.threshold_alarm_expired;
        programDTO.whitelist_counter = getProgramDetail.whitelist_counter;
        programDTO.logic = getProgramDetail.logic;
        programDTO.program_time_zone = getProgramDetail.program_time_zone;
        programDTO.program_group = getProgramDetail.program_group;
        programDTO.program_parent = getProgramDetail.program_parent;
        programDTO.alarm_pic_type = getProgramDetail.alarm_pic_type;
        programDTO.alarm_pic = getProgramDetail.alarm_pic;
        programDTO.threshold_alarm_voucher =
          getProgramDetail.threshold_alarm_voucher;
        programDTO.is_draft = getProgramDetail.is_draft;

        const getAccountService = await this.accountService.detail(
          getProgramDetail?.created_by?._id,
        );

        const notificationsProgram: any[] = []; // mendeklarasikan variabel sebagai array kosong
        data.forEach((notificationData) => {
          delete notificationData['_id'];
          notificationsProgram.push(notificationData);
        });

        const duplicateProgram = new this.programModel({
          ...programDTO,
          name: `${getProgramDetail.name}-EDIT`,
          program_approval: new mongoose.Types.ObjectId(
            await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_ADD'),
          ),
          program_notification: notificationsProgram,
          created_by: getAccountService,
        });
        process = await duplicateProgram
          .save()
          .then(async (results) => {
            data.map(async (notificationData) => {
              delete notificationData['_id'];

              const newNotification = new this.programNotificationModel({
                program: results?._id,
                via: notificationData?.via,
                receiver: [],
                notif_type: notificationData?.notif_type,
                template: notificationData?.template,
                template_content: notificationData?.template_content,
              });
              await newNotification
                .save()
                .then(async (returning) => {
                  return returning;
                })
                .catch((e: Error) => {
                  throw new BadRequestException([
                    {
                      isInvalidDataContent: e?.message
                        ? e?.message
                        : 'Internal Server Error',
                    },
                  ]);
                  // throw new Error(e.message);
                });
            });
            return results;
          })
          .catch((e) => {
            throw new BadRequestException([
              {
                isInvalidDataContent: e?.message
                  ? e?.message
                  : 'Internal Server Error',
              },
            ]);
            // throw new Error(e.message);
          });
        if (errorResponse.length > 0) {
          // response.status = 400;
          // response.message = 'Program Notification failed to update';
          // throw new Error(errorResponse.join(','));
          throw new BadRequestException([
            { isInvalidDataContent: 'Program Notification failed to update' },
          ]);
        } else {
          response.status = HttpStatus.OK;
          response.message = 'Program Notification updated successfully';
          response.payload = process;
          return response;
        }
      } else {
        let updateData = false;
        if (
          checkApprove.program_approval.equals(statusReject) ||
          checkApprove.program_approval.equals(statusRejectNonHQ)
        ) {
          updateData = true;
        }

        await this.programModel
          .findOneAndUpdate(
            {
              _id: getNoticationisExist.program,
            },
            {
              need_review_after_edit: updateData,
              updated_at: Date.now(),
            },
          )
          .catch((e) => {
            throw new BadRequestException([
              {
                isInvalidDataContent: e?.message
                  ? e?.message
                  : 'Internal Server Error',
              },
            ]);
            // throw new Error(e.message);
          })
          .then(() => {
            dtResponse.push('Update Need Review Ater Edit to true');
          });

        data.map(async (notificationData) => {
          const id = notificationData['_id'];
          delete notificationData['_id'];

          await this.programNotificationModel
            .findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(id) },
              {
                via: notificationData.via,
                template: notificationData.template,
                template_content: notificationData.template_content,
              },
              { new: true, upsert: true },
            )
            .catch((e: Error) => {
              errorResponse.push(e.message);
            })
            .then(() => {
              dtResponse.push('OK');
            });
        });

        if (errorResponse.length > 0) {
          throw new BadRequestException([
            { isInvalidDataContent: 'Program Notification failed to update' },
          ]);
          // response.status = 400;
          // response.message = 'Program Notification failed to update';
          // throw new Error(errorResponse.join(','));
        } else {
          response.status = HttpStatus.OK;
          response.message = 'Program Notification updated successfully';
          response.payload = dtResponse;
          return response;
        }
      }
    }
  }

  async deleteProgram(param: string): Promise<ProgramDeleteDTOResponse> {
    const isValidObjectId = Types.ObjectId.isValid(param);
    if (isValidObjectId) {
      const process = await this.programModel
        .findOneAndUpdate(
          { _id: param, is_draft: true },
          { $set: { deleted_at: new Date() } },
        )
        .then((results) => {
          return results;
        });

      const response = new ProgramDeleteDTOResponse();
      if (process) {
        response.status = HttpStatus.OK;
        response.message = 'Program Deleted Successfully';
        response.payload = process;
      } else {
        throw new BadRequestException([
          { isInvalidDataContent: 'Program Failed to Delete' },
        ]);
        // response.status = 400;
        // response.message = 'Program Failed to Delete';
        // response.payload = {};
      }
      return response;
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: `ID ${param} is not valid format` },
      ]);
    }
  }

  async findProgramById(param: any): Promise<any> {
    let data;
    const id = new Types.ObjectId(param);
    const getProgram = await this.programModel.findById(id);
    const checkProgEdit = getProgram?.name.includes('-EDIT');
    const checkProgHQ =
      getProgram?.created_by?.account_location?.location_detail?.type.toString();
    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    let isHq = false;
    if (checkProgHQ == hqLocation) {
      isHq = true;
    } else {
      isHq = false;
    }
    console.log('=== IS HQ ===', isHq);

    if (checkProgEdit && isHq == false) {
      const mainProg = getProgram?.name.replace(/-EDIT$/, '');
      const getProgramMain = await this.programModel.findOne({
        name: mainProg,
      });
      data = await this.programModel.aggregate(
        [
          {
            $project: {
              name: true,
              desc: true,
              start_period: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$program_time_zone', 'WIT'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 9 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WITA'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 8 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WIB'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'GENERAL'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$start_period',
                },
              },
              end_period: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$program_time_zone', 'WIT'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 9 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WITA'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 8 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WIB'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'GENERAL'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$end_period',
                },
              },
              point_type: true,
              program_mechanism: true,
              program_owner: true,
              program_owner_detail: true,
              keyword_registration: true,
              point_registration: true,
              whitelist_counter: true,
              whitelist_check: true,
              logic: true,
              program_time_zone: true,
              program_group: true,
              alarm_pic_type: true,
              alarm_pic: {
                $map: {
                  input: '$alarm_pic',
                  as: 'alarm_pic_info',
                  in: {
                    $toObjectId: '$$alarm_pic_info',
                  },
                },
              },
              threshold_alarm_expired: true,
              threshold_alarm_voucher: true,
              program_approval: true,
              is_draft: true,
              need_review_after_edit: true,
              created_by: true,
            },
          },
          {
            $lookup: {
              from: 'pics',
              let: { alarm_pic_id: '$alarm_pic' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$alarm_pic_id'],
                    },
                  },
                },
                {
                  $project: {
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'alarm_pic_info',
            },
          },
          {
            $lookup: {
              from: 'keywords',
              let: { id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            {
                              $convert: {
                                input: '$eligibility.program_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                            '$$id',
                          ],
                        },
                        {
                          $eq: ['$keyword_edit', null],
                        },
                        {
                          $not: [
                            {
                              $regexMatch: {
                                input: '$eligibility.name',
                                regex: '-EDIT$',
                                options: 'i',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    reward_catalog: false,
                    __v: false,
                  },
                },
              ],
              as: 'keyword-list',
            },
          },
          {
            $lookup: {
              from: 'programnotifications',
              let: { program_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$program', '$$program_id'] }],
                    },
                  },
                },
                {
                  $project: {
                    via: {
                      $map: {
                        input: '$via',
                        as: 'via_detail',
                        in: {
                          $toObjectId: '$$via_detail',
                        },
                      },
                    },
                    receiver: {
                      $map: {
                        input: '$receiver',
                        as: 'receiver_detail',
                        in: {
                          $toObjectId: '$$receiver_detail',
                        },
                      },
                    },
                    notif_type: true,
                    template: true,
                    template_content: true,
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { via_id: '$via' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $in: ['$_id', '$$via_id'],
                          },
                        },
                      },
                    ],
                    as: 'via_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    localField: 'receiver',
                    foreignField: '_id',
                    as: 'receiver_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'notificationtemplates',
                    localField: 'notification',
                    foreignField: '_id',
                    as: 'notification_detail',
                  },
                },
                {
                  $project: {
                    program: false,
                    // via: false,
                    receiver: false,
                  },
                },
              ],
              as: 'program_notification',
            },
          },
          {
            $lookup: {
              from: 'programapprovallogs',
              let: {
                processed_by: '$created_by.superior_hq',
                program_id: '$_id',
                programMain: new Types.ObjectId(getProgramMain?._id), // This line seems incorrect
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        {
                          $and: [
                            { $eq: ['$program', '$$programMain'] },
                            {
                              $eq: [
                                '$processed_by',
                                {
                                  $convert: {
                                    input: '$$processed_by',
                                    to: 'objectId',
                                    onNull: '',
                                    onError: '',
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          $eq: ['$program', '$$program_id'],
                        },
                      ],
                    },
                  },
                },
                { $sort: { created_at: 1 } },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { status: '$status' },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ['$_id', '$$status'] },
                        },
                      },
                      {
                        $project: {
                          group_name: false,
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'status',
                  },
                },
                {
                  $lookup: {
                    from: 'accounts',
                    let: { account: '$processed_by' },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ['$_id', '$$account'] },
                        },
                      },
                      {
                        $project: {
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'processed_by',
                  },
                },
                {
                  $project: {
                    program: false,
                    __v: false,
                  },
                },
              ],
              as: 'approval_log',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_hq_id: '$created_by.superior_hq' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$superior_hq_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_hq',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_hq',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_local_id: '$created_by.superior_local' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$superior_local_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_local',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_local',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { point_type_id: '$point_type' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$point_type_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'point_type_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_mechanism_id: '$program_mechanism' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_mechanism_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_mechanism_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_owner_id: '$program_owner' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_owner_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_owner_info',
            },
          },
          {
            $lookup: {
              from: 'locations',
              let: { program_owner_detail_id: '$program_owner_detail' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_owner_detail_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    __v: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_owner_detail_info',
            },
          },
          {
            $lookup: {
              from: 'systemconfigs',
              let: {
                location_type_id:
                  '$created_by.account_location.location_detail.type',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$param_value',
                            { $toString: '$$location_type_id' },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    param_value: false,
                    __v: false,
                  },
                },
              ],
              as: 'isHQ',
            },
          },
          {
            $unwind: {
              path: '$isHQ',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              isHQ: {
                $cond: {
                  if: { $ne: ['$isHQ.param_key', 'DEFAULT_LOCATION_HQ'] },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_status: '$program_approval' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$program_status'] }],
                    },
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $project: {
              'status.group_name': false,
              'status.created_by': false,
              'status.created_at': false,
              'status.updated_at': false,
              'status.deleted_at': false,
              'status.__v': false,
            },
          },
          {
            $set: {
              keyword_linked: {
                $cond: {
                  if: { $isArray: '$keyword-list' },
                  then: { $size: '$keyword-list' },
                  else: 0,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'programv2',
              let: { original_program_name: '$name' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$name',
                        { $concat: ['$$original_program_name', '-EDIT'] },
                      ],
                    },
                  },
                },
              ],
              as: 'program_duplicate',
            },
          },
          {
            $set: {
              is_duplicating: {
                $cond: {
                  if: { $gt: [{ $size: '$program_duplicate' }, 0] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              program_duplicate: 0,
            },
          },
          {
            $match: {
              $and: [{ _id: id }, { deleted_at: null }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );

      const isValidObjectId = Types.ObjectId.isValid(param);
      if (isValidObjectId) {
        if (data.length > 0) {
          return data[0];
        } else {
          throw new BadRequestException([
            { isInvalidDataContent: `Data with ID ${param} is not found` },
          ]);
        }
      } else {
        throw new BadRequestException([
          { isInvalidDataContent: `ID ${param} is not valid format` },
        ]);
      }
    } else {
      data = await this.programModel.aggregate(
        [
          {
            $project: {
              name: true,
              desc: true,
              start_period: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$program_time_zone', 'WIT'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 9 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WITA'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 8 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WIB'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'GENERAL'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$start_period',
                },
              },
              end_period: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$program_time_zone', 'WIT'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 9 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WITA'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 8 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WIB'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'GENERAL'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$end_period',
                },
              },
              point_type: true,
              program_mechanism: true,
              program_owner: true,
              program_owner_detail: true,
              keyword_registration: true,
              point_registration: true,
              whitelist_counter: true,
              whitelist_check: true,
              logic: true,
              program_time_zone: true,
              program_group: true,
              alarm_pic_type: true,
              alarm_pic: {
                $map: {
                  input: '$alarm_pic',
                  as: 'alarm_pic_info',
                  in: {
                    $toObjectId: '$$alarm_pic_info',
                  },
                },
              },
              threshold_alarm_expired: true,
              threshold_alarm_voucher: true,
              program_approval: true,
              is_draft: true,
              need_review_after_edit: true,
              created_by: true,
            },
          },
          {
            $lookup: {
              from: 'pics',
              let: { alarm_pic_id: '$alarm_pic' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$alarm_pic_id'],
                    },
                  },
                },
                {
                  $project: {
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'alarm_pic_info',
            },
          },
          {
            $lookup: {
              from: 'keywords',
              let: { id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            {
                              $convert: {
                                input: '$eligibility.program_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                            '$$id',
                          ],
                        },
                        {
                          $eq: ['$keyword_edit', null],
                        },
                        {
                          $not: [
                            {
                              $regexMatch: {
                                input: '$eligibility.name',
                                regex: '-EDIT$',
                                options: 'i',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    reward_catalog: false,
                    __v: false,
                  },
                },
              ],
              as: 'keyword-list',
            },
          },
          {
            $lookup: {
              from: 'programnotifications',
              let: { program_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$program', '$$program_id'] }],
                    },
                  },
                },
                {
                  $project: {
                    via: {
                      $map: {
                        input: '$via',
                        as: 'via_detail',
                        in: {
                          $toObjectId: '$$via_detail',
                        },
                      },
                    },
                    receiver: {
                      $map: {
                        input: '$receiver',
                        as: 'receiver_detail',
                        in: {
                          $toObjectId: '$$receiver_detail',
                        },
                      },
                    },
                    notif_type: true,
                    template: true,
                    template_content: true,
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { via_id: '$via' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $in: ['$_id', '$$via_id'],
                          },
                        },
                      },
                    ],
                    as: 'via_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    localField: 'receiver',
                    foreignField: '_id',
                    as: 'receiver_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'notificationtemplates',
                    localField: 'notification',
                    foreignField: '_id',
                    as: 'notification_detail',
                  },
                },
                {
                  $project: {
                    program: false,
                    // via: false,
                    receiver: false,
                  },
                },
              ],
              as: 'program_notification',
            },
          },
          {
            $lookup: {
              from: 'programapprovallogs',
              let: { program_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$program', '$$program_id'] }],
                    },
                  },
                },
                { $sort: { created_at: 1 } },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { status: '$status' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$status'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          group_name: false,
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'status',
                  },
                },
                {
                  $lookup: {
                    from: 'accounts',
                    let: { account: '$processed_by' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$account'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'processed_by',
                  },
                },
                {
                  $project: {
                    program: false,
                    __v: false,
                  },
                },
              ],
              as: 'approval_log',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_hq_id: '$created_by.superior_hq' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$superior_hq_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_hq',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_hq',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_local_id: '$created_by.superior_local' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$superior_local_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_local',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_local',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { point_type_id: '$point_type' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$point_type_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'point_type_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_mechanism_id: '$program_mechanism' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_mechanism_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_mechanism_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_owner_id: '$program_owner' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_owner_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_owner_info',
            },
          },
          {
            $lookup: {
              from: 'locations',
              let: { program_owner_detail_id: '$program_owner_detail' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_owner_detail_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    __v: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_owner_detail_info',
            },
          },
          {
            $lookup: {
              from: 'systemconfigs',
              let: {
                location_type_id:
                  '$created_by.account_location.location_detail.type',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$param_value',
                            { $toString: '$$location_type_id' },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    param_value: false,
                    __v: false,
                  },
                },
              ],
              as: 'isHQ',
            },
          },
          {
            $unwind: {
              path: '$isHQ',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              isHQ: {
                $cond: {
                  if: { $ne: ['$isHQ.param_key', 'DEFAULT_LOCATION_HQ'] },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_status: '$program_approval' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$program_status'] }],
                    },
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $project: {
              'status.group_name': false,
              'status.created_by': false,
              'status.created_at': false,
              'status.updated_at': false,
              'status.deleted_at': false,
              'status.__v': false,
            },
          },
          {
            $set: {
              keyword_linked: {
                $cond: {
                  if: { $isArray: '$keyword-list' },
                  then: { $size: '$keyword-list' },
                  else: 0,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'programv2',
              let: { original_program_name: '$name' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$name',
                        { $concat: ['$$original_program_name', '-EDIT'] },
                      ],
                    },
                  },
                },
              ],
              as: 'program_duplicate',
            },
          },
          {
            $set: {
              is_duplicating: {
                $cond: {
                  if: { $gt: [{ $size: '$program_duplicate' }, 0] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              program_duplicate: 0,
            },
          },
          {
            $match: {
              $and: [{ _id: id }, { deleted_at: null }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );

      const isValidObjectId = Types.ObjectId.isValid(param);
      if (isValidObjectId) {
        if (data.length > 0) {
          return data[0];
        } else {
          throw new BadRequestException([
            { isInvalidDataContent: `Data with ID ${param} is not found` },
          ]);
        }
      } else {
        throw new BadRequestException([
          { isInvalidDataContent: `ID ${param} is not valid format` },
        ]);
      }
    }
    return data;
  }

  async findProgramByIdWithRedis(param: any): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.PROGRAM_KEY}-${param.toString()}`;
    const redisProgram: any = await this.cacheManager.get(key);
    let result = null;

    if (redisProgram) {
      console.log(`REDIS|Load program ${param} from Redis|${Date.now() - now}`);

      result = redisProgram;
    } else {
      const data = await this.programModel.aggregate(
        [
          {
            $project: {
              name: true,
              desc: true,
              start_period: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$program_time_zone', 'WIT'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 9 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WITA'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 8 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WIB'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'GENERAL'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$start_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$start_period',
                },
              },
              end_period: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$program_time_zone', 'WIT'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 9 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WITA'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 8 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'WIB'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: { $eq: ['$program_time_zone', 'GENERAL'] },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: ['$end_period', 7 * 60 * 60 * 1000],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$end_period',
                },
              },
              point_type: true,
              program_mechanism: true,
              program_owner: true,
              program_owner_detail: true,
              keyword_registration: true,
              point_registration: true,
              whitelist_counter: true,
              whitelist_check: true,
              logic: true,
              program_time_zone: true,
              program_group: true,
              alarm_pic_type: true,
              alarm_pic: {
                $map: {
                  input: '$alarm_pic',
                  as: 'alarm_pic_info',
                  in: {
                    $toObjectId: '$$alarm_pic_info',
                  },
                },
              },
              threshold_alarm_expired: true,
              threshold_alarm_voucher: true,
              program_approval: true,
              is_draft: true,
              need_review_after_edit: true,
              created_by: true,
            },
          },
          {
            $lookup: {
              from: 'pics',
              let: { alarm_pic_id: '$alarm_pic' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$alarm_pic_id'],
                    },
                  },
                },
                {
                  $project: {
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'alarm_pic_info',
            },
          },
          {
            $lookup: {
              from: 'programnotifications',
              let: { program_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$program', '$$program_id'] }],
                    },
                  },
                },
                {
                  $project: {
                    via: {
                      $map: {
                        input: '$via',
                        as: 'via_detail',
                        in: {
                          $toObjectId: '$$via_detail',
                        },
                      },
                    },
                    receiver: {
                      $map: {
                        input: '$receiver',
                        as: 'receiver_detail',
                        in: {
                          $toObjectId: '$$receiver_detail',
                        },
                      },
                    },
                    notif_type: true,
                    template: true,
                    template_content: true,
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { via_id: '$via' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $in: ['$_id', '$$via_id'],
                          },
                        },
                      },
                    ],
                    as: 'via_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    localField: 'receiver',
                    foreignField: '_id',
                    as: 'receiver_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'notificationtemplates',
                    localField: 'notification',
                    foreignField: '_id',
                    as: 'notification_detail',
                  },
                },
                {
                  $project: {
                    program: false,
                    // via: false,
                    receiver: false,
                  },
                },
              ],
              as: 'program_notification',
            },
          },
          {
            $lookup: {
              from: 'programapprovallogs',
              let: { program_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$program', '$$program_id'] }],
                    },
                  },
                },
                { $sort: { created_at: 1 } },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { status: '$status' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$status'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          group_name: false,
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'status',
                  },
                },
                {
                  $lookup: {
                    from: 'accounts',
                    let: { account: '$processed_by' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$account'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'processed_by',
                  },
                },
                {
                  $project: {
                    program: false,
                    __v: false,
                  },
                },
              ],
              as: 'approval_log',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_hq_id: '$created_by.superior_hq' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$superior_hq_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_hq',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_hq',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_local_id: '$created_by.superior_local' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$superior_local_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_local',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_local',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { point_type_id: '$point_type' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$point_type_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'point_type_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_mechanism_id: '$program_mechanism' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_mechanism_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_mechanism_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_owner_id: '$program_owner' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_owner_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_owner_info',
            },
          },
          {
            $lookup: {
              from: 'locations',
              let: { program_owner_detail_id: '$program_owner_detail' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$_id',
                            {
                              $convert: {
                                input: '$$program_owner_detail_id',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    __v: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'program_owner_detail_info',
            },
          },
          {
            $lookup: {
              from: 'systemconfigs',
              let: {
                location_type_id:
                  '$created_by.account_location.location_detail.type',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            {
                              $convert: {
                                input: '$param_value',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                            '$$location_type_id',
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    param_value: false,
                    __v: false,
                  },
                },
              ],
              as: 'isHQ',
            },
          },
          {
            $unwind: {
              path: '$isHQ',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              isHQ: {
                $cond: {
                  if: { $ne: ['$isHQ.param_key', 'DEFAULT_LOCATION_HQ'] },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { program_status: '$program_approval' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$program_status'] }],
                    },
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $project: {
              'status.group_name': false,
              'status.created_by': false,
              'status.created_at': false,
              'status.updated_at': false,
              'status.deleted_at': false,
              'status.__v': false,
            },
          },
          {
            $lookup: {
              from: 'programv2',
              let: { original_program_name: '$name' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$name',
                        { $concat: ['$$original_program_name', '-EDIT'] },
                      ],
                    },
                  },
                },
              ],
              as: 'program_duplicate',
            },
          },
          {
            $set: {
              is_duplicating: {
                $cond: {
                  if: { $gt: [{ $size: '$program_duplicate' }, 0] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              program_duplicate: 0,
            },
          },
          {
            $match: {
              $and: [{ _id: new Types.ObjectId(param) }, { deleted_at: null }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );

      console.log(
        `REDIS|Load program ${param} from Database|${Date.now() - now}`,
      );

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 24 * 60 * 60 });
        result = data;
      }
    }

    const isValidObjectId = Types.ObjectId.isValid(param);
    if (isValidObjectId) {
      if (result?.length > 0) {
        return result[0];
      } else {
        throw new BadRequestException([
          { isInvalidDataContent: `Data with ID ${param} is not found` },
        ]);
      }
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: `ID ${param} is not valid format` },
      ]);
    }
  }

  async getProgramSelection(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== '' ? JSON.parse(param.filter) : {};
    const sort_set =
      param.sort === '{}' || param.sort === ''
        ? { _id: 1 }
        : JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.programModel.aggregate(
      [
        {
          $lookup: {
            from: 'programbonus',
            let: { bonus_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$program', '$$bonus_id'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'lovs',
                  localField: 'bonus_type',
                  foreignField: '_id',
                  as: 'bonus_type_detail',
                },
              },
              {
                $lookup: {
                  from: 'locations',
                  localField: 'location',
                  foreignField: '_id',
                  as: 'location_detail',
                },
              },
              {
                $lookup: {
                  from: 'locationbuckets',
                  localField: 'bucket',
                  foreignField: '_id',
                  as: 'bucket_detail',
                },
              },
              {
                $project: {
                  _id: false,
                  program: false,
                  bonus_type: false,
                  location: false,
                  bucket: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'program_bonus',
          },
        },
        {
          $match: filter_builder,
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: sort_set },
      ],
      (err, result) => {
        return result;
      },
    );

    return data;
  }

  async checkUniqueProgram(parameter: any) {
    return (await this.programModel.findOne(parameter).exec()) === null;
  }

  async getProgramTemp(
    param: any,
    program: string,
    type: string,
    identifier: string,
  ): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 10;
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = { match: 1 };

    const filter_builder = {
      $and: [],
    };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          autoColumn[a] = {
            $eq: filterSet[a].value,
          };
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    filter_builder.$and.push({ program: new mongoose.Types.ObjectId(program) });
    filter_builder.$and.push({ type: type });
    filter_builder.$and.push({ identifier: identifier });

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    } else {
      query.push({
        $match: {
          $and: [{ msisdn: { $regex: new RegExp(``, 'i') }, deleted_at: null }],
        },
      });
    }

    const allNoFilter = await this.programTempListModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({ $skip: first });

    query.push({ $limit: rows });

    const data = await this.programTempListModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    const totalUnmatchedRecords = await this.programTempListModel.count({
      program: new mongoose.Types.ObjectId(program),
      type: type,
      match: false,
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        totalUnmatchedRecords: totalUnmatchedRecords,
        data: data,
      },
    };
  }

  async addProgramTempList(
    programTemplistData: ProgramTemplistAddDTO,
    account: any,
  ): Promise<ProgramTemplistAddDTOResponse> {
    const response = new ProgramTemplistAddDTOResponse();
    response.transaction_classify = 'ADD_PROGRAM_SEGMENTATION_MANUAL';
    response.message = 'Payload is empty';
    response.status = 400;
    response.payload = {};

    const dtSet = programTemplistData.set;
    const dtPayload = [];

    if (programTemplistData.set.length > 0) {
      response.message = 'Program Templist Created Successfully';
      response.status = HttpStatus.OK;

      for (let index = 0; index < dtSet.length; index++) {
        // Msisdn Formatted
        const msisdn = ssoFormatToId(dtSet[index].msisdn);

        // regex checking..
        const isMatch = isMatchProgramSSO(
          dtSet[index].msisdn,
          programTemplistData.identifier,
        );

        const isExist = await this.msisdnCheck(msisdn, dtSet[index].program);
        const counter = parseInt(dtSet[index].counter);
        dtPayload[index] = {
          account: account?._id?.toString(),
          location: account?.account_location?.location?.toString(),
          msisdn: msisdn,
          program: new ObjectId(dtSet[index].program),
          counter: counter,
          match: isMatch,
          type: dtSet[index].type,
          identifier: programTemplistData.identifier,
        };

        //UPDATE Is blacklist and whitelist
        const type = dtPayload[index].type;
        const updateFields: any = {};

        // Cek apakah type adalah whitelist atau blacklist
        if (type === 'whitelist') {
          updateFields.is_whitelist = true;
          updateFields.is_blacklist = false; // optional jika kamu ingin set false
        } else if (type === 'blacklist') {
          updateFields.is_blacklist = true;
          updateFields.is_whitelist = false; // optional jika kamu ingin set false
        }

        // Update data di MongoDB
        await this.programModel.findOneAndUpdate(
          { _id: dtPayload[index].program }, // Filter berdasarkan ID program
          { $set: updateFields }, // Fields yang di-update
          { new: true }, // Return the updated document
        );

        if (isExist.exist) {
            //update counter jika data exist
            const counter =
              parseInt(isExist.counter) + parseInt(dtSet[index].counter);
            dtPayload[index].counter = counter;
            const filter = {
              $and: [
                { program: new ObjectId(dtSet[index].program) },
                { type: dtSet[index].type },
                {
                  $or: [
                    { msisdn: msisdn },
                    { msisdn: this.switchPrefixPhoneNumber(msisdn) },
                  ],
                },
              ],
            };

            const update = {
              $set: {
                counter: counter,
              },
            };

            // Tambahkan logging untuk memastikan nilai filter dan update benar
            console.log("Filter:", filter);
            console.log("Update:", update);

            await this.programTempListModel.findOneAndUpdate(
              filter,
              update,
              {
                new: true,
              },
            );
          response.message = 'Program Templist Created/Updated Successfully';
        } else {
          //create new doc jika data not-exist
          const doc = await this.programTempListModel.create(dtPayload[index]);
        }
      }
    }

    response.payload = dtPayload;
    return response;
  }

  formatPrefixPhoneNumber(phoneNumber) {
    if (phoneNumber.charAt(0) === '0') {
      // jika string pertama 0, maka ubah menjadi 62
      return '62' + phoneNumber.substring(1);
    } else {
      return phoneNumber;
    }
  }

  switchPrefixPhoneNumber(phoneNumber) {
    if (phoneNumber.charAt(0) === '0') {
      // jika string pertama 0, maka ubah menjadi 62
      return '62' + phoneNumber.substring(1);
    } else {
      // jika string pertama 62, maka ubah menjadi 0
      return '0' + phoneNumber.substring(2);
    }
  }

  /**
   * function msisdn check
   * @param msisdn
   * @param programId
   */
  async msisdnCheck(msisdn: string, programId: string, tselId = '') {
    let data;
    if (tselId) {
      data = await this.programTempListModel
        .aggregate(
          [
            {
              $match: {
                $and: [
                  {
                    $or: [
                      { msisdn: msisdn },
                      { msisdn: this.switchPrefixPhoneNumber(msisdn) },
                      { msisdn: tselId },
                    ],
                  },
                  { program: new ObjectId(programId) },
                  { deleted_at: null },
                ],
              },
            },
            { $sort: { counter: 1 } },
          ],
          (err, result) => {
            return result;
          },
        )
        .exec();
    } else {
      data = await this.programTempListModel
        .aggregate(
          [
            {
              $match: {
                $and: [
                  {
                    $or: [
                      { msisdn: msisdn },
                      { msisdn: this.switchPrefixPhoneNumber(msisdn) },
                    ],
                  },
                  { program: new ObjectId(programId) },
                  { deleted_at: null },
                ],
              },
            },
          ],
          (err, result) => {
            return result;
          },
        )
        .exec();
    }

    return {
      exist: data.length > 0,
      type: data.length ? data[0].type : null,
      counter: data.length ? data[0].counter : null,
    };
  }

  /**
   * function program whitelist & blacklist check
   * @param msisdn
   * @param programId
   * @param whitelistCheck
   */
  async checkProgramWBList(
    tselId: string,
    msisdn: string,
    programId: string,
    whitelistCheck: boolean,
  ) {
    const result = {
      eligible: true,
      reason: '',
      notification_group: NotificationTemplateConfig.REDEEM_SUCCESS,
    };

    const programCheck = await this.programModel
      .findOne({ _id: programId })
      .exec();
    const msisdnCheck = await this.msisdnCheck(msisdn, programId, tselId);

    console.log('===== WHITELIST ELIGI ====');
    console.log(whitelistCheck, msisdnCheck);
    console.log('===== WHITELIST ELIGI ====');

    // blacklist
    if (msisdnCheck.exist) {
      if (msisdnCheck.type.toLowerCase() === 'blacklist') {
        result.reason = `Program and msisdn is not in blacklist`;
        result.eligible = false;
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_BLACKLIST;

        return result;
      }
    }

    // whitelist_check = true
    if (whitelistCheck) {
      if (msisdnCheck.exist) {
        if (msisdnCheck.type.toLowerCase() === 'whitelist') {
          if (programCheck.whitelist_counter) {
            if (msisdnCheck.counter <= 0) {
              result.reason = `Counter is smaller than 0`;
              result.eligible = false;
              result.notification_group =
                NotificationTemplateConfig.REDEEM_FAILED_WHITELIST;

              return result;
            }
          }
        }
      } else {
        result.reason = `Msisdn is not listed in whitelist`;
        result.eligible = false;
        result.notification_group =
          NotificationTemplateConfig.REDEEM_FAILED_WHITELIST;

        return result;
      }
    }

    // for counter
    if (msisdnCheck.exist) {
      if (msisdnCheck.type.toLowerCase() === 'whitelist') {
        if (programCheck.whitelist_counter) {
          // jika counternya sudah habis?
          if (msisdnCheck.counter <= 0) {
            result.reason = `Counter is smaller than 0`;
            result.eligible = false;
            result.notification_group =
              NotificationTemplateConfig.REDEEM_FAILED_WHITELIST;

            return result;
          }
        }
      }
    }

    return result;
  }

  async getProgramWBlist(param: any, type: string, program: string) {
    await this.programModel.findOne({ _id: program }).exec();

    const filter_set =
      param.filter && param.filter !== '' && param.filter !== '{}'
        ? JSON.parse(param.filter)
        : {};
    const sort_set =
      param.sort && param.sort !== '' && param.sort !== '{}'
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {
      program: program,
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    let data: any;
    if (type === 'whitelist') {
      data = await this.programWModel.aggregate(
        [
          {
            $match: filter_builder,
          },
          { $sort: sort_set },
          { $skip: skip },
          { $limit: limit },
        ],
        (err, result) => {
          return result;
        },
      );
    } else {
      data = await this.programBModel.aggregate(
        [
          {
            $match: filter_builder,
          },
          { $sort: sort_set },
          { $skip: skip },
          { $limit: limit },
        ],
        (err, result) => {
          return result;
        },
      );
    }

    return {
      data: data,
      total: data.length,
    };
  }

  async getProgramPrimeTable(
    param: any,
    credential: any,
    token: string,
  ): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: token,
    });

    const location_type = new mongoose.Types.ObjectId(
      accountSet.account_location.location_detail.type,
    );
    // const location_name = accountSet.account_location.location_detail;

    const defaultLocationHQ = await this.appsService.getConfig(
      'DEFAULT_LOCATION_HQ',
    );

    const defaultLocationRegion = await this.appsService.getConfig(
      'DEFAULT_STATUS_LOCATION_REGION',
    );

    const defaultLocationBranch = await this.appsService.getConfig(
      'DEFAULT_STATUS_LOCATION_BRANCH',
    );

    const defaultLocationArea = await this.appsService.getConfig(
      'DEFAULT_STATUS_LOCATION_AREA',
    );

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          if (a === 'created_at') {
            const start =
              moment(filterSet[a].start_date)
                .subtract(1, 'days')
                .format('YYYY-MM-DDT') + '17:00:00.000Z';
            const end =
              moment(filterSet[a].end_date).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(start),
              $lt: new Date(end),
            };
          } else {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          }
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === 'program_approval') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'created_by._id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'program_group') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'program_mechanism') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'created_by.account_location.location') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    } else {
      query.push({
        $sort: { created_at: -1 },
      });
    }

    query.push({
      $match: {
        $and: [{ program_edit: null }, { name: { $not: /-EDIT-/ } }],
      },
    });

    // filter location by login account
    if (location_type?.toString() !== defaultLocationHQ) {
      const userLocation = credential.account_location.location;

      if (location_type?.toString() === defaultLocationArea) {
        console.log('=== PROGRAM VIEW AREA ===');

        const listIdLocation = await this.getListIdLocation(
          this.locationModel,
          userLocation,
          location_type,
        );

        console.log('=== listIdLocation ===', listIdLocation);
        query.push({
          $match: {
            program_owner_detail: { $in: listIdLocation },
          },
        });
      }

      if (location_type?.toString() === defaultLocationRegion) {
        console.log('=== PROGRAM VIEW REGION ===');
        const listIdLocation = await this.getListIdLocation(
          this.locationModel,
          userLocation,
          location_type,
        );

        console.log('=== listIdLocation ===', listIdLocation);
        query.push({
          $match: {
            program_owner_detail: { $in: listIdLocation },
          },
        });
      }

      if (location_type?.toString() === defaultLocationBranch) {
        console.log('=== PROGRAM VIEW BRANCH ===');
        const listIdLocation = await this.getListIdLocation(
          this.locationModel,
          userLocation,
          location_type,
        );

        console.log('=== listIdLocation ===', listIdLocation);
        query.push({
          $match: {
            program_owner_detail: { $in: listIdLocation },
          },
        });
      }
    }

    const allNoFilter = await this.programModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    query.push({
      $lookup: {
        from: 'systemconfigs',
        let: {
          location_type_id: '$created_by.account_location.location_detail.type',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  {
                    $convert: {
                      input: '$param_value',
                      to: 'objectId',
                      onNull: '',
                      onError: '',
                    },
                  },
                  '$$location_type_id',
                ],
              },
            },
          },
          {
            $project: {
              _id: false,
              param_value: false,
              __v: false,
            },
          },
        ],
        as: 'isHQ',
      },
    });

    query.push({
      $set: {
        isHQ: {
          $cond: {
            if: {
              $ne: [
                {
                  $arrayElemAt: ['$isHQ.param_key', 0],
                },
                'DEFAULT_LOCATION_HQ',
              ],
            },
            then: false,
            else: true,
          },
        },
      },
    });

    query.push({
      $lookup: {
        from: 'programnotifications',
        let: {
          program_id: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$program', '$$program_id'],
                  },
                ],
              },
            },
          },
          {
            $project: {
              via: {
                $map: {
                  input: '$via',
                  as: 'via_detail',
                  in: {
                    $toObjectId: '$$via_detail',
                  },
                },
              },
              notif_type: true,
              template: true,
              template_content: true,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: {
                via_id: '$via',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$via_id'],
                    },
                  },
                },
              ],
              as: 'via_detail',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              localField: 'receiver',
              foreignField: '_id',
              as: 'receiver_detail',
            },
          },
          {
            $lookup: {
              from: 'notificationtemplates',
              localField: 'notification',
              foreignField: '_id',
              as: 'notification_detail',
            },
          },
          {
            $project: {
              program: false,
              receiver: false,
            },
          },
        ],
        as: 'program_notification',
      },
    });

    query.push({
      $lookup: {
        from: 'programapprovallogs',
        let: {
          program_id: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$program', '$$program_id'],
                  },
                ],
              },
            },
          },
          {
            $sort: {
              created_at: 1,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: {
                status: '$status',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ['$_id', '$$status'],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    group_name: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: {
                account: '$processed_by',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ['$_id', '$$account'],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'processed_by',
            },
          },
          {
            $project: {
              program: false,
              __v: false,
            },
          },
        ],
        as: 'approval_log',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: {
          program_status: '$program_approval',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$program_status'],
                  },
                ],
              },
            },
          },
        ],
        as: 'status',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: {
          program_mechanism_id: '$program_mechanism',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$program_mechanism_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'program_mechanism_info',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: {
          program_owner_id: '$program_owner',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$program_owner_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'program_owner_info',
      },
    });

    query.push({
      $lookup: {
        from: 'locations',
        let: {
          program_owner_detail_id: '$program_owner_detail',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$program_owner_detail_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: {
              __v: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'program_owner_detail_info',
      },
    });

    query.push({
      $project: {
        'status.__v': false,
        'status.created_by': false,
        'status.created_at': false,
        'status.updated_at': false,
        'status.deleted_at': false,
        'status.group_name': false,
      },
    });

    query.push({
      $unwind: {
        path: '$status',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'accounts',
        let: {
          superior_hq_id: '$created_by.superior_hq',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$superior_hq_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'accountlocations',
              let: {
                account: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ['$account', '$$account'],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'locations',
                    let: {
                      location: '$location',
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              {
                                $eq: ['$_id', '$$location'],
                              },
                            ],
                          },
                        },
                      },
                      {
                        $project: {
                          _id: false,
                        },
                      },
                    ],
                    as: 'location_detail',
                  },
                },
                {
                  $unwind: {
                    path: '$location_detail',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    _id: false,
                    account: false,
                    __v: false,
                  },
                },
              ],
              as: 'account_location',
            },
          },
          {
            $unwind: {
              path: '$account_location',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              created_at: false,
              email: false,
              role: false,
              phone: false,
              job_title: false,
              job_level: false,
              deleted_at: false,
              type: false,
              updated_at: false,
              user_id: false,
              superior_hq: false,
              superior_local: false,
              __v: false,
            },
          },
        ],
        as: 'created_by.superior_hq',
      },
    });

    query.push({
      $unwind: {
        path: '$created_by.superior_hq',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'accounts',
        let: {
          superior_local_id: '$created_by.superior_local',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$superior_local_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'accountlocations',
              let: {
                account: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ['$account', '$$account'],
                        },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'locations',
                    let: {
                      location: '$location',
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              {
                                $eq: ['$_id', '$$location'],
                              },
                            ],
                          },
                        },
                      },
                      {
                        $project: {
                          _id: false,
                        },
                      },
                    ],
                    as: 'location_detail',
                  },
                },
                {
                  $unwind: {
                    path: '$location_detail',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    _id: false,
                    account: false,
                    __v: false,
                  },
                },
              ],
              as: 'account_location',
            },
          },
          {
            $unwind: {
              path: '$account_location',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              created_at: false,
              email: false,
              role: false,
              phone: false,
              job_title: false,
              job_level: false,
              deleted_at: false,
              type: false,
              updated_at: false,
              user_id: false,
              superior_hq: false,
              superior_local: false,
              __v: false,
            },
          },
        ],
        as: 'created_by.superior_local',
      },
    });

    query.push({
      $unwind: {
        path: '$created_by.superior_local',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $addFields: {
        start_period: {
          $switch: {
            branches: [
              {
                case: {
                  $eq: ['$program_time_zone', 'WIT'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$start_period', 32400000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+09:00',
                  ],
                },
              },
              {
                case: {
                  $eq: ['$program_time_zone', 'WITA'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$start_period', 28800000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+08:00',
                  ],
                },
              },
              {
                case: {
                  $eq: ['$program_time_zone', 'WIB'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$start_period', 25200000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
              {
                case: {
                  $eq: ['$program_time_zone', 'GENERAL'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$start_period', 25200000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
            ],
            default: '$start_period',
          },
        },
        end_period: {
          $switch: {
            branches: [
              {
                case: {
                  $eq: ['$program_time_zone', 'WIT'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$end_period', 32400000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+09:00',
                  ],
                },
              },
              {
                case: {
                  $eq: ['$program_time_zone', 'WITA'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$end_period', 28800000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+08:00',
                  ],
                },
              },
              {
                case: {
                  $eq: ['$program_time_zone', 'WIB'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$end_period', 25200000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
              {
                case: {
                  $eq: ['$program_time_zone', 'GENERAL'],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$end_period', 25200000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
            ],
            default: '$end_period',
          },
        },
      },
    });

    // query.push({ $group: { _id: '$_id', doc: { $first: '$$ROOT' } } });
    // query.push({
    //   $replaceRoot: {
    //     newRoot: { $mergeObjects: ['$doc'] },
    //   },
    // });

    const data = await this.programModel.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async getProgram(param: any, credential: any): Promise<any> {
    const search_param = param.search_param ? `${param.search_param}` : '';

    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set =
      param.sort && param.sort !== '' && param.sort !== '{}'
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id' && filter_set[a] !== ''
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const allowed_search = ['name', 'desc'];
    const query = [];
    if (search_param !== '') {
      const parseSearch = {
        $match: { $or: [] },
      };
      for (const a in allowed_search) {
        const identifier = {};
        if (identifier[allowed_search[a]] === undefined) {
          identifier[allowed_search[a]] = {
            $regex: new RegExp(`${search_param}`, 'i'),
          };
        }

        parseSearch.$match.$or.push(identifier);
      }
      query.push(parseSearch);
    }
    const location_type = new mongoose.Types.ObjectId(
      credential.account_location.location_detail.type,
    );
    const location_name = credential.account_location.location_detail;

    query.push({
      $lookup: {
        from: 'programapprovallogs',
        let: { program_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$program', '$$program_id'] }],
              },
            },
          },
          { $sort: { created_at: 1 } },
          {
            $lookup: {
              from: 'lovs',
              let: { status: '$status' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$status'] }],
                    },
                  },
                },
                {
                  $project: {
                    group_name: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { account: '$processed_by' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$account'] }],
                    },
                  },
                },
                {
                  $project: {
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'processed_by',
            },
          },
          {
            $project: {
              program: false,
              __v: false,
            },
          },
        ],
        as: 'approval_log',
      },
    });

    query.push({
      $lookup: {
        from: 'keywords',
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      {
                        $convert: {
                          input: '$eligibility.program_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                      '$$id',
                    ],
                  },
                  {
                    $eq: ['$keyword_edit', null],
                  },
                  {
                    $not: [
                      {
                        $regexMatch: {
                          input: '$eligibility.name',
                          regex: '-EDIT$',
                          options: 'i',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              __v: false,
            },
          },
        ],
        as: 'keyword-list',
      },
    });

    query.push({
      $lookup: {
        from: 'systemconfigs',
        let: {
          location_type_id: '$created_by.account_location.location_detail.type',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      {
                        $convert: {
                          input: '$param_value',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                      '$$location_type_id',
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: false,
              param_value: false,
              param_key: false,
              __v: false,
            },
          },
        ],
        as: 'isHQ',
      },
    });

    query.push({
      $set: {
        isHQ: {
          $cond: [
            {
              $eq: ['$isHQ', []],
            },
            false,
            true,
          ],
        },
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { program_status: '$program_approval' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$_id', '$$program_status'] }],
              },
            },
          },
        ],
        as: 'status',
      },
    });

    query.push({
      $lookup: {
        from: 'programnotifications',
        let: { program_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$program', '$$program_id'] }],
              },
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { via: '$via' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$via'] }],
                    },
                  },
                },
              ],
              as: 'via',
            },
          },
          {
            $unwind: '$via',
          },
          {
            $project: {
              'via.__v': false,
              'via.created_by': false,
              'via.group_name': false,
              'via.created_at': false,
              'via.updated_at': false,
              'via.deleted_at': false,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { notif_type: '$notif_type' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$notif_type'] }],
                    },
                  },
                },
              ],
              as: 'notif_type',
            },
          },
          {
            $unwind: '$notif_type',
          },
          {
            $project: {
              'notif_type.__v': false,
              'notif_type.created_by': false,
              'notif_type.group_name': false,
              'notif_type.created_at': false,
              'notif_type.updated_at': false,
              'notif_type.deleted_at': false,
            },
          },
          {
            $lookup: {
              from: 'notificationtemplates',
              let: { template: '$template' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$template'] }],
                    },
                  },
                },
              ],
              as: 'template',
            },
          },
          {
            $unwind: '$template',
          },
          {
            $project: {
              'template.__v': false,
              'template.created_by': false,
              'template.group_name': false,
              'template.created_at': false,
              'template.updated_at': false,
              'template.deleted_at': false,
            },
          },
        ],
        as: 'program_notification',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { point_type_id: '$point_type' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$point_type_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'point_type_info',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { program_mechanism_id: '$program_mechanism' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$program_mechanism_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'program_mechanism_info',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { program_owner_id: '$program_owner' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$program_owner_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'program_owner_info',
      },
    });

    query.push({
      $lookup: {
        from: 'locations',
        let: { program_owner_detail_id: '$program_owner_detail' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      '$_id',
                      {
                        $convert: {
                          input: '$$program_owner_detail_id',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: {
              __v: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'program_owner_detail_info',
      },
    });

    query.push({
      $unwind: '$status',
    });

    query.push({
      $project: {
        'status.__v': false,
        'status.created_by': false,
        'status.created_at': false,
        'status.updated_at': false,
        'status.deleted_at': false,
        'status.group_name': false,
      },
    });

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_hq_id: '$created_by.superior_hq' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        '$_id',
                        {
                          $convert: {
                            input: '$$superior_hq_id',
                            to: 'objectId',
                            onNull: '',
                            onError: '',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_hq',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_hq',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_local_id: '$created_by.superior_local' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        '$_id',
                        {
                          $convert: {
                            input: '$$superior_local_id',
                            to: 'objectId',
                            onNull: '',
                            onError: '',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_local',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_local',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push({
      $match: {
        $and: [{ program_edit: null }],
      },
    });

    if (location_name.name !== 'HQ') {
      query.push({
        $match: {
          $and: [
            {
              'created_by.account_location.location_detail.type': location_type,
            },
          ],
        },
      });
    }

    query.push({ $sort: sort_set });

    query.push({
      $match: filter_builder,
    });

    query.push({ $group: { _id: '$_id', doc: { $first: '$$ROOT' } } });
    query.push({
      $replaceRoot: {
        newRoot: { $mergeObjects: ['$doc'] },
      },
    });

    query.push({ $skip: skip });

    query.push({ $limit: limit });

    const data = await this.programModel.aggregate(query, (err, result) => {
      return result;
    });

    // const data = await this.programModel.find({
    //   $text: {
    //     $search: search_param,
    //   },
    // });

    return {
      data: data,
      total: data.length,
    };
  }

  async getProgramWithExcept(param: any): Promise<any> {
    const except = param.except;
    const filter_set = JSON.parse(param.filter);
    const sort_set = JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }
    filter_builder._id = { $ne: except };

    const data = this.programModel
      .find(filter_builder)
      .skip(skip)
      .limit(limit)
      .sort(sort_set)
      .exec()
      .then((results) => {
        if (results.length > 0) {
          return {
            total: results.length,
            data: results,
          };
        } else {
          return {
            total: 0,
            data: [],
          };
        }
      });

    return data;
  }

  async approveProgram(
    param: string,
    credential: any,
    reason = '',
    token = '',
  ): Promise<ProgramApprovalDTOResponse> {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: token,
    });

    const programID = new mongoose.Types.ObjectId(param);
    const response = new ProgramApprovalDTOResponse();
    response.transaction_classify = 'PROGRAM_APPROVAL';
    const managerRole = await this.appsService.getConfig(
      'DEFAULT_ROLE_MANAGER',
    );
    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    let isHQ = false;
    if (
      accountSet.account_location.location_detail.type.toString() == hqLocation
    ) {
      isHQ = true;
    }

    // const statusNew = await this.appsService.getConfig(
    //   'DEFAULT_STATUS_PROGRAM_ADD',
    // );

    const statusRejectNonHQ = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_REJECT_NON_HQ'),
    );

    const statusRejectHQ = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_REJECT_HQ'),
    );

    let statusSet;

    let updateData = {};
    let replaceData = {};
    if (accountSet.role.toString() == managerRole) {
      //Check jika program reject tidak ada kan bisa di approve
      const checkProgramRejected: any = await this.programModel.findOne({
        _id: programID,
      });

      if (
        checkProgramRejected.program_approval.toString() ==
          statusRejectHQ.toString() &&
        checkProgramRejected.need_review_after_edit === false
      ) {
        throw new BadRequestException([
          {
            isInvalidDataContent:
              'The program you entered is rejected, please edit the keyword first',
          },
        ]);
        // throw new Error(
        //   'The program you entered is rejected, please edit the keyword first',
        // );
      }

      if (
        checkProgramRejected.program_approval.toString() ==
          statusRejectNonHQ.toString() &&
        checkProgramRejected.need_review_after_edit === false
      ) {
        throw new BadRequestException([
          {
            isInvalidDataContent:
              'The program you entered is rejected, please edit the keyword first',
          },
        ]);
        // throw new Error(
        //   'The program you entered is rejected, please edit the keyword first',
        // );
      }

      if (isHQ) {
        statusSet = new Types.ObjectId(
          await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_APPROVE_HQ'),
        );
        updateData = {
          program_approval: statusSet,
          hq_approver: accountSet?._id,
          need_review_after_edit: false,
        };
      } else {
        statusSet = new Types.ObjectId(
          await this.appsService.getConfig(
            'DEFAULT_STATUS_PROGRAM_APPROVE_NON_HQ',
          ),
        );
        updateData = {
          program_approval: statusSet,
          non_hq_approver: accountSet?._id,
          need_review_after_edit: false,
        };
      }

      const checkEditProgram = await this.programModel.findOne({
        _id: programID,
      });

      if (checkEditProgram && checkEditProgram.name.endsWith('-EDIT')) {
        const newNameProgram = checkEditProgram.name.replace(/-EDIT$/, '');
        const timestampNow = Date.now();

        replaceData = {
          start_period: checkEditProgram?.start_period,
          end_period: checkEditProgram?.end_period,
          desc: checkEditProgram?.desc,
          program_mechanism: checkEditProgram?.program_mechanism,
          alarm_pic: checkEditProgram?.alarm_pic,
          alarm_pic_type: checkEditProgram?.alarm_pic_type,
          threshold_alarm_expired: checkEditProgram?.threshold_alarm_expired,
          threshold_alarm_voucher: checkEditProgram?.threshold_alarm_voucher,
          point_registration: checkEditProgram?.point_registration,
          keyword_registration: checkEditProgram?.keyword_registration,
          program_group: checkEditProgram?.program_group,
          whitelist_check: checkEditProgram?.whitelist_check,
          program_notification: checkEditProgram?.program_notification,
          created_by: checkEditProgram?.created_by,
        };

        const programNewReplace: any = await this.programModel
          .findOne({
            $and: [{ name: newNameProgram }],
          })
          .then(async (response) => {
            if (!isHQ || isHQ) {
              if (response) {
                response.set(replaceData);

                await this.programNotificationModel.deleteMany({
                  program: response?._id,
                });

                if (checkEditProgram.program_notification.length > 0) {
                  checkEditProgram.program_notification.map(
                    async (notificationData) => {
                      try {
                        const newNotification =
                          new this.programNotificationModel({
                            program: response?._id,
                            ...notificationData,
                          });

                        await newNotification
                          .save()
                          .then(async (returning) => {
                            return returning;
                          })
                          .catch((e) => {
                            throw new BadRequestException([
                              {
                                isInvalidDataContent: e?.message
                                  ? e?.message
                                  : 'Internal Server Error',
                              },
                            ]);
                            // throw new Error(e.message);
                          });
                      } catch (error) {
                        console.log('<-- Fail :: checkEditProgram-->');
                        console.log(error);
                        console.log('<-- Fail :: checkEditProgram-->');
                      }
                    },
                  );
                }

                statusSet = new Types.ObjectId(
                  await this.appsService.getConfig(
                    'DEFAULT_STATUS_PROGRAM_APPROVE_HQ',
                  ),
                );

                if (isHQ) {
                  updateData = {
                    name: `${checkEditProgram.name}-${timestampNow}`,
                    program_edit: response?._id,
                    program_approval: statusSet,
                    need_review_after_edit: false,
                    is_stoped: true,
                    hq_approver: accountSet?._id,
                  };
                } else {
                  updateData = {
                    name: `${checkEditProgram.name}-${timestampNow}`,
                    program_edit: response?._id,
                    program_approval: statusSet,
                    need_review_after_edit: false,
                    is_stoped: true,
                    non_hq_approver: accountSet?._id,
                  };
                }
                await response.save();

                await this.deleteRedisProg(response?._id.toString(), '_id');
                await this.deleteRedisProg(response?.name.toString(), 'name');
                await this.deleteRedisProg(
                  response?.keyword_registration.toString(),
                  'keyword_registration',
                );
              }
              return response;
            }
            return response;
            // else {
            //   statusSet = new Types.ObjectId(
            //     await this.appsService.getConfig(
            //       'DEFAULT_STATUS_PROGRAM_APPROVE_NON_HQ',
            //     ),
            //   );
            //   updateData = {
            //     name: `${checkEditProgram.name}`,
            //     program_edit: null,
            //     program_approval: statusSet,
            //     non_hq_approver: accountSet?._id,
            //     need_review_after_edit: false,
            //     is_stoped: true,
            //   };
            // }
          })
          .catch((error) => {
            throw new BadRequestException([
              {
                isInvalidDataContent: error?.message
                  ? error?.message
                  : 'Program failed to approve 1',
              },
            ]);
          });

        return await this.programModel
          .findOneAndUpdate(
            {
              $and: [{ _id: programID }],
            },
            updateData,
          )
          .then(async (respon) => {
            await new this.programApprovalLogModel({
              program: programID,
              processed_by: accountSet,
              status: statusSet,
              reason: reason,
            })
              .save()
              .catch((e: Error) => {
                throw new BadRequestException([
                  {
                    isInvalidDataContent: e?.message
                      ? e?.message
                      : 'Internal Server Error',
                  },
                ]);
                // throw new Error(e.message);
              });
            const superior_var = await this.findProgramById(
              programNewReplace?._id,
            );

            const credential_detail = await this.accountService.detail(
              accountSet?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              respon,
              response,
            );
            if (
              credential_detail.account_location.location_detail.name === 'HQ'
            ) {
              await this.sendProgramApprovalNotificatioApprovedHQ(
                respon,
                respon,
                accountSet,
                superior_var,
                reason,
                trace_id,
              );
            } else {
              await this.sendProgramApprovalNotificatioApprovedNonHQ(
                respon,
                respon,
                accountSet,
                superior_var,
                reason,
                trace_id,
              );
            }
            response.status = HttpStatus.OK;
            response.message = 'Program approved';
            response.payload = {
              keyword: programID,
              isHq: isHQ,
              status: statusSet,
            };
            return response;
          })
          .catch((e: Error) => {
            console.log('error', e);
            throw new BadRequestException([
              {
                isInvalidDataContent: e?.message
                  ? e?.message
                  : 'Program failed to approve 2',
              },
            ]);
          });
      } else {
        return await this.programModel
          .findOneAndUpdate(
            {
              $and: [{ _id: programID }],
            },
            updateData,
          )
          .then(async (respon) => {
            // if (e !== null) {
            //   await new this.programApprovalLogModel({
            //     program: programID,
            //     processed_by: credential,
            //     status: statusSet,
            //     reason: reason,
            //   })
            //     .save()
            //     .catch((e: Error) => {
            //       throw new Error(e.message);
            //     });
            //   response.status = HttpStatus.OK;
            //   response.message = 'Program approved';
            //   response.payload = {
            //     program: param,
            //     status: '',
            //   };
            //   return response;
            // } else {
            //   response.status = HttpStatus.FORBIDDEN;
            //   response.message = 'Program status is not allowed to update';
            //   response.payload = {
            //     program: programID,
            //     status: '',
            //   };
            //   throw new ForbiddenException(response);
            // }
            await new this.programApprovalLogModel({
              program: programID,
              processed_by: accountSet,
              status: statusSet,
              reason: reason,
            })
              .save()
              .catch((e: Error) => {
                throw new BadRequestException([
                  {
                    isInvalidDataContent: e?.message
                      ? e?.message
                      : 'Internal Server Error',
                  },
                ]);
                // throw new Error(e.message);
              });
            const superior_var = await this.findProgramById(param);
            const credential_detail = await this.accountService.detail(
              accountSet?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              respon,
              response,
            );
            if (
              credential_detail.account_location.location_detail.name === 'HQ'
            ) {
              await this.sendProgramApprovalNotificatioApprovedHQ(
                respon,
                respon,
                credential_detail,
                superior_var,
                reason,
                trace_id,
              );
            } else {
              await this.sendProgramApprovalNotificatioApprovedNonHQ(
                respon,
                respon,
                credential_detail,
                superior_var,
                reason,
                trace_id,
              );
            }
            if (isHQ) {
              await this.deleteRedisProg(respon._id.toString(), '_id');
              await this.deleteRedisProg(respon.name.toString(), 'name');
              await this.deleteRedisProg(
                respon.keyword_registration.toString(),
                'keyword_registration',
              );
            }
            response.status = HttpStatus.OK;
            response.message = 'Program approved';
            response.payload = {
              keyword: programID,
              isHq: isHQ,
              status: statusSet,
            };
            return response;
          })
          .catch((e: Error) => {
            // response.status = HttpStatus.BAD_REQUEST;
            // response.message = 'Program failed to approve';
            // response.payload = param;
            // throw new Error(e.message);
            throw new BadRequestException([
              { isInvalidDataContent: 'Program failed to approve' },
            ]);
          });
      }
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: 'Only manager can approve program' },
      ]);
      // response.status = HttpStatus.FORBIDDEN;
      // response.message = 'Only manager can approve program';
      // response.payload = param;
    }
    return response;
  }

  async rejectProgram(
    param: string,
    credential: any,
    reason = '',
  ): Promise<ProgramApprovalDTOResponse> {
    const programID = new mongoose.Types.ObjectId(param);
    const response = new ProgramApprovalDTOResponse();
    response.transaction_classify = 'PROGRAM_APPROVAL';
    const managerRole = await this.appsService.getConfig(
      'DEFAULT_ROLE_MANAGER',
    );

    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    let isHQ = false;
    if (credential.account_location.location_detail.type.equals(hqLocation)) {
      isHQ = true;
    }

    const statusNew = await this.appsService.getConfig(
      'DEFAULT_STATUS_PROGRAM_ADD',
    );

    //SystemConfig Lovs "Approved by Manager HQ" (Status Keyword Active)
    const statusActive = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_APPROVE_HQ'),
    );

    let statusSet;
    let updateData = {};
    if (credential.role.equals(managerRole)) {
      //Check jika program sudah berjalan tidak boleh di reject status
      const checkProgramActive: any = await this.programModel.findOne({
        _id: programID,
      });
      if (checkProgramActive.program_approval.equals(statusActive)) {
        throw new BadRequestException([
          {
            isInvalidDataContent:
              'The program you entered is already active, it cannot be rejected',
          },
        ]);
        // throw new Error(
        //   'The program you entered is already active, it cannot be rejected',
        // );
      } else {
        if (isHQ) {
          statusSet = new Types.ObjectId(
            await this.appsService.getConfig(
              'DEFAULT_STATUS_PROGRAM_REJECT_HQ',
            ),
          );
          updateData = {
            program_approval: statusSet,
            hq_approver: credential?._id,
            need_review_after_edit: false,
          };
        } else {
          statusSet = new Types.ObjectId(
            await this.appsService.getConfig(
              'DEFAULT_STATUS_PROGRAM_REJECT_NON_HQ',
            ),
          );
          updateData = {
            program_approval: statusSet,
            non_hq_approver: credential?._id,
            need_review_after_edit: false,
          };
        }

        return await this.programModel
          .findOneAndUpdate(
            {
              $and: [{ _id: programID }],
            },
            updateData,
          )
          .then(async (respon) => {
            // if (e !== null) {
            //   await new this.programApprovalLogModel({
            //     program: programID,
            //     processed_by: credential,
            //     status: statusSet,
            //     reason: reason,
            //   })
            //     .save()
            //     .catch((e: Error) => {
            //       throw new Error(e.message);
            //     });

            //   response.status = HttpStatus.OK;
            //   response.message = 'Program rejected';
            //   response.payload = {
            //     program: programID,
            //     status: '',
            //   };
            //   return response;
            // } else {
            //   response.status = HttpStatus.FORBIDDEN;
            //   response.message = 'Program status is not allowed to update';
            //   response.payload = {
            //     program: programID,
            //     status: '',
            //   };
            //   throw new ForbiddenException(response);
            // }

            await new this.programApprovalLogModel({
              program: programID,
              processed_by: credential,
              status: statusSet,
              reason: reason,
            })
              .save()
              .catch((e: Error) => {
                throw new BadRequestException([
                  {
                    isInvalidDataContent: e?.message
                      ? e?.message
                      : 'Internal Server Error',
                  },
                ]);
                // throw new Error(e.message);
              });
            const superior_var = await this.findProgramById(param);
            const credential_detail = await this.accountService.detail(
              credential?._id,
            );

            const trace_id = this.transactionOptional.getTracingId(
              respon,
              response,
            );
            // // Notification Program GUI Approval-Approved
            const getNotificationTemplate =
              await this.notificationService.getDetailbyName(
                NotificationTemplateConfig.APPROVAL_PROGRAM_REJECTED,
              );
            if (!getNotificationTemplate) {
              throw new BadRequestException([
                { isInvalidDataContent: 'Notification template not found' },
              ]);
              // throw new Error('Notification template not found');
            }
            const startPeriodString = moment(respon.start_period).format(
              'DD-MM-YY',
            );
            const endPeriodString = moment(respon.end_period).format(
              'DD-MM-YY',
            );
            const getProgramOwner = await this.lovService.getLovDetail(
              respon?.program_owner?.toString(),
            );
            const getProgramMechanism = await this.lovService.getLovDetail(
              respon?.program_mechanism?.toString(),
            );
            const subject = getNotificationTemplate.notif_content.substring(
              0,
              getNotificationTemplate.notif_content.indexOf('\n'),
            );
            const Content = getNotificationTemplate.notif_content.substring(
              getNotificationTemplate.notif_content.indexOf('\n') + 1,
            );
            const subjectWithValues = subject.replace(
              '[programName]',
              respon.name,
            );
            const ContentWithValues = Content.replace('[ApprovalNotes]', reason)
              .replace('[programCreator]', respon.created_by.first_name)
              .replace(
                '[programPeriod]',
                `${startPeriodString} s/d ${endPeriodString}`,
              )
              .replace('[programName]', respon.name)
              .replace('[programOwner]', getProgramOwner?.set_value)
              .replace('[programMechanism]', getProgramMechanism?.set_value);

            const payload = new NotificationFirebaseAddDto();
            (payload.tracing_id = trace_id?.replace('SLO', 'TRX')),
              (payload.tracing_master_id = trace_id?.replace('SLO', 'TRX'));
            (payload.title = subjectWithValues.replace('Subject: ', '')),
              (payload.content = ContentWithValues.replace(
                '\nBody Email/Content: \n',
                '',
              ));
            (payload.program_id = respon?._id?.toString()),
              (payload.is_read = false);
            if (isHQ) {
              payload.receiver_id = superior_var?.created_by?._id;
              payload.receiver_name = superior_var?.created_by?.first_name;
              payload.receiver_email = superior_var?.created_by?.email;
              payload.sender_id = credential_detail?._id;
              payload.sender_name = credential_detail?.first_name;
              payload.created_by = credential;
            } else {
              payload.receiver_id = superior_var?.created_by?.superior_hq?._id;
              payload.receiver_name =
                superior_var?.created_by?.superior_hq?.first_name;
              payload.receiver_email =
                superior_var?.created_by?.superior_hq?.email;
              payload.sender_id = credential_detail?._id;
              payload.sender_name = credential_detail?.first_name;
              payload.created_by = credential;
              // if (respon.non_hq_approver) {
              //   payload.program_id = respon._id.toString(),
              //   payload.is_read = false,
              // } else if (respon.hq_approver) {
              //   payload.program_id = respon.toString(),
              //   payload.is_read = false,
              //   payload.receiver_id = superior_var.created_by._id
              //   payload.receiver_name = superior_var.created_by.first_name
              //   payload.receiver_email = superior_var.created_by.email
              //   payload.sender_id = credential_detail._id
              //   payload.sender_name = credential_detail.first_name
              //   payload.created_by = credential
              // }
            }
            try {
              await this.notificationService.notificationfirebase(payload);
              const messageBuild = new NotificationGeneralMessageBuild();
              const message = await messageBuild.buildMessageFromProgram(
                payload,
              );
              await this.emitToGeneralNotification(message);
            } catch (e) {
              throw new Error(e.message);
            }
            response.status = HttpStatus.OK;
            response.message = 'Program rejected';
            response.payload = {
              keyword: programID,
              isHq: isHQ,
              status: statusSet,
            };
            return response;
          })
          .catch((e: Error) => {
            // response.status = HttpStatus.BAD_REQUEST;
            // response.message = 'Program failed to reject';
            // response.payload = programID;
            // throw new Error(e.message);
            throw new BadRequestException([
              {
                isInvalidDataContent: e?.message
                  ? e?.message
                  : 'Program failed to reject',
              },
            ]);
          });
      }
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: 'Only manager can reject program' },
      ]);
      // response.status = HttpStatus.FORBIDDEN;
      // response.message = 'Only manager can reject program';
      // response.payload = programID;
    }
    return response;
  }

  async checkUniqueProgramV2(params: string): Promise<GlobalResponse> {
    const checkProgramName =
      (await this.programModel.findOne({ name: params }).exec()) === null;
    const response = new GlobalResponse();
    response.transaction_classify = 'CHECK_UNIQUE_PROGRAM_NAME';
    if (checkProgramName) {
      response.message = 'YOU CAN USE THIS PROGRAM NAME';
      response.statusCode = HttpStatus.OK;
    } else {
      response.message = 'PROGRAM NAME IS ALREADY EXIST';
      response.statusCode = HttpStatus.OK;
    }
    return response;
  }

  async editisdraft(
    params: string,
    data: ProgramIsDraftEditDTO,
  ): Promise<ProgramIsDraftEditDTOResponse> {
    const process = this.programModel
      .findOneAndUpdate(
        { _id: params },
        {
          is_draft: data.is_draft,
          need_review_after_edit: false,
          updated_at: Date.now(),
        },
      )
      .then((result) => {
        return result;
      });

    const response = new ProgramIsDraftEditDTOResponse();
    if (process) {
      response.message = 'Program Is Draft Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = data;
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: 'Program Is Draft Failed to Updated' },
      ]);
      // response.message = 'Program Is Draft Failed to Updated';
      // response.status = 400;
      // response.payload = process;
    }
    return response;
  }

  async getProgramByName(name: string, forTelegram?: boolean): Promise<any> {
    const data = await this.programModel.aggregate(
      [
        {
          $lookup: {
            from: 'keywords',
            let: { id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          {
                            $convert: {
                              input: '$eligibility.program_id',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                          '$$id',
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                  __v: false,
                },
              },
            ],
            as: 'keyword-list',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { point_type_id: '$point_type' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          '$_id',
                          {
                            $convert: {
                              input: '$$point_type_id',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  name: '$set_value',
                },
              },
              {
                $project: {
                  __v: false,
                  set_value: false,
                  group_name: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'point_type_info',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { program_mechanism_id: '$program_mechanism' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          '$_id',
                          {
                            $convert: {
                              input: '$$program_mechanism_id',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  name: '$set_value',
                },
              },
              {
                $project: {
                  __v: false,
                  set_value: false,
                  group_name: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'program_mechanism_info',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { program_owner_id: '$program_owner' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          '$_id',
                          {
                            $convert: {
                              input: '$$program_owner_id',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  name: '$set_value',
                },
              },
              {
                $project: {
                  __v: false,
                  set_value: false,
                  group_name: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'program_owner_info',
          },
        },
        {
          $lookup: {
            from: 'locations',
            let: { program_owner_detail_id: '$program_owner_detail' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          '$_id',
                          {
                            $convert: {
                              input: '$$program_owner_detail_id',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  __v: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'program_owner_detail_info',
          },
        },
        {
          $lookup: {
            from: 'systemconfigs',
            let: {
              location_type_id:
                '$created_by.account_location.location_detail.type',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          {
                            $convert: {
                              input: '$param_value',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                          '$$location_type_id',
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: false,
                  param_value: false,
                  param_key: false,
                  __v: false,
                },
              },
            ],
            as: 'isHQ',
          },
        },
        {
          $set: {
            isHQ: {
              $cond: [
                {
                  $eq: ['$isHQ', []],
                },
                false,
                true,
              ],
            },
          },
        },
        {
          $match: {
            $and: [{ name: { $regex: name } }, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return forTelegram ? data : data[0];
  }

  async checkmsisdnExist(parameter: string, programId: string): Promise<any> {
    const data = await this.programTempListModel.aggregate(
      [
        {
          $match: {
            $and: [
              { msisdn: parameter },
              { program: programId },
              { deleted_at: null },
            ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    if (data.length > 0) {
      return {
        exist: true,
        type: data[0].type,
      };
    } else {
      return {
        exist: false,
        type: '',
      };
    }
  }

  async getProgramByID(id: any): Promise<any> {
    return await this.programModel.findById(id);
  }

  // async getProgramBy(params): Promise<any> {
  //   return await this.programModel.findOne(params);
  // }

  async getProgramByNewName(params): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.PROGRAM_KEY}-name-${params}`;
    const redisProgram: any = await this.cacheManager.get(key);
    let result = null;

    if (redisProgram) {
      console.log(
        `REDIS|Load program_name ${params} from Redis|${Date.now() - now}`,
      );

      result = redisProgram;
    } else {
      const data = await this.programModel.findOne({
        name: params,
      });

      console.log(
        `REDIS|Load program_name ${params} from Database|${Date.now() - now}`,
      );

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 24 * 60 * 60 });
        result = data;
      }
    }

    return result;
  }

  async getProgramByKeywordRegistration(params): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.PROGRAM_KEY}-keyreg-${params}`;
    const redisProgram: any = await this.cacheManager.get(key);
    let result = null;

    if (redisProgram) {
      console.log(
        `REDIS|Load program_keyreg ${params} from Redis|${Date.now() - now}`,
      );

      result = redisProgram;
    } else {
      const data = await this.programModel.findOne({
        keyword_registration: params,
      });

      console.log(
        `REDIS|Load program_keyreg ${params} from Database|${Date.now() - now}`,
      );

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 24 * 60 * 60 });
        result = data;
      }
    }

    return result;
  }

  async sendProgramApprovalNotificationHQ(
    programData,
    detail,
    createdBy,
    superiorVar,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_PROGRAM,
      );
    if (!getNotificationTemplate) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Notification template not found' },
      ]);
    }

    const startPeriodString = moment(programData?.start_period).format(
      'DD-MM-YY',
    );
    const endPeriodString = moment(programData?.end_period).format('DD-MM-YY');
    const getProgramOwner = await this.lovService.getLovDetail(
      programData?.program_owner?.toString(),
    );
    const getProgramMechanism = await this.lovService.getLovDetail(
      programData?.program_mechanism?.toString(),
    );
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate?.notif_content?.indexOf('\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate?.notif_content?.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[programName]',
      programData?.name,
    );
    const ContentWithValues = Content.replace(
      '[programCreator]',
      superiorVar?.created_by?.first_name,
    )
      .replace('[programPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[programName]', programData?.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programMechanism]', getProgramMechanism?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('Subject:', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: ',
        '',
      )),
      (payload.program_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?.superior_hq?._id);
    payload.receiver_name = superiorVar?.created_by?.superior_hq?.first_name;
    payload.receiver_email = superiorVar?.created_by?.superior_hq?.email;
    payload.sender_id = superiorVar?.created_by?._id;
    payload.sender_name = superiorVar?.created_by?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new BadRequestException([
        { isInvalidDataContent: e?.message ? e?.message : '' },
      ]);
    }
  }

  async sendProgramApprovalNotificationNonHQ(
    programData,
    detail,
    createdBy,
    superiorVar,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_PROGRAM,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }

    const startPeriodString = moment(programData?.start_period).format(
      'DD-MM-YY',
    );
    const endPeriodString = moment(programData?.end_period).format('DD-MM-YY');
    const getProgramOwner = await this.lovService.getLovDetail(
      programData?.program_owner?.toString(),
    );
    const getProgramMechanism = await this.lovService.getLovDetail(
      programData?.program_mechanism?.toString(),
    );
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate?.notif_content?.indexOf('\n'),
    );
    const Content = getNotificationTemplate?.notif_content.substring(
      getNotificationTemplate?.notif_content?.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[programName]',
      programData?.name,
    );
    const ContentWithValues = Content.replace(
      '[programCreator]',
      superiorVar?.created_by?.first_name,
    )
      .replace('[programPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[programName]', programData?.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programMechanism]', getProgramMechanism?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('\nSubject: ', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: ',
        '',
      )),
      (payload.program_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?.superior_local?._id);
    payload.receiver_name = superiorVar?.created_by?.superior_local?.first_name;
    payload.receiver_email = superiorVar?.created_by?.superior_local?.email;
    payload.sender_id = superiorVar?.created_by?._id;
    payload.sender_name = superiorVar?.created_by?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new BadRequestException([
        { isInvalidDataContent: e?.message ? e?.message : '' },
      ]);
    }
  }

  async sendProgramApprovalNotificatioApprovedHQ(
    programData,
    detail,
    createdBy,
    superiorVar,
    reason,
    trace_id,
  ) {
    // Notification Program GUI Approval-Approved
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_PROGRAM_APPROVED,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }
    const startPeriodString = moment(programData?.start_period).format(
      'DD-MM-YY',
    );
    const endPeriodString = moment(programData?.end_period).format('DD-MM-YY');
    const getProgramOwner = await this.lovService.getLovDetail(
      programData?.program_owner?.toString(),
    );
    const getProgramMechanism = await this.lovService.getLovDetail(
      programData?.program_mechanism?.toString(),
    );
    const subject = getNotificationTemplate?.notif_content.substring(
      0,
      getNotificationTemplate?.notif_content.indexOf('\n'),
    );
    const Content = getNotificationTemplate?.notif_content.substring(
      getNotificationTemplate?.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[programName]',
      programData.name,
    );
    const ContentWithValues = Content.replace('[ApprovalNotes]', reason)
      .replace('[programCreator]', programData?.created_by?.first_name)
      .replace('[programPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[programName]', programData?.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programMechanism]', getProgramMechanism?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id?.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id?.replace('SLO', 'TRX'));
    payload.title = subjectWithValues?.replace('Subject: ', '');
    payload.content = ContentWithValues?.replace(
      '\nBody Email/Content: \n',
      '',
    );
    (payload.program_id = detail?._id.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?._id);
    payload.receiver_name = superiorVar?.created_by?.first_name;
    payload.receiver_email = superiorVar?.created_by?.email;
    payload.sender_id = createdBy?._id;
    payload.sender_name = createdBy?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new BadRequestException([
        { isInvalidDataContent: e?.message ? e?.message : '' },
      ]);
    }
  }

  async sendProgramApprovalNotificatioApprovedNonHQ(
    programData,
    detail,
    createdBy,
    superiorVar,
    reason,
    trace_id,
  ) {
    // Notification Program GUI Approval-Approved
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_PROGRAM_APPROVED,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }
    const startPeriodString = moment(programData?.start_period).format(
      'DD-MM-YY',
    );
    const endPeriodString = moment(programData?.end_period).format('DD-MM-YY');
    const getProgramOwner = await this.lovService.getLovDetail(
      programData?.program_owner?.toString(),
    );
    const getProgramMechanism = await this.lovService.getLovDetail(
      programData?.program_mechanism?.toString(),
    );
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate?.notif_content.indexOf('\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate?.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[programName]',
      programData.name,
    );
    const ContentWithValues = Content.replace('[ApprovalNotes]', reason)
      .replace('[programCreator]', programData?.created_by?.first_name)
      .replace('[programPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[programName]', programData?.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programMechanism]', getProgramMechanism?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    payload.title = subjectWithValues.replace('Subject: ', '');
    payload.content = ContentWithValues.replace('\nBody Email/Content: \n', '');
    (payload.program_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?.superior_hq?._id);
    payload.receiver_name = superiorVar?.created_by?.superior_hq?.first_name;
    payload.receiver_email = superiorVar?.created_by?.superior_hq?.email;
    payload.sender_id = createdBy?._id;
    payload.sender_name = createdBy?.first_name;
    payload.created_by = createdBy;
    // if (detail.non_hq_approver) {
    // }
    // if (detail.hq_approver) {
    //   payload.program_id = detail._id.toString(),
    //     payload.is_read = false,
    //     payload.receiver_id = superiorVar.created_by._id
    //   payload.receiver_name = superiorVar.created_by.first_name
    //   payload.receiver_email = superiorVar.created_by.email
    //   payload.sender_id = createdBy._id
    //   payload.sender_name = createdBy.first_name
    //   payload.created_by = createdBy
    // }
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new BadRequestException([
        { isInvalidDataContent: e?.message ? e?.message : '' },
      ]);
    }
  }

  async emitToGeneralNotification(payload: NotificationNonTransactionDto) {
    const messageString = JSON.stringify(payload);
    await this.notificationGeneralClient.emit(
      'notification_general',
      messageString,
    );
  }

  async checkKeywordRestriction(
    start_period: any,
    end_period: any,
    programDetail: any,
    timezone: string,
  ): Promise<boolean> {
    const today = new Date(
      moment.utc().tz(timezone).format('YYYY-MM-DDTHH:mm:00.000Z'),
    );
    const programStart = new Date(start_period);
    const programEnd = new Date(end_period);
    const programExistStart = new Date(programDetail.start_period);
    const programExitEnd = new Date(programDetail.end_period);
    // Check if start_period and end_period are greater than or equal to today
    if (
      (programExistStart?.toString() !== programStart?.toString() &&
        programStart < today) ||
      (programExitEnd?.toString() !== programEnd?.toString() &&
        programEnd < today)
    ) {
      console.log('=== MASUK IF DISINI ===');
      // If start_period or end_period is in the past, return true indicating an error
      return true;
    }

    for (const keyword of programDetail['keyword-list']) {
      const keywordStart = new Date(
        moment(keyword.eligibility.start_period)
          .utc()
          .tz(timezone)
          .format('YYYY-MM-DDTHH:mm:00.000Z'),
      );
      const keywordEnd = new Date(
        moment(keyword.eligibility.end_period)
          .utc()
          .tz(timezone)
          .format('YYYY-MM-DDTHH:mm:00.000Z'),
      );
      if (programStart > keywordStart || programEnd < keywordEnd) {
        // If program start is earlier than the keyword eligibility start date or program end is later than the keyword eligibility end date, return true indicating an error
        return true;
      }
    }

    // If all checks pass, return false indicating no error
    return false;
  }

  async stopProgram(param: string): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    const id = new mongoose.Types.ObjectId(param);
    const program: any = await this.programModel.findById(id);

    if (!program) {
      response.statusCode = HttpStatus.NOT_FOUND;
      response.message = 'Program not found';
      return response;
    }

    const statusApprove = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_APPROVE_HQ'),
    );

    const statusApprovedKeyword = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
    );

    if (
      program.program_approval?.toString() === statusApprove?.toString() &&
      program.is_stoped === false
    ) {
      // Stop Program
      await this.programModel.findByIdAndUpdate(id, {
        is_stoped: true,
      });

      // Stop Keyword by status keyword aktif Connect Dengan Program
      await this.keywordModel.updateMany(
        {
          'eligibility.program_id': param,
          keyword_approval: statusApprovedKeyword,
        },
        { $set: { is_stoped: true } },
      );

      await this.deleteRedisProg(program._id.toString(), '_id');
      await this.deleteRedisProg(program.name.toString(), 'name');
      await this.deleteRedisProg(
        program.keyword_registration.toString(),
        'keyword_registration',
      );


      //CLEAR REDIS KEYWORD
      const find = await this.keywordModel.find({
        'eligibility.program_id': param,
      });
      if (find) {
        for (let i = 0; i < find.length; i++) {
          const name = find[i].eligibility.name;
          await this.deleteRedisKeyword(name, null);
        }
      }

      response.statusCode = HttpStatus.ACCEPTED;
      response.message = 'Program has been stopped';
    } else if (program.is_stoped === true) {
      // Resume Program
      await this.programModel.findByIdAndUpdate(id, {
        is_stoped: false,
      });

      // Resume Keyword Connect Dengan Program
      await this.keywordModel.updateMany(
        {
          'eligibility.program_id': param,
          is_stoped: true,
        },
        { $set: { is_stoped: false } },
      );

      await this.deleteRedisProg(program._id.toString(), '_id');
      await this.deleteRedisProg(program.name.toString(), 'name');
      await this.deleteRedisProg(
        program.keyword_registration.toString(),
        'keyword_registration',
      );

      //CLEAR REDIS KEYWORD
      const find = await this.keywordModel.find({
        'eligibility.program_id': param,
      });
      if (find) {
        for (let i = 0; i < find.length; i++) {
          const name = find[i].eligibility.name;
          await this.deleteRedisKeyword(name, null);
        }
      }
      response.statusCode = HttpStatus.ACCEPTED;
      response.message = 'Program has been resumed';
    } else {
      response.statusCode = HttpStatus.BAD_REQUEST;
      response.message = `Invalid program status : ${program.program_approval} and status is ${program.is_stoped}`;
    }

    return response;
  }

  private isNewDatesAndNew(
    newDate: Date,
    startDate: Date,
    endDate: Date,
    exitStartDate: any,
    existEndDate: any,
  ): boolean {
    let respose = true;
    if (
      (exitStartDate?.toString() !== startDate?.toString() &&
        startDate <= newDate) ||
      (existEndDate?.toString() !== endDate?.toString() && endDate < newDate)
    ) {
      return (respose = false);
    }
    return true;
  }

  private isProgramPeriodValid(
    programEdit: any,
    timeZone: string,
    programEditExist: any,
  ): boolean {
    const today = moment.utc().tz(timeZone).format('YYYY-MM-DDTHH:mm:00.000Z');
    console.log('=== TODAY UTC ===', today);
    const programEditStartDate = new Date(programEdit.start_period);
    const programEditEndDate = new Date(programEdit.end_period);
    const programExistStart = new Date(programEditExist.start_period);
    const programExitEnd = new Date(programEditExist.end_period);
    return this.isNewDatesAndNew(
      new Date(today),
      programEditStartDate,
      programEditEndDate,
      programExistStart,
      programExitEnd,
    );
  }

  private isExistDate(programExit: any, programEdit: any): boolean {
    let response = false;
    const programstartExit = new Date(programExit?.start_period)?.toString();
    const programendExit = new Date(programExit?.end_period)?.toString();
    const programstartEdit = new Date(programEdit?.start_period)?.toString();
    const programendEdit = new Date(programEdit?.end_period)?.toString();

    if (
      programstartExit !== programstartEdit ||
      programendExit !== programendEdit
    ) {
      response = true;
    }

    return response;
  }

  async getListIdLocation(locationModel, locationIdUser, locationTypeUser) {
    const listIdLocation = [locationIdUser];
    const listChild = await locationModel
      .findOne({ _id: locationIdUser, type: locationTypeUser })
      .exec();

    if (listChild) {
      // if (listChild?.area_id) {
      //   listIdLocation.push(listChild?.area_id);
      // }
      // if (listChild.region_id) {
      //   listIdLocation.push(listChild?.region_id);
      // }

      const getAreaToRegionAndBranch: any = await locationModel
        .find({ area: listChild?.name, data_source: 'Telkomsel' })
        .exec();
      // Mengekstrak _id Region bisa melihat program yg owner detail branch
      if (getAreaToRegionAndBranch && getAreaToRegionAndBranch.length > 0) {
        const areaToRegionAndBranchIds = getAreaToRegionAndBranch.map(
          (branch: any) => branch._id,
        );
        listIdLocation.push(...areaToRegionAndBranchIds);
      }

      const getRegionToBranch: any = await locationModel
        .find({ region: listChild?.name, data_source: 'Telkomsel' })
        .exec();
      // Mengekstrak _id Region bisa melihat program yg owner detail branch
      if (getRegionToBranch && getRegionToBranch.length > 0) {
        const regionToBranchIds = getRegionToBranch.map(
          (branch: any) => branch._id,
        );
        listIdLocation.push(...regionToBranchIds);
      }
    }
    return listIdLocation;
  }

  async checkKeywordRegistration(parameter: any) {
    return (await this.keywordModel.findOne(parameter).exec()) === null;
  }

  //Function Service LOWCR SPRINT-5 ChangeOwner/ChangeCreator Program
  async changeProgramOwner(
    data: ProgramChangeOwnerDTO,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    try {
      // Fetch user data
      const getUserData = await this.accountService.detail(data?.user_id);

      // Check if user data is found
      if (!getUserData) {
        throw new NotFoundException({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      // Convert program_id to ObjectId
      const ObjectIdProgram = new Types.ObjectId(data?.program_id);

      // Update the program owner
      const updateChangeOwnerProgram = await this.programModel.updateOne(
        { _id: ObjectIdProgram },
        {
          $set: {
            program_owner: new Types.ObjectId(data.program_owner),
            program_owner_detail: new Types.ObjectId(data.program_owner_detail),
            created_by: getUserData,
          },
        },
      );

      // Check if the program was not found for update
      if (updateChangeOwnerProgram.modifiedCount === 0) {
        throw new NotFoundException({
          message: 'Program not found for update',
          errorCode: 'PROGRAM_NOT_FOUND',
        });
      }

      // Return success message or additional data if needed
      response.message = 'Program owner changed successfully';
      response.statusCode = HttpStatus.OK;
      response.payload = updateChangeOwnerProgram;
      return response;
    } catch (error) {
      // Handle other errors or unexpected exceptions
      throw new InternalServerErrorException({
        message: 'Failed to change program owner',
        errorCode: 'CHANGE_OWNER_FAILED',
        errorDetails: error.message, // Optional: Include more details about the error
      });
    }
  }

  async deleteRedisProg(param: string, type: string) {
    console.log(`== DELETE REDIS TYPE ${type}-value-${param} ==`);

    if (type == 'name') {
      const key = `program-name-${param}`;
      console.log('=== PROG NAME ===', key);

      await this.appsService.redis_delete(null, { key });
    } else if (type == '_id') {
      const key = `program-${param}`;
      console.log('=== PROG _ID ===', key);

      await this.appsService.redis_delete(null, { key });
    } else if (type == 'keyword_registration') {
      const key = `program-keyreg-${param}`;
      console.log('=== KEY REG ===', key);

      await this.appsService.redis_delete(null, { key });
    } else {
      const key = `program-${param}`;
      console.log('=== PROGRAM ===', key);

      await this.appsService.redis_delete(null, { key });
    }
  }

  async deleteRedisKeyword(param: string, type: string): Promise<any> {
    console.log(`== DELETE REDIS TYPE ${type}-value-${param} ==`);

    await this.appsService.redis_delete(null, { key: `keywordv2-${param}` });
    await this.appsService.redis_delete(null, {
      key: `keywordv2-approved-${param}`,
    });
    await this.appsService.redis_delete(null, {
      key: `keywordv2-profile-${param}`,
    });
  }

  // async addProgramOld(
  //   programData: ProgramV2,
  //   created_by: any,
  //   token = '',
  // ): Promise<GlobalResponse> {
  //   const check = await this.checkUniqueProgram({ name: programData.name });
  //   const response = new GlobalResponse();
  //   response.transaction_classify = 'PROGRAM_ADD';
  //   if (check) {
  //     const checkKeywordRegistration = await this.checkKeywordRegistration({
  //       'eligibility.name': programData.keyword_registration,
  //     });

  //     const checkKeywordRegis = await this.checkUniqueProgram({
  //       keyword_registration: programData.keyword_registration,
  //     });
  //     console.log(checkKeywordRegis);
  //     if (checkKeywordRegistration) {
  //       if (checkKeywordRegis) {
  //         if (programData?.program_parent === null) {
  //           delete programData?.program_parent;
  //         }
  //         const newProgram = new this.programModel({
  //           ...programData,
  //           created_by: created_by,
  //           program_approval: new mongoose.Types.ObjectId(
  //             await this.appsService.getConfig('DEFAULT_STATUS_PROGRAM_ADD'),
  //           ),
  //         });

  //         return await newProgram
  //           .save()
  //           .then(async (respo) => {
  //             if (programData?.program_notification?.length > 0) {
  //               programData.program_notification.map(
  //                 async (notificationData) => {
  //                   if (notificationData.program === null) {
  //                     delete notificationData.program;
  //                   }

  //                   const newNotification = new this.programNotificationModel({
  //                     program: respo?._id,
  //                     ...notificationData,
  //                   });

  //                   await newNotification
  //                     .save()
  //                     .then(async (returning) => {
  //                       return returning;
  //                     })
  //                     .catch((e: Error) => {
  //                       throw new BadRequestException([
  //                         { isInvalidDataContent: e.message },
  //                       ]);
  //                     });
  //                 },
  //               );

  //               const superior_var = await this.findProgramById(respo?._id);
  //               const getAccountService: any =
  //                 await this.accountService.authenticateBusiness({
  //                   auth: token,
  //                 });
  //               const trace_id = this.transactionOptional.getTracingId(
  //                 programData,
  //                 response,
  //               );
  //               const isHQ =
  //                 getAccountService?.account_location?.location_detail?.name ===
  //                 'HQ';

  //               if (isHQ) {
  //                 await this.sendProgramApprovalNotificationHQ(
  //                   programData,
  //                   respo,
  //                   created_by,
  //                   superior_var,
  //                   trace_id,
  //                 );
  //               } else {
  //                 await this.sendProgramApprovalNotificationNonHQ(
  //                   programData,
  //                   respo,
  //                   created_by,
  //                   superior_var,
  //                   trace_id,
  //                 );
  //               }

  //               response.message = 'Program created successfully';
  //               response.statusCode = HttpStatus.OK;
  //               response.payload = respo;
  //               return response;
  //             }
  //           })
  //           .catch((e: Error) => {
  //             throw new BadRequestException([
  //               {
  //                 isInvalidDataContent: e?.message
  //                   ? e?.message
  //                   : 'Program failed to created',
  //               },
  //             ]);
  //           });
  //       } else {
  //         throw new BadRequestException([
  //           {
  //             isInvalidDataContent:
  //               'The registration keyword is already in use in another program',
  //           },
  //         ]);
  //       }
  //     } else {
  // throw new BadRequestException([
  //   {
  //     isInvalidDataContent:
  //       'The registration keyword cannot be the same as the redeem keyword',
  //   },
  //       ]);
  //     }
  //   } else {
  //     throw new BadRequestException([
  //       { isInvalidDataContent: 'Duplicate program names are not allowed' },
  //     ]);
  //   }
  // }
}
