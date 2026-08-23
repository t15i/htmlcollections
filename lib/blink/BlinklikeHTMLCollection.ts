import {
  DOMString,
  InterfaceType,
  Nullable,
  UnsignedLong,
} from "@t15i/webidl-types";
import {
  Argument,
  Attribute,
  Exposed,
  Getter,
  Operation,
  Interface,
  Internals,
  SupportedPropertyIndices,
  SupportedPropertyNames,
  Constructor,
} from "@t15i/webidl-decorators";

import { BlinklikeHTMLCollectionData } from "./BlinklikeHTMLCollectionData";
import { BlinklikeHTMLCollectionSupportedPropertyIndices } from "./BlinklikeHTMLCollectionSupportedPropertyIndices";
import { BlinklikeHTMLCollectionSupportedPropertyNames } from "./BlinklikeHTMLCollectionSupportedPropertyNames";

const NullableElement = Nullable(InterfaceType(Element));

export interface BlinklikeHTMLCollectionInternals<E extends Element = Element> {
  data: BlinklikeHTMLCollectionData<E>;
  supportedPropertyIndices: BlinklikeHTMLCollectionSupportedPropertyIndices<E>;
  supportedPropertyNames: BlinklikeHTMLCollectionSupportedPropertyNames<E>;
}

/**
 * WebIDL-conformant `HTMLCollection` wrapper around a
 * {@link BlinklikeHTMLCollectionData} backing.
 *
 * @see https://dom.spec.whatwg.org/#interface-htmlcollection
 */
@Exposed("Window")
@Interface("HTMLCollection")
@Constructor([Argument(InterfaceType(BlinklikeHTMLCollectionData), "data")])
export class BlinklikeHTMLCollection<
  E extends Element = Element,
> implements HTMLCollectionOf<E> {
  declare [Symbol.iterator]: (typeof Array.prototype)[typeof Symbol.iterator];

  /** @internal */
  [Internals]: BlinklikeHTMLCollectionInternals<E>;

  [key: number]: E;

  constructor(data: BlinklikeHTMLCollectionData<E>) {
    this[Internals] = {
      data: data,
      supportedPropertyIndices:
        new BlinklikeHTMLCollectionSupportedPropertyIndices(data),
      supportedPropertyNames: new BlinklikeHTMLCollectionSupportedPropertyNames(
        data,
      ),
    };
  }

  @Attribute(UnsignedLong)
  get length() {
    return this[Internals].data.length;
  }

  @Getter
  @Operation(NullableElement, [Argument(UnsignedLong, "index")])
  item(index: number): E | null {
    return this[Internals].data.item(index);
  }

  @Getter
  @Operation(NullableElement, [Argument(DOMString, "name")])
  namedItem(name: string): E | null {
    return this[Internals].data.namedItem(name);
  }

  @SupportedPropertyIndices
  // eslint-disable-next-line
  #supportedPropertyIndices() {
    return this[Internals].supportedPropertyIndices;
  }

  @SupportedPropertyNames
  // eslint-disable-next-line
  #supportedPropertyNames() {
    return this[Internals].supportedPropertyNames;
  }
}

if (typeof HTMLCollection !== "undefined") {
  const platformHasInstance = HTMLCollection[Symbol.hasInstance];
  Object.defineProperty(HTMLCollection, Symbol.hasInstance, {
    value: function hasInstance(this: unknown, instance: unknown): boolean {
      if (instance instanceof BlinklikeHTMLCollection) return true;
      return platformHasInstance.call(this, instance);
    },
    configurable: true,
  });
}
