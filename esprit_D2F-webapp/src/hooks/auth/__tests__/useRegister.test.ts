import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { App } from "antd";
import { useRegister } from "@/hooks/auth/useRegister";
import { signup } from "@/services/auth/AuthService";

vi.mock("@/services/auth/AuthService", () => ({
  login: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  signup: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(App, {}, children);

describe("useRegister", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns loading false initially", () => {
    const { result } = renderHook(() => useRegister(), { wrapper });
    expect(result.current.loading).toBe(false);
  });

  it("register calls signup and sets loading false", async () => {
    (signup as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRegister(), { wrapper });
    const ok = await act(async () => result.current.register({
      username: "u", password: "p", confirmPassword: "p", firstName: "A", lastName: "B",
      phoneNumber: "1", email: "a@b.c", confirmEmail: "a@b.c", newsletter: false,
    } as never));
    expect(signup).toHaveBeenCalled();
    expect(ok).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("register returns false on error", async () => {
    (signup as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: "bad" } },
    });
    const { result } = renderHook(() => useRegister(), { wrapper });
    const ok = await act(async () => result.current.register({
      username: "u", password: "p", confirmPassword: "p", firstName: "A", lastName: "B",
      phoneNumber: "1", email: "a@b.c", confirmEmail: "a@b.c", newsletter: false,
    } as never));
    expect(ok).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});
