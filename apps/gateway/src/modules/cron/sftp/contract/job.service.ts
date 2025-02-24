/**
 * Implement this interface at your service,
 * if you want to use SftpGeneralCronService
 * Check ExampleJobService for the example
 */
export interface JobService {
  runTheJobs(cronName: string): void;
}
