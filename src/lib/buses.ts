export type BusCity = { code: string; name: string };

export const BUS_CITIES: BusCity[] = [
  { code: "DEL", name: "Delhi" },
  { code: "BOM", name: "Mumbai" },
  { code: "BLR", name: "Bengaluru" },
  { code: "MAA", name: "Chennai" },
  { code: "HYD", name: "Hyderabad" },
  { code: "PUN", name: "Pune" },
  { code: "JAI", name: "Jaipur" },
  { code: "AMD", name: "Ahmedabad" },
  { code: "LKO", name: "Lucknow" },
  { code: "CCU", name: "Kolkata" },
  { code: "GOI", name: "Goa" },
  { code: "IDR", name: "Indore" },
  { code: "BPL", name: "Bhopal" },
  { code: "NAG", name: "Nagpur" },
  { code: "CJB", name: "Coimbatore" },
  { code: "COK", name: "Kochi" },
  { code: "TRV", name: "Trivandrum" },
  { code: "VTZ", name: "Visakhapatnam" },
  { code: "PAT", name: "Patna" },
  { code: "CDG", name: "Chandigarh" },
  { code: "DED", name: "Dehradun" },
  { code: "AGR", name: "Agra" },
  { code: "VNS", name: "Varanasi" },
  { code: "MYS", name: "Mysuru" },
  { code: "MNG", name: "Mangaluru" },
  { code: "UDR", name: "Udaipur" },
];

export type BusOperator = {
  name: string;
  type: "AC Sleeper" | "Non-AC Sleeper" | "AC Seater" | "Volvo Multi-Axle" | "Mercedes Multi-Axle";
  rating: number;
};

const OPERATORS: BusOperator[] = [
  { name: "VRL Travels", type: "AC Sleeper", rating: 4.3 },
  { name: "SRS Travels", type: "Volvo Multi-Axle", rating: 4.1 },
  { name: "Orange Tours", type: "AC Sleeper", rating: 4.4 },
  { name: "Kallada Travels", type: "Mercedes Multi-Axle", rating: 4.5 },
  { name: "Neeta Travels", type: "Non-AC Sleeper", rating: 3.9 },
  { name: "Patel Tours", type: "AC Seater", rating: 4.0 },
  { name: "RedBus Express", type: "Volvo Multi-Axle", rating: 4.2 },
  { name: "Parveen Travels", type: "AC Sleeper", rating: 4.3 },
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export type BusResult = {
  id: string;
  operator: string;
  type: string;
  rating: number;
  departure: string;
  arrival: string;
  duration: string;
  fare: number;
  seatsLeft: number;
};

export function searchBuses(from: string, to: string): BusResult[] {
  if (!from || !to || from === to) return [];
  const seed = hash(from + to);
  return OPERATORS.map((op, i) => {
    const h = (seed + i * 97) % 24;
    const dh = (h % 18) + 5;
    const durH = 6 + ((seed + i) % 12);
    const ah = (dh + durH) % 24;
    return {
      id: `${from}-${to}-${i}`,
      operator: op.name,
      type: op.type,
      rating: op.rating,
      departure: `${String(dh).padStart(2, "0")}:${i % 2 === 0 ? "30" : "00"}`,
      arrival: `${String(ah).padStart(2, "0")}:${i % 2 === 0 ? "15" : "45"}`,
      duration: `${durH}h ${(seed + i) % 60}m`,
      fare: 500 + ((seed + i * 53) % 1800),
      seatsLeft: 4 + ((seed + i * 11) % 35),
    };
  });
}

export function generateBusPNR() {
  return "BUS" + Math.floor(100000 + Math.random() * 900000);
}
