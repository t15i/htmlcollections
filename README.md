# htmlcollections — a collection of HTMLCollection implementations

A small toolkit for building [WebIDL](https://webidl.spec.whatwg.org/)-conformant
[`HTMLCollection`](https://dom.spec.whatwg.org/#interface-htmlcollection)
variants powered by [`@t15i/webspecs`](https://github.com/t15i/webspecs) and
[`@t15i/webidl-decorators`](https://github.com/t15i/webidl-decorators).

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
  #coll = new BlinklikeHTMLCollection(this.#data);

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
import { Attribute, Interface } from "@t15i/webidl-decorators";
import { UnsignedLong } from "@t15i/webspecs/webidl";
import { BlinklikeHTMLCollectionData } from "htmlcollections";

interface DerivedHTMLCollectionInternals extends BlinklikeHTMLCollectionInternals {
  // ...
}

@Interface
class DerivedHTMLCollection extends BlinklikeHTMLCollection {
  declare [Internals]: DerivedHTMLCollectionInternals;

  constructor(data: BlinklikeHTMLCollectionData) {
    super(data)
    // this[Internals] ... 
  }

  @Attribute(UnsignedLong)
  get length(): number {
    return this[Internals].data.length;
  }
  
  @Attribute(UnsignedLong)
  set length(value: number) {
    // ...
  }
}
```

`@t15i/webspecs/webidl` provides the WebIDL type wrappers (`Nullable`, `Type`, `UnsignedLong`, ...)
used in the decorator signatures.
`@t15i/webidl-decorators` provides decorator API over `@t15i/webspecs/webidl` for the 
platform-object semantics

## License

[MIT](./LICENSE)
