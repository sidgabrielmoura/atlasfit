import { describe, expect, it, vi } from "vitest";
import * as outboxModule from "../delivery/outbox";
import { triggerOutboxProcessing } from "../delivery/worker";

describe("triggerOutboxProcessing (Reactive Outbox Drain)", () => {
  it("triggers processDeliveryBatch asynchronously without throwing", async () => {
    const spy = vi.spyOn(outboxModule, "processDeliveryBatch").mockResolvedValue({
      results: [],
      hasMore: false
    });

    triggerOutboxProcessing();

    // Allow setImmediate / microtasks to run
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("handles consecutive triggers gracefully using the draining flag", async () => {
    let callCount = 0;
    const spy = vi.spyOn(outboxModule, "processDeliveryBatch").mockImplementation(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 30));
      return { results: [], hasMore: false };
    });

    // Trigger multiple times rapidly
    triggerOutboxProcessing();
    triggerOutboxProcessing();
    triggerOutboxProcessing();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not launch 3 parallel full runs
    expect(callCount).toBeLessThanOrEqual(2);
    spy.mockRestore();
  });
});
