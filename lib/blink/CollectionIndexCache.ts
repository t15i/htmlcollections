import type { CollectionRule } from "./CollectionRule";

/**
 * Indexed access to a collection backed by nothing but a cursor.
 *
 * @remarks
 * O(1) memory: a `TreeWalker` parked on the last member handed out — the
 * anchor — and the index that member sits at. Every read walks from the
 * anchor and leaves it on whatever it returned, so a sequential scan costs
 * one step per call, in either direction. Nothing here notices tree changes;
 * the anchor is dropped from the outside through {@link invalidate}.
 */
export class CollectionIndexCache<E extends Element = Element> {
  protected root_: Element;
  protected rule_: CollectionRule;

  protected walker_: TreeWalker;

  protected currentIndex_: number = 0;

  protected count_: number = 0;
  protected countValid_: boolean = false;

  /**
   * @param root - The element the collection is rooted at. It is never a
   * member itself.
   * @param rule - The membership rule, read on every walk.
   */
  constructor(root: Element, rule: CollectionRule) {
    this.root_ = root;
    this.rule_ = rule;

    this.walker_ = root.ownerDocument.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
    );
  }

  /**
   * The number of members.
   *
   * @returns How many elements the rule matches under the root.
   *
   * @remarks
   * O(1) once the count is known. Otherwise it walks from the anchor to the
   * end of the collection, which is what makes the count known and leaves the
   * anchor on the last member.
   */
  count(): number {
    if (this.countValid_) return this.count_;
    this.get(Number.MAX_SAFE_INTEGER);
    return this.count_;
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
   * O(d) in the distance from the anchor to `index`, restarting from the
   * first member — or from the last one, once the count is known — whenever
   * either end is closer. Moves the anchor onto the member it returns, so
   * walking the collection one index at a time costs O(1) per call.
   */
  get(index: number): E | null {
    if (!Number.isInteger(index) || index < 0) return null;
    if (this.countValid_ && index >= this.count_) return null;

    const anchor = this.anchor_();
    if (anchor !== null) {
      if (index > this.currentIndex_) return this.after_(index);
      if (index < this.currentIndex_) return this.before_(index);
      return anchor;
    }

    const first = this.first_();
    if (first === null) {
      this.setCount_(0);
      return null;
    }

    this.currentIndex_ = 0;
    return index !== 0 ? this.after_(index) : first;
  }

  /**
   * True iff the collection has no members.
   *
   * @returns Whether the collection is empty.
   *
   * @remarks
   * O(1) when the count is known or an anchor is set. Otherwise it stops at
   * the first member instead of counting them, and learns the count only when
   * there is no member to stop at.
   */
  isEmpty(): boolean {
    if (this.countValid_) return this.count_ === 0;
    if (this.anchor_() !== null) return false;
    return this.get(0) === null;
  }

  /**
   * True iff the collection has exactly one member.
   *
   * @returns Whether the collection holds exactly one member.
   *
   * @remarks
   * O(1) when the count is known, or when the anchor already sits past the
   * first member. Otherwise it walks no further than the second member, and
   * an answer of `true` is one that ran off the end, so the count is known
   * from then on.
   */
  hasExactlyOne(): boolean {
    if (this.countValid_) return this.count_ === 1;
    if (this.anchor_() !== null) {
      return this.currentIndex_ === 0 && this.get(1) === null;
    }
    return this.get(0) !== null && this.get(1) === null;
  }

  /**
   * Drops the anchor and the count.
   *
   * @remarks
   * O(1). The next read starts over from the first member.
   */
  invalidate(): void {
    this.dropAnchor_();
    this.countValid_ = false;
  }

  /** The member the walker is parked on, or `null` if there is no anchor. */
  protected anchor_(): E | null {
    const node = this.walker_.currentNode;
    return node === this.root_ ? null : (node as E);
  }

  /** Moves the cursor one candidate forward. */
  protected stepForward_(): Node | null {
    const walker = this.walker_;
    if (this.rule_.subtree) return walker.nextNode();

    return walker.currentNode === this.root_
      ? walker.firstChild()
      : walker.nextSibling();
  }

  /** Moves the cursor one candidate backward. */
  protected stepBackward_(): Node | null {
    const walker = this.walker_;
    if (!this.rule_.subtree) return walker.previousSibling();

    const node = walker.previousNode();
    // previousNode surfaces the root on its way out of the last subtree it
    // was in. The root is never a member, and nothing precedes it.
    return node === this.root_ ? null : node;
  }

  /** Steps forward until a member is reached, or the cursor does not move. */
  protected matchForward_(): E | null {
    const walker = this.walker_;
    const start = walker.currentNode;

    for (
      let node = this.stepForward_();
      node !== null;
      node = this.stepForward_()
    ) {
      if (this.rule_.matches(node as Element)) return node as E;
    }

    walker.currentNode = start;
    return null;
  }

  /** Steps backward until a member is reached, or the cursor does not move. */
  protected matchBackward_(): E | null {
    const walker = this.walker_;
    const start = walker.currentNode;

    for (
      let node = this.stepBackward_();
      node !== null;
      node = this.stepBackward_()
    ) {
      if (this.rule_.matches(node as Element)) return node as E;
    }

    walker.currentNode = start;
    return null;
  }

  /** The first member, or `null` if the collection is empty. */
  protected first_(): E | null {
    this.walker_.currentNode = this.root_;
    return this.matchForward_();
  }

  /** The last member, or `null` if the collection is empty. */
  protected last_(): E | null {
    const walker = this.walker_;
    walker.currentNode = this.root_;

    let candidate = walker.lastChild();
    if (candidate === null) return null;

    if (this.rule_.subtree) {
      for (
        let deeper = walker.lastChild();
        deeper !== null;
        deeper = walker.lastChild()
      ) {
        candidate = deeper;
      }
    }

    if (this.rule_.matches(candidate as Element)) return candidate as E;
    return this.matchBackward_();
  }

  /** The member after `from`, or `null` if `from` is the last one. */
  protected next_(from: E): E | null {
    this.walker_.currentNode = from;
    return this.matchForward_();
  }

  /** The member before `from`, or `null` if `from` is the first one. */
  protected previous_(from: E): E | null {
    this.walker_.currentNode = from;
    return this.matchBackward_();
  }

  /**
   * Walks forward from the anchor to `index`, or back from the last member
   * when the known count says that is closer.
   */
  protected after_(index: number): E | null {
    const from = this.currentIndex_;

    // Unguarded, because backward traversal is always available here: a rule
    // is a pure predicate over the tree, so a collection has no order other
    // than tree order and nothing can make the walk one-directional.
    if (this.countValid_ && this.count_ - index < index - from) {
      const last = this.last_();
      if (last === null) return this.emptied_();

      this.currentIndex_ = this.count_ - 1;
      return index < this.count_ - 1 ? this.before_(index) : last;
    }

    let node = this.anchor_()!;
    let at = from;

    for (;;) {
      const next = this.next_(node);
      if (next === null) {
        // Did not find the member. On the plus side, we now know the count.
        this.currentIndex_ = at;
        this.setCount_(at + 1);
        return null;
      }

      node = next;
      at++;

      if (at === index) {
        this.currentIndex_ = at;
        return node;
      }
    }
  }

  /**
   * Walks backward from the anchor to `index`, or forward from the first
   * member when that is closer.
   */
  protected before_(index: number): E | null {
    const from = this.currentIndex_;

    if (index < from - index) {
      const first = this.first_();
      if (first === null) return this.emptied_();

      this.currentIndex_ = 0;
      return index !== 0 ? this.after_(index) : first;
    }

    let node = this.anchor_()!;
    let at = from;

    for (;;) {
      const previous = this.previous_(node);
      // A backward walk cannot run out before offset 0, so reaching this means
      // the anchor was describing a collection that no longer exists. Unlike
      // running off the end, that says nothing about the count.
      if (previous === null) return this.dropAnchor_();

      node = previous;
      at--;

      if (at === index) {
        this.currentIndex_ = at;
        return node;
      }
    }
  }

  /** Recovers from an anchor that outlived its members. */
  protected emptied_(): null {
    this.dropAnchor_();
    this.setCount_(0);
    return null;
  }

  /** Parks the cursor back on the root, which is how "no anchor" is spelled. */
  protected dropAnchor_(): null {
    this.walker_.currentNode = this.root_;
    this.currentIndex_ = 0;
    return null;
  }

  /** Records `count` as the member count, and marks it trustworthy. */
  protected setCount_(count: number): void {
    this.count_ = count;
    this.countValid_ = true;
  }
}
