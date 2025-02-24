function findProp(obj, key, out) {
  let i;
  const proto = Object.prototype;
  const ts = proto.toString;
  const hasOwn = proto.hasOwnProperty.bind(obj);

  if ('[object Array]' !== ts.call(out)) out = [];

  for (i in obj) {
    if (hasOwn(i)) {
      if (i === key) {
        out.push(obj[i]);
      } else if (
        '[object Array]' === ts.call(obj[i]) ||
        '[object Object]' === ts.call(obj[i])
      ) {
        findProp(obj[i], key, out);
      }
    }
  }

  return out;
}

export { findProp };
