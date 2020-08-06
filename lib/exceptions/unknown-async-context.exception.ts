export class UnknownAsyncContextException extends Error {
  constructor(executionAsyncId: number) {
    super(
      `Async ID (${executionAsyncId}) is not registered within internal cache.`
    );

    Object.setPrototypeOf(this, UnknownAsyncContextException.prototype);
  }
}
