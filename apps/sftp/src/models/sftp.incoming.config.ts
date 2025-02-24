/**
 * This for arrange of config for sftp server
 */
export class SftpIncomingConfig {

  // value only : "dir" or "file"
  read_type: string;

  // type of file
  file_type: string;

  // Filled only if read_type = "file"
  // file full path location for load
  file_path: string;

  // Filled only if read_type = "dir"
  // dir location for load multiple
  dir_path: string;

  // Column delimiter
  column_delimiter: string;

  // Column expected for get data
  expect_column: string;

  // Column for kafka topic
  topic: string;

  constructor(
    fileType: string,
    filePath: string,
    columnDelimiter: string,
    expectColumn: string,
    dirPath: string,
    topic: string,
  ) {
    this.file_type = fileType;
    this.file_path = filePath;
    this.column_delimiter = columnDelimiter;
    this.expect_column = expectColumn;
    this.dir_path = dirPath;
    this.topic = topic;
  }
}
