import React from "react";

export function lazyWithPreload(factory) {
  const Cmp = React.lazy(factory);
  // let consumers call .preload() to kick off the import early
  Cmp.preload = factory;
  return Cmp;
}
