import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as asyncHooks from "async_hooks";
import { UnknownAsyncContextException } from "../exceptions";
import { AsyncHooksHelper } from "./async-hooks-helper";
import { AsyncHooksStorage } from "./async-hooks-storage";

export class AsyncContext implements OnModuleInit, OnModuleDestroy {
  public static getInstance(): AsyncContext {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance;
  }

  private static instance: AsyncContext;

  private static initialize() {
    const asyncHooksStorage = new AsyncHooksStorage();
    const asyncHook = AsyncHooksHelper.createHooks(asyncHooksStorage);
    const storage = asyncHooksStorage.getInternalStorage();

    this.instance = new AsyncContext(storage, asyncHook);
  }

  private constructor(
    private readonly internalStorage: Map<number, any>,
    private readonly asyncHookRef: asyncHooks.AsyncHook
  ) {}

  public onModuleInit() {
    this.asyncHookRef.enable();
  }

  public onModuleDestroy() {
    this.asyncHookRef.disable();
  }

  public set<TKey = any, TValue = any>(key: TKey, value: TValue) {
    const store = this.getAsyncStorage();
    store.set(key, value);
  }

  public get<TKey = any, TReturnValue = any>(key: TKey): TReturnValue {
    const store = this.getAsyncStorage();
    return store.get(key) as TReturnValue;
  }

  public run(fn: Function) {
    const eid = asyncHooks.executionAsyncId();
    this.internalStorage.set(eid, new Map());
    fn();
  }

  private getAsyncStorage(): Map<unknown, unknown> {
    const eid = asyncHooks.executionAsyncId();
    const state = this.internalStorage.get(eid);
    if (!state) {
      throw new UnknownAsyncContextException(eid);
    }
    return state;
  }
}
