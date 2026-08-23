import type { BlinklikeHTMLCollectionData } from "./BlinklikeHTMLCollectionData";

/**
 * Supported property indices view of a {@link BlinklikeHTMLCollectionData}.
 *
 * @see https://webidl.spec.whatwg.org/#dfn-supported-property-indices
 */
export class BlinklikeHTMLCollectionSupportedPropertyIndices<
  E extends Element = Element,
> {
  #data: BlinklikeHTMLCollectionData<E>;

  /** @param data - The backing store this view answers from. */
  constructor(data: BlinklikeHTMLCollectionData<E>) {
    this.#data = data;
  }

  /**
   * Iterates the valid indices of the collection.
   *
   * @returns A generator over `0` through `length - 1`, in order.
   *
   * @remarks
   * Materializes the item vector, then O(1) per step. Both members of this
   * view read through the same store, so the indices yielded here are exactly
   * the ones {@link BlinklikeHTMLCollectionSupportedPropertyIndices.has}
   * accepts.
   */
  [Symbol.iterator]() {
    return this.#data.indices();
  }

  /**
   * True iff `index` is a valid in-range integer index for the collection.
   *
   * @param index - A candidate index.
   *
   * @returns Whether the collection has an element at `index`.
   *
   * @remarks
   * Reads the length, so it materializes the item vector: O(n) on the first
   * call after a structural change, O(1) after that.
   */
  has(index: number) {
    return this.#data.hasItem(index);
  }
}
