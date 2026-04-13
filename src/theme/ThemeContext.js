import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import spacing, { componentSpacing, screenPadding } from "./spacing";
import radius from "./radius";
import shadows from "./shadows";
import typography from "./typography";
import motion from "./motion";
import {
  DEFAULT_THEME_ID,
  getThemeDefinition,
  isThemeId,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "./themes";

function buildTheme(themeId) {
  const definition = getThemeDefinition(themeId);
  return Object.freeze({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    colors: definition.colors,
    spacing,
    screenPadding,
    componentSpacing,
    radius,
    shadows,
    typography,
    motion,
  });
}

const ThemeContext = createContext({
  themeId: DEFAULT_THEME_ID,
  theme: buildTheme(DEFAULT_THEME_ID),
  setTheme: () => {},
  themeOptions: THEME_OPTIONS,
  hydrated: false,
});

export function AppThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!isActive) return;
        if (isThemeId(stored)) {
          setThemeId(stored);
        } else {
          setThemeId(DEFAULT_THEME_ID);
        }
      } catch {
        if (isActive) {
          setThemeId(DEFAULT_THEME_ID);
        }
      } finally {
        if (isActive) setHydrated(true);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(THEME_STORAGE_KEY, themeId).catch(() => {});
  }, [hydrated, themeId]);

  const setTheme = useCallback((nextThemeId) => {
    if (isThemeId(nextThemeId)) {
      setThemeId(nextThemeId);
      return;
    }
    setThemeId(DEFAULT_THEME_ID);
  }, []);

  const theme = useMemo(() => buildTheme(themeId), [themeId]);

  const value = useMemo(
    () => ({
      themeId,
      theme,
      setTheme,
      themeOptions: THEME_OPTIONS,
      hydrated,
    }),
    [themeId, theme, setTheme, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;

