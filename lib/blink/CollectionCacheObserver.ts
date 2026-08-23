const IMPLIED_ATTRIBUTES: ReadonlySet<string> = new Set(["id", "name"]);

const NO_ATTRIBUTES: ReadonlySet<string> = new Set();

/** True iff `nodes` contains at least one element. */
function containsElement(nodes: NodeList): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]!.nodeType === Node.ELEMENT_NODE) {
      return true;
    }
  }
  return false;
}

/**
 * True iff `record` adds or removes at least one element.
 *
 * This is a property of the mutation rather than of any collection, which is
 * why it is answered once per record instead of once per cache.
 */
function affectsElements(record: MutationRecord): boolean {
  return (
    containsElement(record.addedNodes) || containsElement(record.removedNodes)
  );
}

/** The caches of one collection, as far as invalidation is concerned. */
export interface CollectionCache {
  /**
   * Drops every cache, the named one included.
   *
   * @remarks
   * Called once per registered cache for every record that could change
   * membership — an element added or removed, a declared attribute changed —
   * so it has to be O(1): drop state here, rebuild it on the next read.
   * Calling it twice in a row must be the same as calling it once.
   */
  invalidate(): void;

  /**
   * Drops only the named cache.
   *
   * @remarks
   * Called when an `id` or `name` change leaves membership intact, which is
   * the one case where a cache can keep what it walked the tree for. Same
   * contract as {@link CollectionCache.invalidate}: O(1) and repeatable.
   */
  invalidateNames(): void;
}

/** Options accepted when a cache registers with an observer. */
export interface CollectionCacheObserverOptions {
  /**
   * Content attribute names whose change can alter this cache's membership.
   *
   * @remarks
   * `id` and `name` are observed for every cache and need not appear here.
   * Naming one of them anyway promotes it from a named-cache invalidation to
   * a full one.
   */
  attributes?: readonly string[] | undefined;
}

const observers = new WeakMap<Element, CollectionCacheObserver>();

/**
 * The single `MutationObserver` keeping every collection rooted at one element
 * up to date.
 *
 * @remarks
 * One instance per root, shared by every cache registered on it and reached
 * through {@link CollectionCacheObserver.observe}. Its configuration is the
 * union of what those caches asked for, so adding a cache can only widen it.
 * Records reach the caches when the observer delivers them, or earlier if a
 * read drains first.
 */
export class CollectionCacheObserver {
  /**
   * Registers `cache` for invalidation from mutations under `root`, and
   * returns the observer serving that root.
   *
   * @param root - The element to watch, subtree included.
   * @param cache - The cache to invalidate when the tree changes under it.
   * @param options - What this cache's membership depends on.
   *
   * @returns The observer serving `root`, newly created or already there.
   *
   * @remarks
   * O(a) in the attribute names registered on this root so far, since the
   * observer is reconfigured to their union plus `id` and `name`. A
   * registration lasts for the lifetime of the observer; there is no way to
   * take one back.
   */
  static observe(
    root: Element,
    cache: CollectionCache,
    options?: CollectionCacheObserverOptions,
  ): CollectionCacheObserver {
    let observer = observers.get(root);
    if (observer === undefined) {
      observer = new CollectionCacheObserver(root);
      observers.set(root, observer);
    }

    observer.register_(cache, options?.attributes);
    return observer;
  }

  protected root_: Element;
  protected observer_: MutationObserver;

  /** Every registered cache, against the attribute names it declared. */
  protected caches_: Map<CollectionCache, ReadonlySet<string>> = new Map();

  protected constructor(root: Element) {
    this.root_ = root;
    this.observer_ = new MutationObserver((records) => this.dispatch_(records));
  }

  /**
   * Synchronously consumes any records the observer has not yet delivered and
   * applies them.
   *
   * @remarks
   * O(1) on an empty queue, otherwise O(r × c) in pending records and
   * registered caches. This is what lets a read answer from a tree that
   * changed in the same task: callers drain before they touch a cache, so no
   * caller sees state older than the mutation it just made.
   */
  drain(): void {
    const records = this.observer_.takeRecords();
    if (records.length === 0) return;
    this.dispatch_(records);
  }

  /**
   * Records `cache` against the attribute names it declared, and widens the
   * observer to cover them.
   */
  protected register_(
    cache: CollectionCache,
    attributes: readonly string[] | undefined,
  ): void {
    this.caches_.set(
      cache,
      attributes === undefined || attributes.length === 0
        ? NO_ATTRIBUTES
        : new Set(attributes),
    );
    this.observe_();
  }

  /** Widens the observer configuration to cover every registered cache. */
  protected observe_(): void {
    const attributes = new Set(IMPLIED_ATTRIBUTES);
    for (const declared of this.caches_.values()) {
      for (const name of declared) attributes.add(name);
    }

    this.observer_.observe(this.root_, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [...attributes],
    });
  }

  /**
   * Routes one batch of records to every registered cache: an element coming
   * or going invalidates all of them, an attribute a cache declared
   * invalidates that one, and `id` or `name` reaches its names alone. A
   * record that only moves text is not routed anywhere.
   */
  protected dispatch_(records: MutationRecord[]): void {
    for (const record of records) {
      if (record.type === "childList") {
        if (!affectsElements(record)) continue;

        for (const cache of this.caches_.keys()) cache.invalidate();
        continue;
      }

      const name = record.attributeName;
      if (name === null) continue;

      for (const [cache, declared] of this.caches_) {
        if (declared.has(name)) {
          cache.invalidate();
        } else if (IMPLIED_ATTRIBUTES.has(name)) {
          cache.invalidateNames();
        }
      }
    }
  }
}
