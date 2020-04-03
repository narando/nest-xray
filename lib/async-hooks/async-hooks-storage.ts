export class AsyncHooksStorage {
  constructor(private readonly asyncStorage = new Map<number, unknown>()) {
    this.initialize();
  }

  public get<T = any>(triggerId: number): T {
    return this.asyncStorage.get(triggerId) as T;
  }

  public has(triggerId: number): boolean {
    return this.asyncStorage.has(triggerId);
  }

  public inherit(asyncId: number, triggerId: number) {
    const value = this.asyncStorage.get(triggerId);
    this.asyncStorage.set(asyncId, value);
  }

  public delete(asyncId: number) {
    this.asyncStorage.delete(asyncId);
  }

  public getInternalStorage(): Map<number, unknown> {
    return this.asyncStorage;
  }

  private initialize() {
    const initialAsyncId = 1;
    this.asyncStorage.set(initialAsyncId, new Map());
  }
}
