import type { ElementLinkedList } from "../ElementLinkedList";

/**
 * Lazy items vector with a single-position fallback for indexed access.
 *
 * @remarks
 * Two access paths chosen inline by {@link get}:
 *
 *   - When the items vector is built, {@link get} is an array index access.
 *     The vector is populated on the first {@link count} call after
 *     invalidation.
 *
 *   - Otherwise, {@link get} walks from whichever of the list head and the
 *     cached anchor is closer to the requested index, then updates the
 *     anchor. Sequential access amortizes to O(1) per call.
 *
 * Callers that only ever query {@link get} (without touching {@link count})
 * never pay the O(n) populate cost.
 *
 * {@link invalidate} drops both the vector and the anchor. Use it for
 * structural mutations; attribute-only mutations should not invalidate.
 */
export class IndexedItemsCache<T extends { element: Element }> {
  protected data_: ElementLinkedList<T>;

  protected current_: T | null = null;
  protected currentIndex_: number = -1;

  protected cache_: T[] | null = null;

  constructor(data: ElementLinkedList<T>) {
    this.data_ = data;
  }

  /**
   * Returns the number of items in the collection.
   *
   * @remarks
   * Amortized O(1). The first call after invalidation walks the full
   * collection (O(n)) and populates the items vector.
   */
  count(): number {
    if (!this.cache_) {
      this.populate_();
    }
    return this.cache_!.length;
  }

  /** True iff `index` is a valid in-range integer index for the collection. */
  has(index: number): boolean {
    return Number.isInteger(index) && 0 <= index && index < this.count();
  }

  /**
   * Returns the element at `index`, or `null` if `index` is out of range.
   *
   * @remarks
   * O(1) when the items vector is built. Otherwise O(distance) from the
   * nearer of the list head and the previous anchor; the anchor is updated
   * to the result.
   */
  get(index: number): Element | null {
    if (index < 0) {
      return null;
    }

    if (this.cache_) {
      if (index >= this.cache_.length) return null;
      return this.cache_[index]?.element ?? null;
    }

    const cached = this.current_;
    const distHead = index;
    const distCached =
      cached !== null ? Math.abs(index - this.currentIndex_) : Infinity;

    let item: T | null;
    let i: number;
    if (distCached <= distHead) {
      item = cached;
      i = this.currentIndex_;
    } else {
      item = this.data_.head;
      i = 0;
    }

    while (item !== null && i < index) {
      item = this.data_.nextOf(item.element);
      i++;
    }
    while (item !== null && i > index) {
      item = this.data_.previousOf(item.element);
      i--;
    }

    if (item === null) {
      return null;
    }

    this.current_ = item;
    this.currentIndex_ = i;

    return item.element;
  }

  /** Iterates the valid indices of the collection. */
  *[Symbol.iterator]() {
    for (let i = 0; i < this.count(); i++) yield i;
  }

  /** Drops the items vector and the anchor. */
  invalidate(): void {
    this.current_ = null;
    this.currentIndex_ = -1;
    this.cache_ = null;
  }

  protected populate_(): void {
    this.cache_ = [];
    for (const item of this.data_) this.cache_.push(item);
  }
}
