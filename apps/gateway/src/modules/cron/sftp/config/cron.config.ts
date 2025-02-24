
/**
 * This for arrange of config for sftp server
 */
export class CronSftpServerConfig {
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

  constructor(
    label: string,
    host: string,
    port: number,
    username: string,
    sshKey: string,
    fileAndPath: string,
  ) {
    this.label = label;
    this.host = host;
    this.port = port;
    this.username = username;
    this.sshKey = sshKey;
    this.fileAndPath = fileAndPath;
  }
}

/**
 * This for create setup when used for cronjob
 */
export class CronConfig {
  // Name for cronjob
  cronName: string;

  // Description for cronjob
  cronDesc: string;

  // Default status
  isRunning: boolean;

  // Interval for cronjob running schedule
  interval: string;

  // Customizes data for another service when use this cron
  additionalData: Object;

  // Dir file location for generated file before send, example: path/to/file.json
  generatedFile: string;

  // File extension
  fileExtension: string;
}

