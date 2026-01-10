/**
 * Route Generation Utility
 * Generates realistic mock routes between source and destination coordinates
 */

// Major Indian cities with coordinates
const CITY_COORDINATES = {
  // Metro cities
  'mumbai': [19.0760, 72.8777],
  'delhi': [28.7041, 77.1025],
  'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946],
  'hyderabad': [17.3850, 78.4867],
  'chennai': [13.0827, 80.2707],
  'kolkata': [22.5726, 88.3639],
  'pune': [18.5204, 73.8567],
  'ahmedabad': [23.0225, 72.5714],
  'jaipur': [26.9124, 75.7873],

  // Tier 2 cities
  'surat': [21.1702, 72.8311],
  'lucknow': [26.8467, 80.9462],
  'kanpur': [26.4499, 80.3319],
  'nagpur': [21.1458, 79.0882],
  'indore': [22.7196, 75.8577],
  'thane': [19.2183, 72.9781],
  'bhopal': [23.2599, 77.4126],
  'visakhapatnam': [17.6868, 83.2185],
  'pimpri-chinchwad': [18.6298, 73.7997],
  'patna': [25.5941, 85.1376],
  'vadodara': [22.3072, 73.1812],
  'ghaziabad': [28.6692, 77.4538],
  'ludhiana': [30.9010, 75.8573],
  'agra': [27.1767, 78.0081],
  'nashik': [19.9975, 73.7898],
  'faridabad': [28.4089, 77.3178],
  'meerut': [28.9845, 77.7064],
  'rajkot': [22.3039, 70.8022],
  'varanasi': [25.3176, 82.9739],
  'srinagar': [34.0837, 74.7973],
  'amritsar': [31.6340, 74.8723],
  'allahabad': [25.4358, 81.8463],
  'prayagraj': [25.4358, 81.8463],
  'ranchi': [23.3441, 85.3096],
  'howrah': [22.5958, 88.2636],
  'coimbatore': [11.0168, 76.9558],
  'jabalpur': [23.1815, 79.9864],
  'gwalior': [26.2183, 78.1828],
  'vijayawada': [16.5062, 80.6480],
  'jodhpur': [26.2389, 73.0243],
  'madurai': [9.9252, 78.1198],
  'raipur': [21.2514, 81.6296],
  'kota': [25.2138, 75.8648],
};

/**
 * Normalize city name for lookup
 */
function normalizeCityName(cityName) {
  return cityName.toLowerCase().trim().replace(/[^a-z]/g, '');
}

/**
 * Get coordinates for a city name
 * Returns approximate coordinates if exact match not found
 */
function getCityCoordinates(cityName) {
  const normalized = normalizeCityName(cityName);

  // Try exact match
  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized];
  }

  // Try partial match
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (city.includes(normalized) || normalized.includes(city)) {
      return coords;
    }
  }

  // Default to Mumbai if no match found
  console.warn(`City "${cityName}" not found in coordinates database, using Mumbai as default`);
  return CITY_COORDINATES.mumbai;
}

/**
 * Generate waypoints between two coordinates
 * Creates realistic curved path with slight variations
 */
function generateWaypoints(start, end, numWaypoints = 12) {
  const waypoints = [start];

  const [startLat, startLng] = start;
  const [endLat, endLng] = end;

  const latDiff = endLat - startLat;
  const lngDiff = endLng - startLng;

  // Calculate perpendicular direction for curve
  const perpLat = -lngDiff;
  const perpLng = latDiff;
  const perpMagnitude = Math.sqrt(perpLat * perpLat + perpLng * perpLng);

  for (let i = 1; i < numWaypoints - 1; i++) {
    const t = i / (numWaypoints - 1);

    // Linear interpolation
    let lat = startLat + latDiff * t;
    let lng = startLng + lngDiff * t;

    // Add curve (parabolic)
    const curveIntensity = 0.15; // 15% deviation at peak
    const curveFactor = 4 * t * (1 - t) * curveIntensity; // Peaks at t=0.5

    if (perpMagnitude > 0) {
      lat += (perpLat / perpMagnitude) * latDiff * curveFactor;
      lng += (perpLng / perpMagnitude) * lngDiff * curveFactor;
    }

    // Add small random variations for realism
    const randomVariation = 0.02;
    lat += (Math.random() - 0.5) * Math.abs(latDiff) * randomVariation;
    lng += (Math.random() - 0.5) * Math.abs(lngDiff) * randomVariation;

    waypoints.push([
      parseFloat(lat.toFixed(4)),
      parseFloat(lng.toFixed(4))
    ]);
  }

  waypoints.push(end);
  return waypoints;
}

/**
 * Calculate approximate distance between two coordinates (in km)
 * Using Haversine formula
 */
function calculateDistance(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

/**
 * Generate a complete mock route for a shipment
 */
export function generateMockRoute(source, destination) {
  const sourceCoords = getCityCoordinates(source);
  const destCoords = getCityCoordinates(destination);

  const distance = calculateDistance(sourceCoords, destCoords);

  // Adjust number of waypoints based on distance
  let numWaypoints = 12;
  if (distance < 100) {
    numWaypoints = 8;
  } else if (distance > 500) {
    numWaypoints = 15;
  }

  const waypoints = generateWaypoints(sourceCoords, destCoords, numWaypoints);

  return {
    waypoints,
    metadata: {
      distance: `${distance} km`,
      estimatedWaypoints: waypoints.length,
      sourceCoords,
      destCoords,
      generatedAt: new Date()
    }
  };
}

export default generateMockRoute;
