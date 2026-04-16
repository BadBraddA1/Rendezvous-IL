// Geocode all family addresses to get exact coordinates

const addresses = [
  { id: 20, lastName: "Bradd", address: "8754 Sunset Rd, Clinton, IL 61727" },
  { id: 22, lastName: "Bradd", address: "3820 Treebrook Dr, Imperial, MO 63052" },
  { id: 44, lastName: "Bradd", address: "1139 Highway 367 N, Judsonia, AR 72081" },
  { id: 39, lastName: "Bryan", address: "12829 Torre Pines Ln, Yukon, OK 73099" },
  { id: 28, lastName: "Collins", address: "42 Bogart Drive, Petersburg, WV 26847" },
  { id: 41, lastName: "Cozort", address: "246 Funderburk Ln, Tallassee, AL 36078" },
  { id: 30, lastName: "Cozort", address: "315 Southwick Drive, Southaven, MS 38671" },
  { id: 27, lastName: "Cozort", address: "31303 E Colburn Rd, Grain Valley, MO 64029" },
  { id: 35, lastName: "English", address: "406 Cedar Dr, Clinton, IL 61727" },
  { id: 42, lastName: "Fahrenwald", address: "1139 Hwy 367N, Judsonia, AR 72081" },
  { id: 29, lastName: "Ferrell", address: "4934 Rowsey Crossing Dr, Hernando, MS 38632" },
  { id: 38, lastName: "Floyd", address: "1138 Shaftsbury Hollow Rd, North Bennington, VT 05257" },
  { id: 48, lastName: "Green", address: "4524 Vermilion Trail, Gilbert, MN 55741" },
  { id: 50, lastName: "Haley", address: "258 W Main St, Alexandria, OH 43001" },
  { id: 43, lastName: "Hanes", address: "303 N Sycamore St, Maroa, IL 61756" },
  { id: 34, lastName: "Manning", address: "422 N West St, Somerville, TN 38068" },
  { id: 33, lastName: "Meacham", address: "1544 Prehistoric Hill Dr, Imperial, MO 63052" },
  { id: 49, lastName: "Middlebrooks", address: "122 Mattie Ln, Flintstone, GA 30725" },
  { id: 45, lastName: "Morris", address: "431 Union Academy Rd, Livingston, TN 38570" },
  { id: 36, lastName: "Nix", address: "10770 US-36, Bradford, OH 45308" },
  { id: 32, lastName: "Parish", address: "211 N 5th St, Marlow, OK 73055" },
  { id: 46, lastName: "Pasley", address: "361 Huckleberry Lane, Mineral Bluff, GA 30559" },
  { id: 26, lastName: "Smith", address: "45 Carrousel Dr, Troy, OH 45373" },
  { id: 40, lastName: "Steele", address: "203 W Wayne St, Paulding, OH 45879" },
  { id: 25, lastName: "Valentin", address: "3306 Christopher Lane, Johnsburg, IL 60051" },
  { id: 37, lastName: "Watson", address: "1260 N 1600 East Rd, Taylorville, IL 62568" },
  { id: 31, lastName: "Zamfir", address: "2060 Ware Rd, Tallassee, AL 36078" },
];

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RendezvousIL-Map/1.0'
    }
  });
  
  const data = await response.json();
  
  if (data && data[0]) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }
  return null;
}

async function main() {
  console.log("Geocoding addresses...\n");
  
  const results = [];
  
  for (const item of addresses) {
    // Nominatim requires 1 second delay between requests
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const coords = await geocodeAddress(item.address);
    
    if (coords) {
      console.log(`${item.lastName} (${item.id}): ${coords.lat}, ${coords.lng}`);
      results.push({ ...item, ...coords });
    } else {
      console.log(`${item.lastName} (${item.id}): FAILED to geocode`);
      results.push({ ...item, lat: null, lng: null });
    }
  }
  
  console.log("\n\n=== RESULTS FOR CODE ===\n");
  
  for (const r of results) {
    if (r.lat && r.lng) {
      console.log(`  // ${r.lastName} - ${r.address}`);
      console.log(`  { id: ${r.id}, lat: ${r.lat}, lng: ${r.lng} },`);
    }
  }
}

main();
