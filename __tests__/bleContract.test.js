import { BLE_CHAR_UUIDS, PARAM_CHAR_BY_ID, PARAM_IDS } from "../src/ble/bleContract";

describe("ten-parameter BLE contract", () => {
  it("maps exactly parameters 1 through 10", () => {
    expect(Object.keys(PARAM_CHAR_BY_ID).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(PARAM_IDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(PARAM_CHAR_BY_ID[10]).toBe(BLE_CHAR_UUIDS.param10);
    expect(BLE_CHAR_UUIDS.param10).toBe("8d4d3c10-2a4c-4d1f-9b3a-6f001234000a");
  });
});
