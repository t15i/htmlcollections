import { HTMLNamespace } from "@t15i/webspecs/infra";
import type { ElementLinkedList } from "../ElementLinkedList";

/**
 * Reads the `name` attribute of `element` if it is in the HTML namespace,
 * otherwise returns `null`.
 */
export function getNameAttribute(element: Element): string | null {
  return element.namespaceURI === HTMLNamespace
    ? element.getAttribute("name")
    : null;
}

const OBSERVE_OPTIONS: MutationObserverInit = {
  attributes: true,
  attributeFilter: ["id", "name"],
  subtree: true,
};

/**
 * Structural constraint for items consumable by {@link NamedItemsCache}: an
 * element wrapper that carries the current id/name snapshots.
 */
export interface NamedItem {
  element: Element;
  id_: string;
  name_: string | null;
}

/**
 * Lazy name-and-id lookup cache backed by per-item snapshots and a
 * `MutationObserver`.
 *
 * @remarks
 * Each instance owns one `MutationObserver` rooted at the `root` element with
 * `subtree: true`, watching `id` and `name` attribute changes. Read paths
 * synchronously drain pending records before answering, so callers never see
 * stale state.
 *
 * {@link invalidate} drops the bucket maps but keeps the live counters; it is
 * called internally after each attribute swap.
 *
 * Every item passed to {@link notifyAdded} must be a descendant of the `root`
 * the cache was constructed with; otherwise its id/name mutations will not
 * reach the observer and named lookups for it will drift out of sync.
 */
export class NamedItemsCache<T extends NamedItem> {
  protected data_: ElementLinkedList<T>;

  protected idCache_: Map<string, Element[]> | null = null;
  protected nameCache_: Map<string, Element[]> | null = null;

  protected liveIds_: Map<string, number> = new Map();
  protected liveNames_: Map<string, number> = new Map();

  protected observer_: MutationObserver;

  constructor(root: Element, data: ElementLinkedList<T>) {
    this.data_ = data;
    this.observer_ = new MutationObserver((records) => this.dispatch_(records));
    this.observer_.observe(root, OBSERVE_OPTIONS);
  }

  /**
   * True iff any current member of the collection carries `name` as its id
   * or `name` attribute. O(1).
   */
  has(name: string): boolean {
    this.drain_();
    return this.liveIds_.has(name) || this.liveNames_.has(name);
  }

  /**
   * Returns the first element with id `name`, falling back to the first
   * element with `name` attribute `name`, or `null` if no current member
   * matches.
   *
   * @remarks
   * Triggers a bucket build (O(n)) on the first call after invalidation;
   * subsequent calls are O(1).
   */
  get(name: string): Element | null {
    if (!this.has(name)) return null;

    if (this.idCache_ === null) this.populate_();

    const byId = this.idCache_!.get(name);
    if (byId) return byId[0]!;

    const byName = this.nameCache_!.get(name);
    if (byName) return byName[0]!;

    return null;
  }

  /**
   * Iterates the deduplicated keys currently in use as either an id or a
   * `name` attribute, in collection order.
   */
  *[Symbol.iterator]() {
    this.drain_();
    const seen = new Set<string>();
    for (const item of this.data_) {
      if (item.id_ && !seen.has(item.id_)) {
        seen.add(item.id_);
        yield item.id_;
      }
      if (item.name_ && !seen.has(item.name_)) {
        seen.add(item.name_);
        yield item.name_;
      }
    }
  }

  /** Records that `item` joined the collection. */
  notifyAdded(item: T): void {
    if (item.id_) this.increment_(this.liveIds_, item.id_);
    if (item.name_) this.increment_(this.liveNames_, item.name_);
  }

  /** Records that `item` is about to leave the collection. */
  notifyRemoved(item: T): void {
    if (item.id_) this.decrement_(this.liveIds_, item.id_);
    if (item.name_) this.decrement_(this.liveNames_, item.name_);
  }

  /** Drops the bucket maps; keeps the live counters. */
  invalidate(): void {
    this.idCache_ = null;
    this.nameCache_ = null;
  }

  /**
   * Synchronously consumes any records the observer has not yet delivered
   * and applies them.
   */
  protected drain_(): void {
    const records = this.observer_.takeRecords();
    if (records.length === 0) return;
    this.dispatch_(records);
  }

  protected dispatch_(records: MutationRecord[]): void {
    for (const record of records) {
      this.applyChange_(record.target as Element, record.attributeName!);
    }
  }

  /**
   * Applies one observed id/name change: updates the per-item snapshot,
   * adjusts the live counters, and invalidates the bucket maps.
   */
  protected applyChange_(element: Element, attributeName: string): void {
    const item = this.data_.get(element);
    if (item === undefined) return;

    if (attributeName === "id") {
      const nextId = element.id;
      if (item.id_ === nextId) return;
      if (item.id_) this.decrement_(this.liveIds_, item.id_);
      item.id_ = nextId;
      if (nextId) this.increment_(this.liveIds_, nextId);
      this.invalidate();
    } else {
      const nextName = getNameAttribute(element);
      if (item.name_ === nextName) return;
      if (item.name_) this.decrement_(this.liveNames_, item.name_);
      item.name_ = nextName;
      if (nextName) this.increment_(this.liveNames_, nextName);
      this.invalidate();
    }
  }

  protected populate_(): void {
    const idCache = new Map<string, Element[]>();
    const nameCache = new Map<string, Element[]>();

    for (const item of this.data_) {
      if (item.id_) {
        const bucket = idCache.get(item.id_);
        if (bucket) bucket.push(item.element);
        else idCache.set(item.id_, [item.element]);
      }
      if (item.name_) {
        const bucket = nameCache.get(item.name_);
        if (bucket) bucket.push(item.element);
        else nameCache.set(item.name_, [item.element]);
      }
    }

    this.idCache_ = idCache;
    this.nameCache_ = nameCache;
  }

  protected increment_(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  protected decrement_(map: Map<string, number>, key: string): void {
    const count = map.get(key);
    if (count === undefined) return;
    if (count <= 1) map.delete(key);
    else map.set(key, count - 1);
  }
}
