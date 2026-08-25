// Local-storage backed bookings for bus & flight (no DB table for them).
export type LocalBooking = {
  id: string;
  type: "bus" | "flight";
  pnr: string;
  operator: string; // bus operator / airline name
  subtitle: string; // bus type / flight number
  from: string;
  to: string;
  fromCode?: string;
  toCode?: string;
  date: string; // ISO date
  departure: string;
  arrival: string;
  seat: string;
  passenger: string;
  fare: number;
  status: "CONFIRMED" | "CANCELLED";
  createdAt: string;
  userId: string;
};

const KEY = "railgo.localBookings";

function readAll(): LocalBooking[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(list: LocalBooking[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("railgo:bookings-updated"));
}

export function listLocalBookings(userId: string): LocalBooking[] {
  return readAll().filter((b) => b.userId === userId);
}

export function addLocalBooking(b: Omit<LocalBooking, "id" | "createdAt" | "status"> & { status?: LocalBooking["status"] }): LocalBooking {
  const full: LocalBooking = {
    ...b,
    id: crypto.randomUUID(),
    status: b.status ?? "CONFIRMED",
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.unshift(full);
  writeAll(all);
  return full;
}

export function cancelLocalBooking(id: string) {
  const all = readAll().map((b) => (b.id === id ? { ...b, status: "CANCELLED" as const } : b));
  writeAll(all);
}
