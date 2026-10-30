const STUB = new URL("./firebase-stub.js", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier.endsWith("/firebase.js") && context.parentURL?.includes("/js/")) {
    return { url: STUB, shortCircuit: true };
  }
  return next(specifier, context);
}
