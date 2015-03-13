/**
 * An enum of all of the built-in types.
 * TODO: Add the other types (e.g. collections) as needed.
 */
export const enum Py_Type {
  // For numeric types: Narrower types < Wider types.
  INT, LONG, FLOAT, COMPLEX, OTHER, LIST, SLICE
}
