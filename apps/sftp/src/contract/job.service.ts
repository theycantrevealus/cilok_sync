
/**
 * Implement this interface at your service,
 * if you want to use SftpService
 * Check ExampleJobService for the example
 */
interface JobService {
  runTheJobs(cronName: string, type: string): void
}
