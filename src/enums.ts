/**
 * An enum of all of the built-in types.
 * TODO: Add the other types (e.g. collections) as needed.
 */
export const enum Py_Type {
  // For numeric types: Narrower types < Wider types.
  INT, LONG, FLOAT, COMPLEX, OTHER, LIST, SLICE
}

/**
 * A thread can be in one of these states at any given point in time.
 *
 */
export enum ThreadStatus {
  // A thread that has not yet started is in this state.
  NEW,
  // A thread that is actively running. Only one thread can be running at once.
  RUNNING,
  // A thread that is not actively running, but is ready to run.
  RUNNABLE,
  // A thread that is waiting for an asynchronous browser operation to complete.
  ASYNC_WAITING,
  // A thread that has exited is in this state.
  TERMINATED
}