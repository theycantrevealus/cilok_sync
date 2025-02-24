
/**
 * Custom config for sftp outgoing
 */
export class SftpRunServiceConfig {

  // name service for identify which service will call
  service: string;

  // parameter will passed to service call
  parameters: any;

  constructor(
    service: string,
    parameters: any,
  ) {
    this.service = service;
    this.parameters = parameters;
  }
}
