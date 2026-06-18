import type { BlinklikeHTMLCollectionData } from "./BlinklikeHTMLCollectionData";

/**
 * Supported property indices view of a {@link BlinklikeHTMLCollectionData}.
 *
 * @see https://webidl.spec.whatwg.org/#dfn-supported-property-indices
 */
export class BlinklikeHTMLCollectionSupportedPropertyIndices {
  #data: BlinklikeHTMLCollectionData;

  constructor(data: BlinklikeHTMLCollectionData) {
    this.#data = data;
  }

  /** Iterates the valid indices of the collection. */
  [Symbol.iterator]() {
    return this.#data.indices();
  }

  /** True iff `index` is a valid in-range integer index for the collection. */
  has(index: number) {
    return this.#data.hasItem(index);
  }
}
