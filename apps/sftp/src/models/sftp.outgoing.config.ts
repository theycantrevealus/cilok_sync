import {Prop} from "@nestjs/mongoose";
import {SchemaTypes} from "mongoose";

/**
 * Custom config for sftp outgoing
 */
export class SftpOutgoingConfig {

  // Dir file location for generated file before send, example: path/to/file.json
  generated_file: string;

  // File extension
  file_extension: string;

  // For use timestamp for file
  use_timestamp: boolean;

  // Customizes data for another service when use this cron
  additional_data: Object;

  // Server destination for sftp send
  server_destination: SftpServerDestinationConfig[];

  constructor(
    additionalData: object,
    generatedFile: string,
    fileExtension: string,
    serverDestination : SftpServerDestinationConfig[],
    useTimestamp: boolean = true,
  ) {
    this.additional_data = additionalData;
    this.generated_file = generatedFile;
    this.file_extension = fileExtension;
    this.server_destination = serverDestination
    this.use_timestamp = useTimestamp;
  }
}

/**
 * This for arrange of config for sftp server
 */
export class SftpServerDestinationConfig {
  // Label of receiver. Example: IDAM
  label: string;

  // Host of receiver
  host: string;

  // Port of ssh port
  port: number;

  // Username of user at receiver
  username: string;

  // SSH location for access service
  sshKey: string;

  // Directory and file at receiver save the received file
  fileAndPath: string;

  password: string;

  constructor(
    label: string,
    host: string,
    port: number,
    username: string,
    sshKey: string,
    fileAndPath: string,
    password: string = "",
  ) {
    this.label = label;
    this.host = host;
    this.port = port;
    this.username = username;
    this.sshKey = sshKey;
    this.fileAndPath = fileAndPath;
    this.password = password
  }
}
