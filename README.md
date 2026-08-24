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

> **Note for 3.x users.** Membership used to be **pushed** in by the caller
> through `insertAfter` and `remove`. It is now **pulled** from the tree by a
> rule you declare once. See [Migrating from 3.x](#migrating-from-3x).

> The decorator proposal used is the
> [TC39 stage-3 / 2023-11](https://github.com/tc39/proposal-decorators) variant.
> Make sure your toolchain supports it.

## Install

```sh
npm install htmlcollections
```

Install with peer dependencies if your package manager does not do so
automatically:

```sh
npm install htmlcollections @t15i/webidl-decorators @t15i/webidl-types @t15i/webspecs
```

## Usage

A collection is a **root** plus a **rule**. Nothing else. Membership is a
function of the tree, recomputed whenever the tree changes underneath:

```ts
import {
  BlinklikeHTMLCollection,
  BlinklikeHTMLCollectionData,
} from "htmlcollections";

const root = document.querySelector("#list")!;

const data = new BlinklikeHTMLCollectionData(root, {
  matches: (el) => el.localName === "custom-item",
});
const items = new BlinklikeHTMLCollection(data);

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
import {
  BlinklikeHTMLCollection,
  BlinklikeHTMLCollectionData,
} from "htmlcollections";

class HTMLCustomListElement extends HTMLElement {
  #data = new BlinklikeHTMLCollectionData(this, {
    matches: (el) => el.localName === "custom-item",
  });
  #items = new BlinklikeHTMLCollection(this.#data);

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
interface CollectionRule {
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
new BlinklikeHTMLCollectionData(form, {
  matches: (el) => el.localName === "input",
  subtree: true,
});
```

### `attributes`

Content attribute names whose change can alter what `matches` answers. This is
the declaration the observer configuration is built from, so a rule that reads
an attribute it does not declare goes silently stale:

```ts
new BlinklikeHTMLCollectionData(select, {
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
data.invalidate();
```

The canonical case is a `<select>`: an option's selectedness is an internal
flag with no content attribute behind it, so nothing an observer can watch ever
changes when it flips.

## Beyond `HTMLCollection`

`BlinklikeHTMLCollection` exposes exactly the WebIDL interface. The backing
`BlinklikeHTMLCollectionData` exposes more:

| member                                        |                                         |
| --------------------------------------------- | --------------------------------------- |
| `root`                                        | the element the collection is rooted at |
| `length`, `item(i)`, `namedItem(name)`        | the `HTMLCollection` surface            |
| `hasItem(i)`, `hasNamedItem(name)`            | supported-property predicates           |
| `first`, `last`                               | the ends of the collection              |
| `isEmpty`, `hasExactlyOneItem`                | cheap answers that avoid a full walk    |
| `indexOf(el)`, `contains(el)`                 | O(1) position and membership            |
| `next(el)`, `previous(el)`                    | O(1) neighbours                         |
| `forward(el)`, `backward(el)`                 | iterate from `el` to either end         |
| `indices()`, `names()`, `[Symbol.iterator]()` | iteration                               |
| `invalidate()`, `invalidateNames()`           | drop caches by hand                     |

Cost, in short: `item(i)` on a cold cache walks to `i` and stops; reading
`length` walks once and remembers every member, after which indexed access is
an array lookup. `first`, `isEmpty` and `hasExactlyOneItem` never build that
vector; `last`, `indexOf`, `contains` and the neighbour operations do.

## Extending

Every part is exported, so you can plug the backing store and the
supported-property views into your own class:

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
  BlinklikeHTMLCollectionData,
  type BlinklikeHTMLCollectionInternals,
} from "htmlcollections";

interface DerivedHTMLCollectionInternals extends BlinklikeHTMLCollectionInternals {
  // ...
}

@Exposed("Window")
@Interface
@Constructor([Argument(InterfaceType(BlinklikeHTMLCollectionData), "data")])
class DerivedHTMLCollection extends BlinklikeHTMLCollection {
  /** @internal */
  declare [Internals]: DerivedHTMLCollectionInternals;

  constructor(data: BlinklikeHTMLCollectionData) {
    super(data);
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

Every interface must declare where it is exposed: `@Exposed("Window")` is
applied _outside_ `@Interface` and is required — an interface that is never
exposed is rejected when `@Interface` finalizes it. `@Interface` uses the class
name as the WebIDL identifier by default, or you can pass one explicitly, e.g.
`@Interface("HTMLCollection")` (as `BlinklikeHTMLCollection` does).

Operations and special operations follow the same model
`BlinklikeHTMLCollection` uses. A plain operation is
`@Operation(returnType, argumentList)`, where the argument list is built with
`Argument(type, "identifier")` — every WebIDL argument is declared under an
identifier, so `item(index)` passes `[Argument(UnsignedLong, "index")]`. An
indexed or named getter stacks `@Getter` on top of it (with `@Setter`/`@Deleter`
as the other special operations), and whether it acts on indexed or named
properties is inferred from the first argument type — `UnsignedLong` for
`item(index)`, `DOMString` for `namedItem(name)`. A WebIDL constructor operation
is declared with `@Constructor(argumentList)` on the class alongside
`@Interface`; that is what turns `new DerivedHTMLCollection(data)` into a
platform-object construction.
Iteration (`for…of`, spread, `Array.from`) comes for free from the indexed
getter plus `length`, so no separate iterator member is needed.

The lower layers are exported too: `IndexedItemsCache` (the item vector over
the cursor), `CollectionIndexCache` (the cursor alone, O(1) memory),
`NamedItemsCache`, and `CollectionCacheObserver`.

## Migrating from 3.x

`BlinklikeHTMLCollectionData` now takes a rule, and owns membership itself.

```diff
-const data = new BlinklikeHTMLCollectionData(root);
-data.insertAfter(element, previous);
-data.remove(element);
+const data = new BlinklikeHTMLCollectionData(root, {
+  matches: (el) => el.localName === "custom-item",
+});
```

- `insertAfter` and `remove` are gone. Put the element in the tree; the
  collection finds it.
- `ElementLinkedList` is gone.
- `RootObserver` / `RootObserverSubscriber` are now `CollectionCacheObserver` /
  `CollectionCache`, registered with
  `CollectionCacheObserver.observe(root, cache, options)`.
- `invalidateItems()` is now `invalidate()`.
- The `scope` and `attributes` fields no longer appear on
  `BlinklikeHTMLCollectionData`; they belong to the rule.

## License

[MIT](./LICENSE)
