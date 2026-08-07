# htmlcollections — a collection of HTMLCollection implementations

A small toolkit for building [WebIDL](https://webidl.spec.whatwg.org/)-conformant
[`HTMLCollection`](https://dom.spec.whatwg.org/#interface-htmlcollection)
variants powered by
[`@t15i/webidl-decorators`](https://github.com/t15i/webidl-decorators),
[`@t15i/webidl-types`](https://github.com/t15i/webidl-types), and
[`@t15i/webspecs`](https://github.com/t15i/webspecs).

> **Heads up!** These collections use **push** semantics — membership is
> managed by the caller through `insertAfter` and `remove`. The primary
> intended use case is the
> [Web Components API](https://developer.mozilla.org/docs/Web/API/Web_components),
> whose lifecycle callbacks (`connectedCallback`, `disconnectedCallback`) give
> each element a natural place to register or deregister itself with the
> owning collection.
>
> Once membership is set, *attribute*-level observation (id and name changes
> on existing members) is handled for you.

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

### Wire it into a Web Component

The intended pattern is to instantiate a `BlinklikeHTMLCollectionData` rooted
on the custom element itself, wrap it in a `BlinklikeHTMLCollection`, and
maintain membership from the element's lifecycle:

```ts
import {
  BlinklikeHTMLCollection,
  BlinklikeHTMLCollectionData,
} from "htmlcollections";

class HTMLCustomListElement extends HTMLElement {
  data_ = new BlinklikeHTMLCollectionData(this);
  #coll = new BlinklikeHTMLCollection(this.data_);

  get items(): HTMLCollection {
    return this.#coll;
  }
}

class HTMLCustomItemElement extends HTMLElement {
  #list: HTMLCustomListElement | null = null

  connectedCallback() {
    this.#list = getClosestListElement(this)
    if (this.#list) {
      this.#list.data_.insertAfter(this, getPreviousItemElement(this))
    }
  }

  disconnectedCallback() {
    if (this.#list) {
      this.#list.data_.remove(this)
    }
    this.#list = null
  }
}

customElements.define("custom-list", HTMLCustomListElement);
customElements.define("custom-item", HTMLCustomItemElement);
```

```ts
const list = document.createElement("custom-list");
list.innerHTML = `<custom-item id="a"></custom-item><custom-item id="b"></custom-item>`;
document.body.append(list);

list.items.length;          // 2
list.items.item(0);         // <div id="a">
list.items.namedItem("b");  // <div id="b">
[...list.items];            // [<div id="a">, <div id="b">]
```

### Live id/name lookups

Once an element is a member, named access — `namedItem(name)`, `coll[name]`,
and `name in coll` — follows `id` and `name` attribute mutations through a
single `MutationObserver` rooted on the element you passed to
`BlinklikeHTMLCollectionData`. Reads synchronously drain pending observer
records, so callers never see stale state:

```ts
const el = document.createElement("div");
el.id = "hero";
list.append(el);

list.items.namedItem("hero");      // <div id="hero">
list.items["hero"];                // <div id="hero">

el.id = "champion";

list.items.namedItem("hero");      // null
list.items.namedItem("champion");  // <div id="champion">
"champion" in list.items;          // true
```

## Extending

Every part of `BlinklikeHTMLCollection` is exposed, so you can plug the backing
store and the supported-property views into your own `DerivedHTMLCollection` class:

```ts
import {
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

interface DerivedHTMLCollectionInternals
  extends BlinklikeHTMLCollectionInternals {
  // ...
}

@Exposed("Window")
@Interface
@Constructor([InterfaceType(BlinklikeHTMLCollectionData)])
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
`@Operation(returnType, [argTypes])`; an indexed or named getter stacks
`@Getter` on top of it (with `@Setter`/`@Deleter` as the other special
operations), and whether it acts on indexed or named properties is inferred from
the first argument type — `UnsignedLong` for `item(index)`, `DOMString` for
`namedItem(name)`. A WebIDL constructor operation is declared with
`@Constructor([argTypes])` on the class alongside `@Interface`; that is what
turns `new DerivedHTMLCollection(data)` into a platform-object construction.
Iteration (`for…of`, spread, `Array.from`) comes for free from the indexed
getter plus `length`, so no separate iterator member is needed.

## License

[MIT](./LICENSE)
