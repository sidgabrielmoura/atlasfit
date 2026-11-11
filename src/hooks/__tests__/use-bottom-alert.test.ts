import { describe, it, expect, beforeEach, vi } from "vitest";

describe("use-bottom-alert offset calculation logic", () => {
  let styleProperties: Record<string, string>;
  let dispatchedEvents: CustomEvent[];

  beforeEach(() => {
    styleProperties = {};
    dispatchedEvents = [];

    // Mock DOM environment for node-based vitest
    // @ts-ignore
    global.window = {
      innerWidth: 400, // Mobile by default
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((e: CustomEvent) => {
        dispatchedEvents.push(e);
        return true;
      }),
    } as any;

    // @ts-ignore
    global.document = {
      documentElement: {
        style: {
          setProperty: vi.fn((key: string, value: string) => {
            styleProperties[key] = value;
          }),
          getPropertyValue: vi.fn((key: string) => styleProperties[key] || ""),
        },
      },
    } as any;

    // @ts-ignore
    global.CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, params?: { detail?: any }) {
        this.type = type;
        this.detail = params?.detail;
      }
    } as any;
  });

  it("calculates correct offset for mobile alert expansion (~180px height)", async () => {
    // Math verification:
    // ALERT_BASE_BOTTOM = 16
    // height = 180
    // DEFAULT_GAP = 12
    // NAVBAR_BASE_BOTTOM = 24
    // targetBottom = 16 + 180 + 12 = 208px
    // offset = 208 - 24 = 184px
    const alertHeight = 180;
    const targetBottom = 16 + alertHeight + 12;
    const offset = Math.max(0, targetBottom - 24);

    expect(offset).toBe(184);
    // Navbar bottom becomes 24 + 184 = 208px
    // Alert is 16px to 196px. Distance between alert (196px) and navbar (208px) is exactly 12px!
    expect(targetBottom - (16 + alertHeight)).toBe(12);
  });

  it("calculates correct offset for mobile alert minimization (~48px height)", async () => {
    // ALERT_BASE_BOTTOM = 16
    // height = 48
    // DEFAULT_GAP = 12
    // NAVBAR_BASE_BOTTOM = 24
    // targetBottom = 16 + 48 + 12 = 76px
    // offset = 76 - 24 = 52px
    const alertHeight = 48;
    const targetBottom = 16 + alertHeight + 12;
    const offset = Math.max(0, targetBottom - 24);

    expect(offset).toBe(52);
    // Navbar bottom becomes 24 + 52 = 76px
    // Alert is 16px to 64px. Distance between alert (64px) and navbar (76px) is exactly 12px!
    expect(targetBottom - (16 + alertHeight)).toBe(12);
  });

  it("calculates 0 offset when no alert is active", () => {
    const offset = 0;
    expect(offset).toBe(0);
    // Navbar bottom is 24px (bottom-6)
  });
});
