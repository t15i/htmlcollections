import type { CollectionRule } from "./CollectionRule";
import { IndexedItemsCache } from "./IndexedItemsCache";
import { NamedItemsCache } from "./NamedItemsCache";
import {
  CollectionCacheObserver,
  type CollectionCache,
} from "./CollectionCacheObserver";

/**
 * Backing store for an HTMLCollection.
 *
 * @remarks
 * A root plus a {@link CollectionRule}, and membership follows from those two
 * alone. Reads are served by a cursor that walks only as far as it was asked
 * to, with an item vector materialized over it the first time anything needs
 * the whole collection, and name buckets over that. Every read drains the
 * pending mutation records first, so no caller sees state older than the
 * mutation it just made.
 *
 * @see https://dom.spec.whatwg.org/#interface-htmlcollection
 */
export class BlinklikeHTMLCollectionData<
  E extends Element = Element,
> implements CollectionCache {
  protected root_: Element;

  protected itemsCache_: IndexedItemsCache<E>;
  protected namedCache_: NamedItemsCache<E>;

  protected observer_: CollectionCacheObserver;

  /**
   * @param root - The element to collect under. It is never a member itself.
   * @param rule - What membership means, and which attribute changes can
   * alter it.
   */
  constructor(root: Element, rule: CollectionRule) {
    this.root_ = root;
    this.itemsCache_ = new IndexedItemsCache<E>(root, rule);
    this.namedCache_ = new NamedItemsCache<E>(this.itemsCache_);

    this.observer_ = CollectionCacheObserver.observe(root, this, {
      attributes: rule.attributes,
    });
  }

  /** The element this collection is rooted at. */
  public get root(): Element {
    return this.root_;
  }

  /**
   * The number of elements in the collection.
   *
   * @remarks
   * O(n) on the first read after a structural change, O(1) after that. The
   * walk that counts also keeps every member it passes, which is what turns
   * indexed access into an array lookup from then on.
   */
  public get length(): number {
    this.drain_();
    return this.itemsCache_.count();
  }

  /**
   * The element at `index` in collection order, or `null` if out of range.
   *
   * @param index - A zero-based position in collection order.
   *
   * @returns The element at `index`, or `null` if `index` is not an in-range
   * integer.
   *
   * @remarks
   * O(1) once {@link BlinklikeHTMLCollectionData.length} has been read. Until
   * then it walks only as far as `index` and parks there, so a scan costs
   * O(1) per call and never materializes the vector.
   */
  public item(index: number): E | null {
    this.drain_();
    return this.itemsCache_.get(index);
  }

  /**
   * The first element with id `name`, falling back to the first element with
   * `name` attribute `name`, or `null` if none.
   *
   * @param name - An id or `name` attribute value.
   *
   * @returns The first element answering to `name`, or `null` if none does.
   *
   * @remarks
   * O(n) on the first named read after an invalidation, O(1) after that. An
   * `id` or `name` change drops the name buckets but keeps the members, so
   * the next named read re-buckets what is already in hand instead of walking
   * the tree.
   */
  public namedItem(name: string): E | null {
    this.drain_();
    return this.namedCache_.get(name);
  }

  /**
   * True iff `index` is a valid in-range integer index for the collection.
   *
   * @param index - A candidate index.
   *
   * @returns Whether the collection has an element at `index`.
   *
   * @remarks
   * Reads the length, so it materializes the vector: O(n) on the first read
   * after a structural change, O(1) after that.
   */
  public hasItem(index: number): boolean {
    this.drain_();
    return this.itemsCache_.has(index);
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
  public hasNamedItem(name: string): boolean {
    this.drain_();
    return this.namedCache_.has(name);
  }

  /**
   * True iff the collection has no elements.
   *
   * @remarks
   * Answered from the cursor alone: it stops at the first element rather than
   * counting them, and never materializes the vector.
   */
  public get isEmpty(): boolean {
    this.drain_();
    return this.itemsCache_.isEmpty();
  }

  /**
   * True iff the collection has exactly one element.
   *
   * @remarks
   * Answered from the cursor alone: it stops at the second element rather
   * than counting them, and never materializes the vector.
   */
  public get hasExactlyOneItem(): boolean {
    this.drain_();
    return this.itemsCache_.hasExactlyOne();
  }

  /**
   * The first element in collection order, or `null` if the collection is
   * empty.
   *
   * @remarks
   * O(1) once the vector is built; before that, a walk from the root to the
   * first element, which does not build it.
   */
  public get first(): E | null {
    this.drain_();
    return this.itemsCache_.get(0);
  }

  /**
   * The last element in collection order, or `null` if the collection is
   * empty.
   *
   * @remarks
   * O(n) on the first read after a structural change, O(1) after that. It
   * needs the count, so unlike {@link BlinklikeHTMLCollectionData.first} it
   * materializes the vector.
   */
  public get last(): E | null {
    this.drain_();
    const count = this.itemsCache_.count();
    return count === 0 ? null : this.itemsCache_.get(count - 1);
  }

  /**
   * True iff `element` is currently a member of the collection.
   *
   * @param element - Any element, member or not.
   *
   * @returns Whether `element` is currently in the collection.
   *
   * @remarks
   * O(1) once the position map is built, O(n) on the first call after a
   * structural change. Answered from that map rather than from the rule, so
   * an element that would match but sits outside the root is not a member.
   */
  public contains(element: Element): boolean {
    this.drain_();
    return this.itemsCache_.contains(element);
  }

  /**
   * The zero-based position of `element` in collection order, or `-1` if it
   * is not a member.
   *
   * @param element - Any element, member or not.
   *
   * @returns The position of `element` in collection order, or `-1`.
   *
   * @remarks
   * O(1) once the position map is built, O(n) on the first call after a
   * structural change. Positions come out of the same walk as the vector, so
   * `item(indexOf(el))` is `el` for every member.
   */
  public indexOf(element: Element): number {
    this.drain_();
    return this.itemsCache_.indexOf(element);
  }

  /**
   * Iterates the valid indices of the collection.
   *
   * @returns A generator over `0` through `length - 1`, in order.
   *
   * @remarks
   * Materializes the vector, then O(1) per step. The length is re-read on
   * every step, so an invalidation partway through is picked up instead of
   * being iterated over.
   */
  public *indices(): Generator<number, void, unknown> {
    this.drain_();
    yield* this.itemsCache_;
  }

  /**
   * Iterates the deduplicated keys currently in use as either an id or a
   * `name` attribute, in collection order.
   *
   * @returns A generator over the keys, each one yielded once.
   *
   * @remarks
   * O(n). Keys are read off the members themselves, id before `name` within
   * one element, so this materializes the vector but not the name buckets.
   */
  public *names(): Generator<string, void, unknown> {
    this.drain_();
    yield* this.namedCache_;
  }

  /**
   * Iterates the elements of the collection in order.
   *
   * @returns A generator over the elements, in collection order.
   *
   * @remarks
   * Materializes the vector, then O(1) per step. Iteration walks the vector
   * as it stood when it began, so elements added or removed partway through
   * are not reflected.
   */
  public *[Symbol.iterator](): Generator<E, void, unknown> {
    this.drain_();
    yield* this.itemsCache_.items();
  }

  /**
   * The element immediately after `element` in collection order, or `null` if
   * `element` is the last member or not a member.
   *
   * @param element - Any element, member or not.
   *
   * @returns The next element, or `null` if there is none.
   *
   * @remarks
   * O(1) once the position map is built, O(n) on the first call after a
   * structural change.
   */
  public next(element: Element): E | null {
    this.drain_();
    const index = this.itemsCache_.indexOf(element);
    if (index === -1) return null;
    return this.itemsCache_.get(index + 1);
  }

  /**
   * The element immediately before `element` in collection order, or `null`
   * if `element` is the first member or not a member.
   *
   * @param element - Any element, member or not.
   *
   * @returns The previous element, or `null` if there is none.
   *
   * @remarks
   * O(1) once the position map is built, O(n) on the first call after a
   * structural change.
   */
  public previous(element: Element): E | null {
    this.drain_();
    const index = this.itemsCache_.indexOf(element);
    if (index <= 0) return null;
    return this.itemsCache_.get(index - 1);
  }

  /**
   * Iterates the elements after `element` in collection order, from the one
   * immediately following `element` through the last member. Yields nothing if
   * `element` is the last member or not a member.
   *
   * @param element - Any element, member or not.
   *
   * @returns A generator over the elements after `element`.
   *
   * @remarks
   * Materializes the vector, then O(1) per step. The position of `element`
   * and the vector are both read when iteration begins, so what follows is
   * the collection as it stood then.
   */
  public *forward(element: Element): Generator<E, void, unknown> {
    this.drain_();
    const index = this.itemsCache_.indexOf(element);
    if (index === -1) return;

    const items = this.itemsCache_.items();
    for (let i = index + 1; i < items.length; i++) yield items[i]!;
  }

  /**
   * Iterates the elements before `element` in reverse collection order, from
   * the one immediately preceding `element` back through the first member.
   * Yields nothing if `element` is the first member or not a member.
   *
   * @param element - Any element, member or not.
   *
   * @returns A generator over the elements before `element`, in reverse.
   *
   * @remarks
   * Materializes the vector, then O(1) per step. The position of `element`
   * and the vector are both read when iteration begins, so what follows is
   * the collection as it stood then.
   */
  public *backward(element: Element): Generator<E, void, unknown> {
    this.drain_();
    const index = this.itemsCache_.indexOf(element);
    if (index === -1) return;

    const items = this.itemsCache_.items();
    for (let i = index - 1; i >= 0; i--) yield items[i]!;
  }

  /**
   * Drops every cache, so the next read rebuilds from the tree.
   *
   * @remarks
   * O(1). This is the escape hatch for membership no mutation record can
   * express: a rule reading an undeclared attribute, an internal flag, a
   * custom element class that has only just been defined.
   */
  public invalidate(): void {
    this.itemsCache_.invalidate();
    this.invalidateNames();
  }

  /**
   * Drops the named cache only.
   *
   * @remarks
   * O(1). The members survive, so the next named read re-buckets what is
   * already in hand instead of walking the tree. This is what an `id` or
   * `name` change costs.
   */
  public invalidateNames(): void {
    this.namedCache_.invalidate();
  }

  /** Applies any mutation records the observer has not yet delivered. */
  protected drain_(): void {
    this.observer_.drain();
  }
}
