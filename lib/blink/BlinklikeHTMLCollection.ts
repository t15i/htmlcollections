import { Nullable, Type, UnsignedLong } from "@t15i/webspecs/webidl";
import {
  Attribute,
  IndexedPropertyGetter,
  Interface,
  Internals,
  NamedPropertyGetter,
  SupportedPropertyIndices,
  SupportedPropertyNames,
} from "@t15i/webidl-decorators";

import { BlinklikeHTMLCollectionData } from "./BlinklikeHTMLCollectionData";
import { BlinklikeHTMLCollectionSupportedPropertyIndices } from "./BlinklikeHTMLCollectionSupportedPropertyIndices";
import { BlinklikeHTMLCollectionSupportedPropertyNames } from "./BlinklikeHTMLCollectionSupportedPropertyNames";

export const NullableElement = Nullable(Type(Element));

export interface BlinklikeHTMLCollectionInternals {
  data: BlinklikeHTMLCollectionData;
  supportedPropertyIndices: BlinklikeHTMLCollectionSupportedPropertyIndices;
  supportedPropertyNames: BlinklikeHTMLCollectionSupportedPropertyNames;
}

/**
 * WebIDL-conformant `HTMLCollection` wrapper around a
 * {@link BlinklikeHTMLCollectionData} backing.
 *
 * @see https://dom.spec.whatwg.org/#interface-htmlcollection
 */
@Interface
export class BlinklikeHTMLCollection implements HTMLCollection {
  /** @internal */
  [Internals]: BlinklikeHTMLCollectionInternals;

  [key: number]: Element;

  constructor(data: BlinklikeHTMLCollectionData) {
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

  @IndexedPropertyGetter(NullableElement)
  item(index: number) {
    return this[Internals].data.item(index);
  }

  @NamedPropertyGetter(NullableElement)
  namedItem(name: string) {
    return this[Internals].data.namedItem(name);
  }

  [Symbol.iterator]() {
    return this[Internals].data[Symbol.iterator]();
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
