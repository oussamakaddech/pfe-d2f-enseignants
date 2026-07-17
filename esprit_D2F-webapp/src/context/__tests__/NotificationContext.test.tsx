import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import NotificationProvider from "@/context/NotificationContext";
import { useNotifications } from "@/hooks/notification/useNotifications";
import { useAuth } from "@/hooks/auth/useAuth";
import { notificationService } from "@/services/notification/notificationService";
import { createNotificationTransport } from "@/services/notification";

vi.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({ user: { userId: 1, username: "u" } }),
}));

vi.mock("@/services/notification/notificationService", () => ({
  notificationService: {
    list: vi.fn(() => Promise.resolve([])),
    markAsRead: vi.fn(() => Promise.resolve()),
    markAllAsRead: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    clearAll: vi.fn(() => Promise.resolve()),
    create: vi.fn(() => Promise.resolve()),
  },
}));

const mockTransport = {
  connect: vi.fn(),
  close: vi.fn(),
};

vi.mock("@/services/notification", () => ({
  createNotificationTransport: vi.fn(() => mockTransport),
}));

const Capture = ({ onCtx }: { onCtx: (c: unknown) => void }) => {
  onCtx(useNotifications());
  return null;
};

describe("NotificationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    (notificationService.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("provides an empty notifications list initially", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const c = ctx as { notifications: unknown[]; unreadCount: number; status: string };
    expect(c.notifications).toEqual([]);
    expect(c.unreadCount).toBe(0);
  });

  it("markAsRead updates local state and calls service", async () => {
    sessionStorage.setItem(
      "d2f_notifications_1",
      JSON.stringify([{ id: "n1", read: false, createdAt: new Date().toISOString() }]),
    );
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { (ctx as { markAsRead: (id: string) => void }).markAsRead("n1"); });
    const c = ctx as { notifications: { id: string; read: boolean }[] };
    expect(c.notifications.find((n) => n.id === "n1")?.read).toBe(true);
    expect(notificationService.markAsRead).toHaveBeenCalledWith("n1");
  });

  it("markAllAsRead marks every notification read", async () => {
    sessionStorage.setItem(
      "d2f_notifications_1",
      JSON.stringify([
        { id: "n1", read: false, createdAt: new Date().toISOString() },
        { id: "n2", read: false, createdAt: new Date().toISOString() },
      ]),
    );
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { (ctx as { markAllAsRead: () => void }).markAllAsRead(); });
    const c = ctx as { notifications: { read: boolean }[] };
    expect(c.notifications.every((n) => n.read)).toBe(true);
    expect(notificationService.markAllAsRead).toHaveBeenCalled();
  });

  it("remove deletes a notification", async () => {
    sessionStorage.setItem(
      "d2f_notifications_1",
      JSON.stringify([{ id: "n1", read: false, createdAt: new Date().toISOString() }]),
    );
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { (ctx as { remove: (id: string) => void }).remove("n1"); });
    const c = ctx as { notifications: { id: string }[] };
    expect(c.notifications.find((n) => n.id === "n1")).toBeUndefined();
    expect(notificationService.remove).toHaveBeenCalledWith("n1");
  });

  it("clearAll empties the list", async () => {
    sessionStorage.setItem(
      "d2f_notifications_1",
      JSON.stringify([{ id: "n1", read: false, createdAt: new Date().toISOString() }]),
    );
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { (ctx as { clearAll: () => void }).clearAll(); });
    const c = ctx as { notifications: unknown[] };
    expect(c.notifications).toEqual([]);
    expect(notificationService.clearAll).toHaveBeenCalled();
  });

  it("addNotification without recipient prepends a notification", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => {
      (ctx as { addNotification: (p: Record<string, unknown>) => void }).addNotification({
        title: "T", message: "M", type: "INFO", severity: "INFO",
      });
    });
    const c = ctx as { notifications: { title: string }[] };
    expect(c.notifications[0].title).toBe("T");
  });

  it("useNotifications throws outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<NoProvider />)).toThrow(/useNotifications must be used within a NotificationProvider/);
    spy.mockRestore();
  });
});

function NoProvider() {
  useNotifications();
  return null;
}
