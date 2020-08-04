export class TracingNotInitializedException extends Error {
  constructor() {
    super(
      `Tracing was used in a code path that is not wrapped in AsyncContext#run. Please make sure that the appropriate middleware/interceptor for your environment is executed.`
    );

    Object.setPrototypeOf(this, TracingNotInitializedException.prototype);
  }
}
