export class TracingConfig {
  /**
   * Name of the current service.
   */
  public serviceName?: string;

  /**
   * Default sampling rate (percentage).
   *
   * Can be overriden through X-Ray Console Sampling Rates.
   */
  public rate?: number;

  /**
   * Address of X-Ray Daemon
   */
  public daemonAddress?: string;
}
