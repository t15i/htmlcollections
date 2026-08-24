import { CollectionIndexCache } from "./CollectionIndexCache";

/**
 * The members of a collection in tree order, with their positions.
 *
 * @remarks
 * A vector and a position map laid over {@link CollectionIndexCache}, built
 * by one walk and dropped whole. Reads that want a single member still go
 * through the cursor and cost nothing extra; anything that wants the count, a
 * position or every member materializes the vector once and is O(1) after
 * that. Vector, position map and count are always built together, so a live
 * vector means a trustworthy count.
 */
export class IndexedItemsCache<
  E extends Element = Element,
> extends CollectionIndexCache<E> {
  protected items_: E[] | null = null;
  protected indices_: Map<Element, number> | null = null;

  /**
   * The members in tree order. Materializes the vector if it is not built.
   *
   * @returns The members, in tree order. Not to be modified by the caller.
   *
   * @remarks
   * O(n) on the first call after an invalidation, O(1) after that. The vector
   * is the cache's own and is replaced rather than patched, so a reference
   * kept across an invalidation is a snapshot, not a stale view that will
   * repair itself.
   */
  items(): readonly E[] {
    if (this.items_ === null) this.populate_();
    return this.items_!;
  }

  /**
   * The number of members.
   *
   * @returns How many elements the rule matches under the root.
   *
   * @remarks
   * O(n) on the first call after an invalidation, O(1) after that. Unlike the
   * cursor-only count, the walk keeps every member it passes, which is what
   * turns later indexed access into an array lookup.
   */
  override count(): number {
    if (this.countValid_) return this.count_;
    this.populate_();
    return this.count_;
  }

  /**
   * True iff `index` is a valid in-range integer index for the collection.
   *
   * @param index - A candidate index.
   *
   * @returns Whether the collection has a member at `index`.
   *
   * @remarks
   * Answered from {@link IndexedItemsCache.count}, so it materializes the
   * vector: O(n) on the first call after an invalidation, O(1) after that.
   */
  has(index: number): boolean {
    return Number.isInteger(index) && 0 <= index && index < this.count();
  }

  /**
   * The member at `index`, or `null` if out of range.
   *
   * @param index - A zero-based position in tree order.
   *
   * @returns The member at `index`, or `null` if `index` is not an in-range
   * integer.
   *
   * @remarks
   * O(1) once the vector is built. Until then it is the cursor walk of
   * {@link CollectionIndexCache.get}, so a caller that only ever asks for
   * single members never pays for the vector.
   */
  override get(index: number): E | null {
    if (this.items_ === null) return super.get(index);
    if (!Number.isInteger(index) || index < 0 || index >= this.count_) {
      return null;
    }
    return this.items_[index]!;
  }

  /**
   * The position of `element`, or `-1` if it is not a member.
   *
   * @param element - Any element, member or not.
   *
   * @returns The zero-based position of `element` in tree order, or `-1`.
   *
   * @remarks
   * Materializes the vector: O(n) on the first call after an invalidation,
   * O(1) after that. Positions come out of the same walk as the vector, so
   * `get(indexOf(el))` is `el` for every member.
   */
  indexOf(element: Element): number {
    if (this.indices_ === null) this.populate_();
    return this.indices_!.get(element) ?? -1;
  }

  /**
   * True iff `element` is a member.
   *
   * @param element - Any element, member or not.
   *
   * @returns Whether `element` is currently in the collection.
   *
   * @remarks
   * Materializes the vector: O(n) on the first call after an invalidation,
   * O(1) after that. Answered from the position map rather than from the
   * rule, so an element that would match but sits outside the root is not a
   * member.
   */
  contains(element: Element): boolean {
    if (this.indices_ === null) this.populate_();
    return this.indices_!.has(element);
  }

  /**
   * Iterates the valid indices of the collection.
   *
   * @returns A generator over `0` through `count() - 1`, in order.
   *
   * @remarks
   * Materializes the vector, then O(1) per step. The count is re-read on
   * every step, so an invalidation partway through is picked up instead of
   * being iterated over.
   */
  *[Symbol.iterator](): Generator<number, void, unknown> {
    for (let i = 0; i < this.count(); i++) yield i;
  }

  /**
   * Drops the vector and the position map along with the anchor.
   *
   * @remarks
   * O(1). The next read rebuilds from the tree.
   */
  override invalidate(): void {
    super.invalidate();
    this.items_ = null;
    this.indices_ = null;
  }

  /**
   * Walks the whole collection once, keeping every member, and leaves the
   * anchor on the last one.
   */
  protected populate_(): void {
    const items: E[] = [];
    const indices = new Map<Element, number>();

    for (let node = this.first_(); node !== null; node = this.next_(node)) {
      indices.set(node, items.length);
      items.push(node);
    }

    this.currentIndex_ = items.length === 0 ? 0 : items.length - 1;
    this.items_ = items;
    this.indices_ = indices;
    this.setCount_(items.length);
  }
}
