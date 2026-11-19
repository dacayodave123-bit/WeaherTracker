

// ==========================================
// 1. INITIALIZE MAP
// ==========================================

const locationDropdown = document.getElementById("location");

const initialCoords = locationDropdown.value.split(",").map(Number);

const map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true
}).setView(initialCoords, 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);

L.control.scale().addTo(map);


// ==========================================
// 2. CANDIDATE SOLAR DRYING LOCATIONS
// ==========================================   

const locations = [
    { name: "General Santos", lat: 6.1164, lng: 125.1716 },
    { name: "Koronadal", lat: 6.5029, lng: 124.8467 },
    { name: "Kidapawan", lat: 7.0083, lng: 125.0894 },
    { name: "Davao City", lat: 7.1907, lng: 125.4553 },
    { name: "Mati City", lat: 6.9549, lng: 126.2166 },
    { name: "Butuan City", lat: 8.9475, lng: 125.5406 },
    { name: "Malaybalay", lat: 8.1575, lng: 125.1278 },
    { name: "Cagayan de Oro", lat: 8.4542, lng: 124.6319 },
    { name: "Zamboanga City", lat: 6.9214, lng: 122.0790 }
];


// ==========================================
// 3. CREATE MAP MARKERS
// ==========================================

const locationMarkers = {};

document.getElementById("locationCount").textContent =
    locations.length;

locations.forEach(place => {

    const marker = L.marker([
        place.lat,
        place.lng
    ]).addTo(map);

    marker.bindPopup(`
        <b>${place.name}</b><br>
        Candidate Solar Drying Location<br><br>
        <button onclick="selectLocation('${place.name}')">
            Analyze Location
        </button>
    `);

    locationMarkers[place.name] = marker;

});


// ==========================================
// 4. SELECT LOCATION
// ==========================================

function selectLocation(name) {

    const place = locations.find(
        item => item.name === name
    );

    if (!place) return;

    locationDropdown.value =
        `${place.lat},${place.lng}`;

    map.flyTo(
        [place.lat, place.lng],
        17,
        {
            animate: true,
            duration: 1.5
        }
    );

    locationMarkers[name].openPopup();

    getWeather();
    getForecast();
}


// ==========================================
// 5. DROPDOWN LOCATION CHANGE
// ==========================================

locationDropdown.addEventListener("change", function() {

    const coords = this.value.split(",").map(Number);

    const lat = coords[0];
    const lng = coords[1];

    const place = locations.find(item =>
        item.lat === lat && item.lng === lng
    );

    if (!place) return;

    map.flyTo(
        [lat, lng],
        17,
        {
            animate: true,
            duration: 1.5
        }
    );

    locationMarkers[place.name].openPopup();

    getWeather();
    getForecast();

});


// ==========================================
// 6. GET CURRENT WEATHER
// ==========================================

async function getWeather() {

    const coords = locationDropdown.value.split(",").map(Number);

    const lat = coords[0];
    const lng = coords[1];

    try {

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&hourly=shortwave_radiation&timezone=Asia%2FManila`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to retrieve weather data.");
        }

        const data = await response.json();

        const weather = {
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m,
            rain: data.current.precipitation,
            wind: data.current.wind_speed_10m,
            solar: data.hourly.shortwave_radiation[0],
            condition: data.current.weather_code
        };

        document.getElementById("temperature").textContent =
            weather.temperature + " °C";

        document.getElementById("humidity").textContent =
            weather.humidity + " %";

        document.getElementById("rainfall").textContent =
            weather.rain + " mm";

        document.getElementById("wind").textContent =
            weather.wind + " km/h";

        document.getElementById("solar").textContent =
            weather.solar + " W/m²";

        calculateSuitability(weather);

    } catch (error) {

        console.error("Weather Error:", error);

    }
}


// ==========================================
// 7. CALCULATE SOLAR DRYING SUITABILITY
// ==========================================

function calculateSuitability(w) {

    const clamp = (value, min, max) =>
        Math.max(min, Math.min(max, value));

    const solarScore = clamp(
        (w.solar / 800) * 100, 0, 100
    );

    const humidityScore = clamp(
        ((85 - w.humidity) / 35) * 100, 0, 100
    );

    const rainScore = clamp(
        100 - w.rain, 0, 100
    );

    const temperatureScore = clamp(
        100 - Math.abs(w.temperature - 32) * 5, 0, 100
    );

    const windScore = clamp(
        100 - Math.abs(w.wind - 10) * 5, 0, 100
    );

    const totalScore =
        (solarScore * 0.30) +
        (humidityScore * 0.20) +
        (rainScore * 0.25) +
        (temperatureScore * 0.15) +
        (windScore * 0.10);

    let result;

    if (totalScore >= 80) {
        result = "Highly Favorable";
    } else if (totalScore >= 60) {
        result = "Moderately Favorable";
    } else if (totalScore >= 40) {
        result = "Marginally Favorable";
    } else {
        result = "Unfavorable";
    }

    document.getElementById("suitabilityScore").textContent =
        totalScore.toFixed(1) + " / 100";

    document.getElementById("suitabilityResult").textContent =
        result;
}


// ==========================================
// 8. GET 7-DAY WEATHER FORECAST
// ==========================================

async function getForecast() {

    const coords = locationDropdown.value.split(",").map(Number);


// ==========================================
// 9. WEATHER CONDITION
// ==========================================

function getWeatherCondition(code) {

    if (code === 0) return ["☀️", "Clear"];
    if (code === 1 || code === 2) return ["🌤️", "Partly Cloudy"];
    if (code === 3) return ["☁️", "Cloudy"];
    if (code === 45 || code === 48) return ["🌫️", "Fog"];

    if ([51, 53, 55, 56, 57].includes(code))
        return ["🌦️", "Drizzle"];

    if ([61, 63, 65, 66, 67].includes(code))
        return ["🌧️", "Rain"];

    if ([71, 73, 75, 77].includes(code))
        return ["❄️", "Snow"];

    if ([80, 81, 82].includes(code))
        return ["🌧️", "Rain Showers"];

    if ([85, 86].includes(code))
        return ["🌨️", "Snow Showers"];

    if ([95, 96, 99].includes(code))
        return ["⛈️", "Thunderstorm"];

    return ["🌤️", "Unknown"];
}


// ==========================================
// 10. DISPLAY 7-DAY FORECAST
// ==========================================

function displayForecast(daily) {

    const container = document.getElementById("forecastContainer");

    container.innerHTML = "";

    daily.time.forEach((date, index) => {

        const condition = getWeatherCondition(
            daily.weather_code[index]
        );

        const dateText = new Date(date + "T12:00:00")
            .toLocaleDateString("en-PH", {
                weekday: "short",
                month: "short",
                day: "numeric"
            });

        const maxTemp = daily.temperature_2m_max[index];
        const minTemp = daily.temperature_2m_min[index];

        const rainChance =
            daily.precipitation_probability_max[index];

        const forecastDay = document.createElement("div");

        forecastDay.className = "forecast-day";

        forecastDay.innerHTML = `
            <span class="day">${dateText}</span>

            <span class="icon" title="${condition[1]}">
                ${condition[0]}
            </span>

            <span class="temp">
                ${Math.round(maxTemp)}° / ${Math.round(minTemp)}°
            </span>
        `;

        forecastDay.title =
            `${condition[1]} | Rain probability: ${rainChance ?? "N/A"}%`;

        container.appendChild(forecastDay);

    });

}


// ==========================================
// 11. LOAD INITIAL DATA
// ==========================================

map.setView(initialCoords, 12);

getWeather();
getForecast();
};