import { HTMLNamespace } from "@t15i/webspecs/infra";

import type { IndexedItemsCache } from "./IndexedItemsCache";

/**
 * Reads the `name` attribute of `element` if it is in the HTML namespace,
 * otherwise returns `null`.
 *
 * @param element - The element to read.
 *
 * @returns The value of the `name` attribute, or `null` if the element does
 * not carry one or is not an HTML element.
 *
 * @remarks
 * O(1). The `name` half of named access is defined over HTML elements only —
 * unlike the id half — so this namespace check is what keeps a `name`
 * attribute on, say, an SVG element out of the name buckets.
 */
export function getNameAttribute(element: Element): string | null {
  return element.namespaceURI === HTMLNamespace
    ? element.getAttribute("name")
    : null;
}

/**
 * Id and name buckets over the members of a collection.
 *
 * @remarks
 * Built by one pass over {@link IndexedItemsCache.items}, so the first named
 * read materializes the item vector as well. Buckets are filled in tree
 * order, which is what makes the first entry of a bucket the first member
 * answering to that key.
 */
export class NamedItemsCache<E extends Element = Element> {
  protected index_: IndexedItemsCache<E>;

  protected ids_: Map<string, E[]> | null = null;
  protected names_: Map<string, E[]> | null = null;

  /**
   * @param index - The item cache these buckets are built over. Dropping its
   * members without dropping the buckets would leave them answering with
   * elements the collection no longer has.
   */
  constructor(index: IndexedItemsCache<E>) {
    this.index_ = index;
  }

  /**
   * True iff any member carries `name` as its id or `name` attribute.
   *
   * @param name - The key to look for.
   *
   * @returns Whether any member answers to `name`.
   *
   * @remarks
   * O(n) on the first call after an invalidation, O(1) after that.
   */
  has(name: string): boolean {
    if (this.ids_ === null) this.populate_();
    return this.ids_!.has(name) || this.names_!.has(name);
  }

  /**
   * The first member with id `name`, falling back to the first member whose
   * `name` attribute is `name`, or `null` if none matches.
   *
   * @param name - An id or `name` attribute value.
   *
   * @returns The first member answering to `name`, or `null` if none does.
   *
   * @remarks
   * O(n) on the first call after an invalidation, O(1) after that. Ids are
   * consulted first, and an element whose two attributes agree is kept out of
   * the name bucket, so a name bucket is only ever reached by a key no id
   * claims.
   */
  get(name: string): E | null {
    if (this.ids_ === null) this.populate_();

    const byId = this.ids_!.get(name);
    if (byId !== undefined) return byId[0]!;

    const byName = this.names_!.get(name);
    if (byName !== undefined) return byName[0]!;

    return null;
  }

  /**
   * Iterates the deduplicated keys currently in use as either an id or a
   * `name` attribute, in collection order.
   *
   * @returns A generator over the keys, each one yielded once.
   *
   * @remarks
   * O(n), and independent of the buckets: keys are read off the members
   * themselves, id before `name` within one member. Materializes the item
   * vector, but not the buckets.
   */
  *[Symbol.iterator](): Generator<string, void, unknown> {
    const seen = new Set<string>();
    for (const element of this.index_.items()) {
      const id = element.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        yield id;
      }
      const name = getNameAttribute(element);
      if (name && !seen.has(name)) {
        seen.add(name);
        yield name;
      }
    }
  }

  /**
   * Drops the bucket maps.
   *
   * @remarks
   * O(1). The item cache is left alone, so the next named read re-buckets the
   * members already in hand instead of walking the tree.
   */
  invalidate(): void {
    this.ids_ = null;
    this.names_ = null;
  }

  /** Buckets every member by its id and by its `name` attribute. */
  protected populate_(): void {
    const ids = new Map<string, E[]>();
    const names = new Map<string, E[]>();

    for (const element of this.index_.items()) {
      const id = element.id;
      if (id) {
        const bucket = ids.get(id);
        if (bucket !== undefined) bucket.push(element);
        else ids.set(id, [element]);
      }

      // An element whose two attributes agree is left out of the name bucket:
      // the id bucket is consulted first, so a second entry could only ever be
      // found by a lookup that already succeeded.
      const name = getNameAttribute(element);
      if (name && name !== id) {
        const bucket = names.get(name);
        if (bucket !== undefined) bucket.push(element);
        else names.set(name, [element]);
      }
    }

    this.ids_ = ids;
    this.names_ = names;
  }
}
