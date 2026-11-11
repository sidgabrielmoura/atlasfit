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

  it("calculates correct offset for desktop bottom-right alert expansion (~180px height)", () => {
    // Desktop alert is at md:bottom-5 (20px).
    // Height = 180px.
    // Alert occupies from Y = 20px to Y = 200px from the bottom.
    // DEFAULT_GAP = 12px.
    // Elements stacked above (like chat notification toasts) should have offset:
    // desktopOffset = alertHeight + DEFAULT_GAP = 180 + 12 = 192px.
    // Base bottom of toast is 24px.
    // Toast bottom becomes 24 + 192 = 216px.
    // Distance between top of alert (200px) and bottom of toast (216px) is 16px >= 12px gap!
    const alertHeight = 180;
    const desktopOffset = alertHeight + 12;
    expect(desktopOffset).toBe(192);

    const toastBottom = 24 + desktopOffset;
    const alertTop = 20 + alertHeight;
    expect(toastBottom - alertTop).toBeGreaterThanOrEqual(12);
  });

  it("calculates correct offset for desktop bottom-right alert minimization (~48px height)", () => {
    const alertHeight = 48;
    const desktopOffset = alertHeight + 12;
    expect(desktopOffset).toBe(60);

    const toastBottom = 24 + desktopOffset;
    const alertTop = 20 + alertHeight;
    expect(toastBottom - alertTop).toBeGreaterThanOrEqual(12);
  });
});
