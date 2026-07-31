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

const transportHandlers: {
  onMessage: (msg: Record<string, unknown>) => void;
  onStatus: (s: string) => void;
  onError: () => void;
} = { onMessage: () => {}, onStatus: () => {}, onError: () => {} };

const mockTransport = {
  connect: vi.fn(),
  close: vi.fn(),
};

vi.mock("@/services/notification", () => ({
  createNotificationTransport: vi.fn((_url: string, handlers: typeof transportHandlers) => {
    transportHandlers.onMessage = handlers.onMessage;
    transportHandlers.onStatus = handlers.onStatus;
    transportHandlers.onError = handlers.onError;
    return mockTransport;
  }),
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

  it("connecte le transport au montage", async () => {
    render(
      <NotificationProvider>
        <Capture onCtx={() => {}} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(mockTransport.connect).toHaveBeenCalled();
    expect(createNotificationTransport).toHaveBeenCalled();
  });

  it("reflète le statut du transport via onStatus", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    act(() => { transportHandlers.onStatus("open"); });
    expect((ctx as { status: string }).status).toBe("open");
    act(() => { transportHandlers.onError(); });
    expect((ctx as { status: string }).status).toBe("closed");
  });

  it("ingère une notification entrante via le transport", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    act(() => {
      transportHandlers.onMessage({ id: "ws1", type: "FORMATION", severity: "info", title: "Push", message: "msg", read: false });
    });
    const c = ctx as { notifications: { id: string }[] };
    expect(c.notifications.find((n) => n.id === "ws1")).toBeDefined();
  });

  it("met à jour une notification existante sur message dupliqué", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    act(() => {
      transportHandlers.onMessage({ id: "ws1", type: "FORMATION", severity: "info", title: "Push", message: "msg", read: false });
    });
    act(() => {
      transportHandlers.onMessage({ id: "ws1", type: "FORMATION", severity: "warning", title: "Maj", message: "maj", read: false });
    });
    const c = ctx as { notifications: { id: string; title: string }[] };
    expect(c.notifications.filter((n) => n.id === "ws1")).toHaveLength(1);
    expect(c.notifications[0].title).toBe("Maj");
  });

  it("charge les notifications du backend et calcule le unread count", async () => {
    (notificationService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "b1", read: false, createdAt: new Date().toISOString() },
      { id: "b2", read: true, createdAt: new Date().toISOString() },
    ] as unknown[]);
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const c = ctx as { notifications: { id: string }[]; unreadCount: number };
    expect(c.notifications.find((n) => n.id === "b1")).toBeDefined();
    expect(c.unreadCount).toBe(1);
  });

  it("fusionne backend avec notifications existantes sans doublon", async () => {
    sessionStorage.setItem(
      "d2f_notifications_1",
      JSON.stringify([{ id: "b1", read: false, createdAt: new Date(2020, 1, 1).toISOString() }]),
    );
    (notificationService.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "b1", read: true, createdAt: new Date(2024, 1, 1).toISOString() },
      { id: "b2", read: false, createdAt: new Date(2024, 1, 2).toISOString() },
    ] as unknown[]);
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const c = ctx as { notifications: Array<{ id: string; read: boolean }> };
    expect(c.notifications.filter((n) => n.id === "b1")).toHaveLength(1);
    expect(c.notifications.find((n) => n.id === "b1")?.read).toBe(false);
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

  it("markAsRead ignore un id inexistant", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { (ctx as { markAsRead: (id: string) => void }).markAsRead("nope"); });
    expect(notificationService.markAsRead).toHaveBeenCalledWith("nope");
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

  it("remove ignore un id inexistant", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { (ctx as { remove: (id: string) => void }).remove("nope"); });
    expect(notificationService.remove).toHaveBeenCalledWith("nope");
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

  it("addNotification sans recipient prépend une notification", async () => {
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

  it("addNotification avec recipient appelle le service create", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => {
      (ctx as { addNotification: (p: Record<string, unknown>) => void }).addNotification({
        recipient: "u", title: "T", message: "M", type: "FORMATION", severity: "info",
      });
    });
    expect(notificationService.create).toHaveBeenCalled();
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  });

  it("addNotification avec recipient fait un fallback local si create échoue", async () => {
    (notificationService.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("no rights"));
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => {
      (ctx as { addNotification: (p: Record<string, unknown>) => void }).addNotification({
        recipient: "u", title: "Fallback", message: "M", type: "FORMATION", severity: "info",
      });
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const c = ctx as { notifications: { title: string }[] };
    expect(c.notifications[0].title).toBe("Fallback");
  });

  it("persiste les notifications dans sessionStorage", async () => {
    let ctx: unknown;
    render(
      <NotificationProvider>
        <Capture onCtx={(c) => (ctx = c)} />
      </NotificationProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => {
      (ctx as { addNotification: (p: Record<string, unknown>) => void }).addNotification({
        title: "Persist", message: "M", type: "INFO", severity: "INFO",
      });
    });
    expect(sessionStorage.getItem("d2f_notifications_1")).toContain("Persist");
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
