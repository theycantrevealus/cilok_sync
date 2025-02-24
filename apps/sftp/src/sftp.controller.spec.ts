import { Test, TestingModule } from '@nestjs/testing';
import {SftpController} from "./sftp.controller";
import {SftpService} from "./sftp.service";


describe('KafkaController', () => {
  let kafkaController: SftpController;
  let sftpService: SftpService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SftpController],
      providers: [SftpService],
    }).compile();

    kafkaController = app.get<SftpController>(SftpController);
    sftpService = app.get<SftpService>(SftpService);
  });

  it('Test sftp extracted file', () => {
    sftpService.testExtractFile();

    return true;
  });
});
