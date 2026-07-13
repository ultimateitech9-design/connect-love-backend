"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "distanceBetweenKm", {
    enumerable: true,
    get: function() {
        return distanceBetweenKm;
    }
});
const EARTH_RADIUS_KM = 6371.0088;
function validCoordinate(latitude, longitude) {
    return typeof latitude === 'number' && Number.isFinite(latitude) && typeof longitude === 'number' && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
function distanceBetweenKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
    if (!validCoordinate(fromLatitude, fromLongitude) || !validCoordinate(toLatitude, toLongitude)) return null;
    const fromLat = fromLatitude;
    const fromLon = fromLongitude;
    const toLat = toLatitude;
    const toLon = toLongitude;
    const radians = (value)=>value * Math.PI / 180;
    const latDelta = radians(toLat - fromLat);
    const lonDelta = radians(toLon - fromLon);
    const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lonDelta / 2) ** 2;
    const distance = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(distance * 1000) / 1000;
}

//# sourceMappingURL=distance.js.map