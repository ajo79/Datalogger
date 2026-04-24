import { getThemeDefinition, isThemeId, THEME_OPTIONS } from "../src/theme/themes";

describe("theme registry", () => {
  test("recognizes blueWhite theme id", () => {
    expect(isThemeId("blueWhite")).toBe(true);
  });

  test("exposes blueWhite in theme options", () => {
    const option = THEME_OPTIONS.find((item) => item.id === "blueWhite");
    expect(option).toBeTruthy();
    expect(option.label).toBe("Blue White");
    expect(option.description).toBe("Professional navy and white palette with clean blue accents.");
  });

  test("returns blueWhite definition by id", () => {
    const definition = getThemeDefinition("blueWhite");
    expect(definition.id).toBe("blueWhite");
    expect(definition.name).toBe("Blue White");
    expect(definition.colors.brand).toBe("#1E5EA3");
  });
});
