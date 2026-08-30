# htmlcollections — a collection of HTMLCollection implementations

A small toolkit for building [WebIDL](https://webidl.spec.whatwg.org/)-conformant
[`HTMLCollection`](https://dom.spec.whatwg.org/#interface-htmlcollection)
variants powered by
[`@t15i/webidl-decorators`](https://github.com/t15i/webidl-decorators),
[`@t15i/webidl-types`](https://github.com/t15i/webidl-types), and
[`@t15i/webspecs`](https://github.com/t15i/webspecs).

Indexed access is served by a two-tier cache: a cursor that walks only as far
as the index it was asked for, with a vector materialized on top of it the
first time anything reads `length`.

> The decorator proposal used is the
> [TC39 stage-3 / 2023-11](https://github.com/tc39/proposal-decorators) variant.
> Make sure your toolchain supports it.

## Install

```sh
npm install @t15i/htmlcollections
```

Install with peer dependencies if your package manager does not do so
automatically:

```sh
npm install @t15i/htmlcollections @t15i/webidl-decorators @t15i/webidl-types @t15i/webspecs
```

## Usage

A collection is a **root** plus a **rule**. Nothing else. Membership is a
function of the tree, recomputed whenever the tree changes underneath:

```ts
import { BlinklikeHTMLCollection, CollectionRule } from "@t15i/htmlcollections";

const root = document.querySelector("#list")!;

const items = new BlinklikeHTMLCollection(
  root,
  new CollectionRule({ matches: (el) => el.localName === "custom-item" }),
);

items.length; // 3
items.item(0); // <custom-item id="a">
items.namedItem("b"); // <custom-item id="b">
items["b"]; // same
[...items]; // [<custom-item id="a">, …]
```

There is nothing to register and nothing to keep in sync. Elements that were
already in the tree before the collection existed — parser output included —
are found by the first read.

### Wiring it into a Web Component

```ts
import { BlinklikeHTMLCollection, CollectionRule } from "@t15i/htmlcollections";

const ITEMS = new CollectionRule({
  matches: (el) => el.localName === "custom-item",
});

class HTMLCustomListElement extends HTMLElement {
  #items = new BlinklikeHTMLCollection(this, ITEMS);

  get items(): HTMLCollection {
    return this.#items;
  }
}

class HTMLCustomItemElement extends HTMLElement {}

customElements.define("custom-list", HTMLCustomListElement);
customElements.define("custom-item", HTMLCustomItemElement);
```

```ts
const list = document.createElement("custom-list") as HTMLCustomListElement;
list.innerHTML = `<custom-item id="a"></custom-item><custom-item id="b"></custom-item>`;
document.body.append(list);

list.items.length; // 2
list.items.namedItem("b"); // <custom-item id="b">
```

## The rule

```ts
class CollectionRule {
  constructor(options: CollectionRuleOptions);

  matches(element: Element): boolean;
  readonly subtree: boolean;
  readonly attributes: readonly string[];
}

interface CollectionRuleOptions {
  matches(element: Element): boolean;
  subtree?: boolean;
  attributes?: readonly string[];
}
```

### `matches`

A pure predicate, called once per candidate on every rebuild. It must not
mutate the tree.

**Prefer `localName` over `instanceof`.** A custom element can sit in the DOM
before its definition is registered, and the upgrade that follows emits no
mutation record — so a class-based rule can answer `false`, get cached, and
never be asked again:

```ts
// Fragile: reads as `false` for every element until `custom-item` is defined,
// and nothing tells the collection when that changes.
matches: (el) => el instanceof HTMLCustomItemElement;

// Stable: the tag name is fixed when the element is created.
matches: (el) => el.localName === "custom-item";
```

If membership really must depend on the class, call
[`data.invalidate()`](#manual-invalidation) after `customElements.define`.

### `subtree`

Where candidates come from. `false` (the default, as in
`MutationObserverInit`) draws them from the element children of the root;
`true` draws them from the whole subtree, descending into matching elements as
well.

```ts
new CollectionRule({
  matches: (el) => el.localName === "input",
  subtree: true,
});
```

### `attributes`

Content attribute names whose change can alter what `matches` answers. This is
the declaration the observer configuration is built from, so a rule that reads
an attribute it does not declare goes silently stale:

```ts
new CollectionRule({
  matches: (el) => el.localName === "option" && !el.hasAttribute("disabled"),
  attributes: ["disabled"], // ← without this, toggling `disabled` is not seen
});
```

`id` and `name` are always observed and never need declaring — `namedItem` is
defined over them. Declaring one of them anyway is meaningful and stronger: it
says membership itself depends on it, promoting an id change from a named-cache
invalidation to a full one.

## Live updates

Named access — `namedItem(name)`, `coll[name]`, `name in coll` — follows `id`
and `name` attribute mutations. Reads drain pending observer records
synchronously, so a caller never sees state older than the mutation it just
performed:

```ts
const el = document.createElement("custom-item");
el.id = "hero";
list.append(el);

list.items.namedItem("hero"); // <custom-item id="hero">

el.id = "champion";

list.items.namedItem("hero"); // null
list.items.namedItem("champion"); // <custom-item id="champion">
"champion" in list.items; // true
```

What invalidates what:

| change                                  | item cache | named cache |
| --------------------------------------- | ---------- | ----------- |
| element added or removed under the root | dropped    | dropped     |
| a declared `attributes` name changes    | dropped    | dropped     |
| `id` or `name` changes                  | kept       | dropped     |
| only text moves                         | kept       | kept        |

### Manual invalidation

Membership that no DOM mutation can express — an internal flag, a class that
only just became defined — has to be signalled by hand:

```ts
items[Internals].data.invalidate();
```

The canonical case is a `<select>`: an option's selectedness is an internal
flag with no content attribute behind it, so nothing an observer can watch ever
changes when it flips.

## Beyond `HTMLCollection`

`BlinklikeHTMLCollection` exposes exactly the WebIDL interface. The store it
keeps behind that - reachable as `collection[Internals].data`, and never built
by hand - exposes more:

| member                                        |                                      |
| --------------------------------------------- | ------------------------------------ |
| `root`, `rule`                                | what the collection was built from   |
| `length`, `item(i)`, `namedItem(name)`        | the `HTMLCollection` surface         |
| `hasItem(i)`, `hasNamedItem(name)`            | supported-property predicates        |
| `first`, `last`                               | the ends of the collection           |
| `isEmpty`, `hasExactlyOneItem`                | cheap answers that avoid a full walk |
| `indexOf(el)`, `contains(el)`                 | O(1) position and membership         |
| `next(el)`, `previous(el)`                    | O(1) neighbours                      |
| `forward(el)`, `backward(el)`                 | iterate from `el` to either end      |
| `indices()`, `names()`, `[Symbol.iterator]()` | iteration                            |
| `invalidate()`, `invalidateNames()`           | drop caches by hand                  |

Cost, in short: `item(i)` on a cold cache walks to `i` and stops; reading
`length` walks once and remembers every member, after which indexed access is
an array lookup. `first`, `isEmpty` and `hasExactlyOneItem` never build that
vector; `last`, `indexOf`, `contains` and the neighbour operations do.

## Extending

A collection is built from a root and a rule, and keeps the rest to itself, so
a derived collection passes the two along and adds what it needs:

```ts
import {
  Argument,
  Attribute,
  Constructor,
  Exposed,
  Interface,
  Internals,
} from "@t15i/webidl-decorators";
import { InterfaceType, UnsignedLong } from "@t15i/webidl-types";
import {
  BlinklikeHTMLCollection,
  CollectionRule,
  type BlinklikeHTMLCollectionInternals,
} from "@t15i/htmlcollections";

interface DerivedHTMLCollectionInternals extends BlinklikeHTMLCollectionInternals {
  // ...
}

@Exposed("Window")
@Interface
@Constructor([
  Argument(InterfaceType(Element), "root"),
  Argument(InterfaceType(CollectionRule), "rule"),
])
class DerivedHTMLCollection extends BlinklikeHTMLCollection {
  /** @internal */
  declare [Internals]: DerivedHTMLCollectionInternals;

  constructor(root: Element, rule: CollectionRule) {
    super(root, rule);
    // this[Internals] ...
  }

  @Attribute(UnsignedLong)
  override get length(): number {
    return this[Internals].data.length;
  }

  @Attribute(UnsignedLong)
  override set length(value: number) {
    // ...
  }
}
```

`@t15i/webidl-types` provides the WebIDL type wrappers (`Nullable`,
`InterfaceType`, `UnsignedLong`, …) you pass to the decorators.
`@t15i/webidl-decorators` provides the decorator API, and `@t15i/webspecs`
provides the runtime platform-object semantics behind it.

## License

[MIT](./LICENSE)
