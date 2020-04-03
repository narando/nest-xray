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
   * Address of X-Ray Daemon.
   *
   * This value can only be set through the environment variable `AWS_XRAY_DAEMON_ADDRESS`.
   * This is only documented in the README in section "Known Bugs".
   */
  public daemonAddress?: string;
}
