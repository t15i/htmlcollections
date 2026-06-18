import { IndexedItemsCache } from "./IndexedItemsCache";
import { ElementLinkedList } from "../ElementLinkedList";
import { getNameAttribute, NamedItemsCache } from "./NamedItemsCache";

/**
 * Per-element data carried in the list: the element itself plus the id/name
 * snapshots consumed by {@link NamedItemsCache}.
 */
class ListItem {
  element: Element;
  id_: string;
  name_: string | null;

  constructor(element: Element) {
    this.element = element;
    this.id_ = element.id;
    this.name_ = getNameAttribute(element);
  }
}

/**
 * Backing store for an HTMLCollection.
 *
 * @remarks
 * Composes a {@link ElementLinkedList} of items in collection order with an
 * {@link IndexedItemsCache} for `item(i)` and a {@link NamedItemsCache} for
 * `namedItem(name)`. The list owns the `Element -> item` inverse lookup; the
 * caches share the list reference so they never need a head argument.
 *
 * Membership is push-driven by the caller through {@link insertAfter} and
 * {@link remove}. Attribute changes flow through the named cache's observer.
 *
 * Every element passed to {@link insertAfter} must be a descendant of the
 * `root` the collection was constructed with. Otherwise its id/name
 * mutations will not reach the named cache's observer.
 *
 * @see https://dom.spec.whatwg.org/#interface-htmlcollection
 */
export class BlinklikeHTMLCollectionData {
  protected data_: ElementLinkedList<ListItem> = new ElementLinkedList();

  protected itemsCache_: IndexedItemsCache<ListItem>;
  protected namedCache_: NamedItemsCache<ListItem>;

  constructor(root: Element) {
    this.itemsCache_ = new IndexedItemsCache(this.data_);
    this.namedCache_ = new NamedItemsCache(root, this.data_);
  }

  /**
   * The number of elements in the collection.
   *
   * @remarks
   * Amortized O(1). The first call after a structural mutation walks the
   * list (O(n)) to populate the items vector.
   */
  public get length(): number {
    return this.itemsCache_.count();
  }

  /** The element at `index` in collection order, or `null` if out of range. */
  public item(index: number): Element | null {
    return this.itemsCache_.get(index);
  }

  /**
   * The first element with id `name`, falling back to the first element with
   * `name` attribute `name`, or `null` if none.
   */
  public namedItem(name: string): Element | null {
    return this.namedCache_.get(name);
  }

  /** True iff `index` is a valid in-range integer index for the collection. */
  public hasItem(index: number): boolean {
    return this.itemsCache_.has(index);
  }

  /**
   * True iff any current member of the collection carries `name` as its id
   * or `name` attribute.
   */
  public hasNamedItem(name: string): boolean {
    return this.namedCache_.has(name);
  }

  /** True iff `element` is currently a member of the collection. */
  public contains(element: Element): boolean {
    return this.data_.has(element);
  }

  /**
   * The zero-based position of `element` in collection order, or `-1` if it
   * is not a member.
   */
  public indexOf(element: Element): number {
    return this.data_.indexOf(element);
  }

  /** Iterates the valid indices of the collection. */
  public indices() {
    return this.itemsCache_[Symbol.iterator]();
  }

  /**
   * Iterates the deduplicated keys currently in use as either an id or a
   * `name` attribute, in collection order.
   */
  public names() {
    return this.namedCache_[Symbol.iterator]();
  }

  /** Iterates the elements of the collection in order. */
  public *[Symbol.iterator](): ArrayIterator<Element> {
    for (const item of this.data_) yield item.element;
  }

  /**
   * Inserts `element` immediately after `ref` in collection order.
   *
   * @param element - The element to insert.
   * @param ref - The reference element, or `null` to prepend.
   *
   * @returns `false` if `element` is already a member or if `ref` is a
   * non-`null` non-member; `true` otherwise.
   */
  public insertAfter(element: Element, ref: Element | null): boolean {
    if (this.data_.has(element)) return false;
    if (ref !== null && !this.data_.has(ref)) return false;

    const item = new ListItem(element);
    this.data_.insertAfter(item, ref);
    this.namedCache_.notifyAdded(item);

    this.invalidate_();
    return true;
  }

  /**
   * Removes `element` from the collection.
   *
   * @returns `false` if `element` was not a member; `true` otherwise. O(1).
   */
  public remove(element: Element): boolean {
    const removed = this.data_.remove(element);
    if (removed === undefined) return false;

    this.namedCache_.notifyRemoved(removed);

    this.invalidate_();
    return true;
  }

  /** Invalidates both caches. Used after structural mutations. */
  protected invalidate_(): void {
    this.itemsCache_.invalidate();
    this.namedCache_.invalidate();
  }
}
