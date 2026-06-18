/**
 * Internal node carrying the link pointers and the caller's data payload.
 * Never crosses the {@link ElementLinkedList} boundary.
 */
interface Node<T> {
  next: Node<T> | null;
  prev: Node<T> | null;
  data: T;
}

/**
 * Doubly-linked list of `{ element: Element }`-shaped items with an
 * `Element -> item` index.
 *
 * @remarks
 * Callers work strictly in terms of `T` and `Element`. The link nodes are
 * private: structural surgery, head/tail bookkeeping, and the reverse
 * `Element -> item` index are all performed by the list. Mutation methods
 * validate their arguments themselves and signal rejection by returning
 * `false` / `undefined` — callers do not need to maintain invariants on
 * external "node" handles.
 */
export class ElementLinkedList<T extends { element: Element }> {
  protected head_: Node<T> | null = null;
  protected tail_: Node<T> | null = null;
  protected nodes_: Map<Element, Node<T>> = new Map();

  /** The first item in the list, or `null` if the list is empty. */
  get head(): T | null {
    return this.head_ === null ? null : this.head_.data;
  }

  /** True iff `element` is wrapped by some item in the list. O(1). */
  has(element: Element): boolean {
    return this.nodes_.has(element);
  }

  /** The item wrapping `element`, or `undefined` if not a member. O(1). */
  get(element: Element): T | undefined {
    return this.nodes_.get(element)?.data;
  }

  /**
   * The item immediately after the item wrapping `element`, or `null` if
   * `element` is the tail or not a member. O(1).
   */
  nextOf(element: Element): T | null {
    return this.nodes_.get(element)?.next?.data ?? null;
  }

  /**
   * The item immediately before the item wrapping `element`, or `null` if
   * `element` is the head or not a member. O(1).
   */
  previousOf(element: Element): T | null {
    return this.nodes_.get(element)?.prev?.data ?? null;
  }

  /** Iterates the items of the list in order. */
  *[Symbol.iterator](): IterableIterator<T> {
    for (let n = this.head_; n !== null; n = n.next) yield n.data;
  }

  /**
   * Inserts `data` immediately after the item wrapping `ref`.
   *
   * @param data - The item to insert.
   * @param ref - The reference element, or `null` to prepend.
   *
   * @returns `true` on success; `false` if `data.element` is already a
   * member, or if `ref` is non-`null` and not a member.
   */
  insertAfter(data: T, ref: Element | null): boolean {
    if (this.nodes_.has(data.element)) return false;

    let refNode: Node<T> | null;
    if (ref === null) {
      refNode = null;
    } else {
      const found = this.nodes_.get(ref);
      if (found === undefined) return false;
      refNode = found;
    }

    const node: Node<T> = {
      data,
      prev: refNode,
      next: refNode !== null ? refNode.next : this.head_,
    };

    if (node.prev !== null) node.prev.next = node;
    else this.head_ = node;

    if (node.next !== null) node.next.prev = node;
    else this.tail_ = node;

    this.nodes_.set(data.element, node);
    return true;
  }

  /**
   * Removes the item wrapping `element`.
   *
   * @returns The removed item, or `undefined` if `element` was not a member.
   * O(1).
   */
  remove(element: Element): T | undefined {
    const node = this.nodes_.get(element);
    if (node === undefined) return undefined;

    if (node.prev !== null) node.prev.next = node.next;
    else this.head_ = node.next;

    if (node.next !== null) node.next.prev = node.prev;
    else this.tail_ = node.prev;

    this.nodes_.delete(element);
    return node.data;
  }

  /**
   * The zero-based position of the item wrapping `element`, or `-1` if it is
   * not a member.
   */
  indexOf(element: Element): number {
    if (!this.nodes_.has(element)) return -1;
    let i = 0;
    for (let n = this.head_; n !== null; n = n.next) {
      if (n.data.element === element) return i;
      i++;
    }
    return -1;
  }
}
