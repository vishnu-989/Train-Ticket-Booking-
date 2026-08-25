export type Airport = { code: string; name: string; city: string };

export const AIRPORTS: Airport[] = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi Intl" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Intl" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda Intl" },
  { code: "MAA", city: "Chennai", name: "Chennai Intl" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi Intl" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose" },
  { code: "COK", city: "Kochi", name: "Cochin Intl" },
  { code: "GOI", city: "Goa", name: "Dabolim" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel" },
  { code: "PNQ", city: "Pune", name: "Pune Airport" },
  { code: "JAI", city: "Jaipur", name: "Jaipur Intl" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh" },
  { code: "PAT", city: "Patna", name: "Jay Prakash Narayan" },
  { code: "IXC", city: "Chandigarh", name: "Chandigarh Intl" },
  { code: "TRV", city: "Trivandrum", name: "Trivandrum Intl" },
  { code: "GAU", city: "Guwahati", name: "LGB Intl" },
  { code: "SXR", city: "Srinagar", name: "Srinagar Intl" },
  { code: "IDR", city: "Indore", name: "Devi Ahilyabai Holkar" },
  { code: "NAG", city: "Nagpur", name: "Dr. Babasaheb Ambedkar" },
  { code: "VTZ", city: "Visakhapatnam", name: "Visakhapatnam Intl" },
];

type Airline = { code: string; name: string };
const AIRLINES: Airline[] = [
  { code: "6E", name: "IndiGo" },
  { code: "AI", name: "Air India" },
  { code: "UK", name: "Vistara" },
  { code: "SG", name: "SpiceJet" },
  { code: "QP", name: "Akasa Air" },
  { code: "I5", name: "Air India Express" },
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export type FlightResult = {
  id: string;
  airline: string;
  airlineCode: string;
  flightNo: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  fare: number;
  seatsLeft: number;
};

export function searchFlights(from: string, to: string): FlightResult[] {
  if (!from || !to || from === to) return [];
  const seed = hash(from + to);
  return AIRLINES.map((a, i) => {
    const dh = (5 + ((seed + i * 17) % 17));
    const durH = 1 + ((seed + i * 7) % 4);
    const durM = (seed + i * 13) % 60;
    const ah = (dh + durH) % 24;
    const am = ((seed * 7 + i * 11) % 60);
    const stops = i % 3 === 0 ? 1 : 0;
    return {
      id: `${from}-${to}-${a.code}-${i}`,
      airline: a.name,
      airlineCode: a.code,
      flightNo: `${a.code} ${100 + ((seed + i * 19) % 899)}`,
      departure: `${String(dh).padStart(2, "0")}:${String((i * 15) % 60).padStart(2, "0")}`,
      arrival: `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`,
      duration: `${durH + stops}h ${durM}m`,
      stops,
      fare: 2800 + ((seed + i * 137) % 6500),
      seatsLeft: 3 + ((seed + i * 23) % 25),
    };
  });
}

export function generateFlightPNR() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 6; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}
