import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { App } from "antd";
import useToast from "@/hooks/useToast";

describe("useToast", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(App, {}, children);

  it("returns success/error/warning/info functions", () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.success).toBe("function");
    expect(typeof result.current.error).toBe("function");
    expect(typeof result.current.warning).toBe("function");
    expect(typeof result.current.info).toBe("function");
  });

  it("success toast calls notification.success", () => {
    const successSpy = vi.fn();
    vi.spyOn(App, "useApp").mockReturnValue({
      notification: { success: successSpy, error: vi.fn(), warning: vi.fn(), info: vi.fn(), open: vi.fn() },
      message: { success: vi.fn() },
      modal: {} as never,
    } as never);
    const { result } = renderHook(() => useToast(), { wrapper });
    result.current.success("Hello", { description: "d", duration: 7 });
    expect(successSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Hello", description: "d", duration: 7, placement: "bottomRight" }),
    );
  });
});
