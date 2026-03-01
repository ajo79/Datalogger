export function navigateToTabRoute(navigation, routeName) {
  const tryNavigate = (nav, name, params) => {
    if (!nav?.navigate) return false;
    const state = nav.getState?.();
    const routeNames = Array.isArray(state?.routeNames) ? state.routeNames : [];
    if (!routeNames.includes(name)) return false;
    nav.navigate(name, params);
    return true;
  };

  // 1) Direct tab route in current navigator.
  if (tryNavigate(navigation, routeName)) return;

  // 2) Tab navigator mounted under "Home" in current navigator.
  if (tryNavigate(navigation, "Home", { screen: routeName })) return;

  const parent = navigation?.getParent?.();
  if (tryNavigate(parent, routeName)) return;
  if (tryNavigate(parent, "Home", { screen: routeName })) return;

  const grandParent = parent?.getParent?.();
  if (tryNavigate(grandParent, "Main", { screen: "Home", params: { screen: routeName } })) return;
  if (tryNavigate(grandParent, "Auth", { screen: "Home", params: { screen: routeName } })) return;

  // Last resort.
  navigation?.navigate?.(routeName);
}

export function logoutToAuthRoot(navigation) {
  const candidates = [
    navigation,
    navigation?.getParent?.(),
    navigation?.getParent?.()?.getParent?.(),
  ].filter(Boolean);

  for (const nav of candidates) {
    const state = nav.getState?.();
    const routeNames = Array.isArray(state?.routeNames) ? state.routeNames : [];
    if (routeNames.includes("Auth") && nav.reset) {
      nav.reset({ index: 0, routes: [{ name: "Auth" }] });
      return true;
    }
  }

  for (const nav of candidates) {
    const state = nav.getState?.();
    const routeNames = Array.isArray(state?.routeNames) ? state.routeNames : [];
    if (routeNames.includes("Auth") && nav.navigate) {
      nav.navigate("Auth");
      return true;
    }
  }

  return false;
}
