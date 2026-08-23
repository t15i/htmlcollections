import type { BlinklikeHTMLCollectionData } from "./BlinklikeHTMLCollectionData";

/**
 * Supported property names view of a {@link BlinklikeHTMLCollectionData}.
 *
 * @see https://webidl.spec.whatwg.org/#dfn-supported-property-names
 */
export class BlinklikeHTMLCollectionSupportedPropertyNames<
  E extends Element = Element,
> {
  #data: BlinklikeHTMLCollectionData<E>;

  /** @param data - The backing store this view answers from. */
  constructor(data: BlinklikeHTMLCollectionData<E>) {
    this.#data = data;
  }

  /**
   * Iterates the deduplicated keys currently in use as either an id or a
   * `name` attribute, in collection order.
   *
   * @returns A generator over the keys, each one yielded once.
   *
   * @remarks
   * O(n). Keys are read off the members themselves, so this materializes the
   * item vector but not the name buckets. Both members of this view read
   * through the same store, so the keys yielded here are exactly the ones
   * {@link BlinklikeHTMLCollectionSupportedPropertyNames.has} accepts.
   */
  [Symbol.iterator]() {
    return this.#data.names();
  }

  /**
   * True iff any current member of the collection carries `name` as its id
   * or `name` attribute.
   *
   * @param name - The key to look for.
   *
   * @returns Whether any member answers to `name`.
   *
   * @remarks
   * O(n) on the first named read after an invalidation, O(1) after that.
   */
  has(name: string) {
    return this.#data.hasNamedItem(name);
  }
}
