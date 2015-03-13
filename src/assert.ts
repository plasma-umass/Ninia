/**
 * Dynamically assert that something is true.
 */
function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}
export = assert;
