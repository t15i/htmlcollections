/**
 * The membership rule of a collection, as an object of a known kind.
 */
export class CollectionRule {
  /** @see CollectionRuleOptions.subtree */
  readonly subtree: boolean;

  /** @see CollectionRuleOptions.attributes */
  readonly attributes: readonly string[];

  readonly #matches: (element: Element) => boolean;

  /**
   * @param options - What membership means, and which attribute changes can
   * alter it.
   */
  constructor(options: {
    /**
     * True iff `element` is a member of the collection.
     *
     * @param element - A candidate drawn from the root, per
     * {@link CollectionRule.subtree}.
     *
     * @returns Whether `element` belongs to the collection.
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
     */
    attributes?: readonly string[] | undefined;
  }) {
    this.#matches = options.matches;
    this.subtree = options.subtree ?? false;
    this.attributes = options.attributes ?? [];
  }

  /** @see CollectionRuleOptions.matches */
  matches(element: Element): boolean {
    return this.#matches(element);
  }
}
