/**
 * The membership rule of a collection.
 *
 * @remarks
 * A root plus a rule is a whole collection: membership is recomputed from the
 * tree, never registered by the caller. {@link CollectionRule.matches} and
 * {@link CollectionRule.subtree} are read on every walk, but
 * {@link CollectionRule.attributes} is read once, when the collection
 * registers with its observer.
 */
export interface CollectionRule {
  /**
   * True iff `element` is a member of the collection.
   *
   * @param element - A candidate drawn from the root, per
   * {@link CollectionRule.subtree}.
   *
   * @returns Whether `element` belongs to the collection.
   *
   * @remarks
   * Called once per candidate examined and never memoized: a walk to offset
   * `i` costs one call per candidate up to it, a rebuild one per candidate
   * under the root. It must be a pure predicate over the tree: it must not
   * mutate the tree, and it must not read state that neither the tree nor
   * {@link CollectionRule.attributes} can announce, or the collection goes
   * stale with nothing to notice it.
   */
  matches(element: Element): boolean;

  /**
   * Whether {@link matches} candidates are drawn from the whole subtree under
   * the root, or from its children alone.
   *
   * @defaultValue `false`, as in `MutationObserverInit`
   */
  subtree?: boolean | undefined;

  /**
   * Content attribute names whose change can alter the result of
   * {@link matches}.
   *
   * @remarks
   * The observer configuration is built from this declaration, so a rule that
   * reads an attribute it does not declare goes silently stale. `id` and
   * `name` are always observed and never need declaring; declaring one of
   * them anyway says membership itself depends on it, which promotes an id
   * change from a named-cache invalidation to a full one.
   */
  attributes?: readonly string[] | undefined;
}
