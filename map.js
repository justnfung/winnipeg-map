// Enhanced map.js with user location + distance-based sorting
const isMobile = window.innerWidth <= 1000;
const initialZoom = isMobile ? 15 : 12;

const map = L.map('map').setView([49.8951, -97.1384], initialZoom);

const markerSize = isMobile ? [35, 55] : [25, 41];
const shadowSize = isMobile ? [50, 50] : [41, 41];
const iconAnchor = isMobile ? [17, 55] : [12, 41];
const popupAnchor = isMobile ? [1, -40] : [1, -34];

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> © OpenStreetMap contributors',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

const markerIcons = {
  "Emergency Shelter": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  "Donation Point": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  "Medical Aid": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  "Animal Shelter": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  "Info Station": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png"
};

const icons = {};
for (const category in markerIcons) {
  icons[category] = L.icon({
    iconUrl: markerIcons[category],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: markerSize,
    iconAnchor: iconAnchor,
    popupAnchor: popupAnchor,
    shadowSize: shadowSize
  });
}

const listContainer = document.getElementById("resource-list");
let userLocation = null;

navigator.geolocation.getCurrentPosition(
  (pos) => {
    userLocation = [pos.coords.latitude, pos.coords.longitude];
    const userMarker = L.circleMarker(userLocation, {
      radius: 8,
      fillColor: "#007bff",
      color: "#007bff",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map).bindPopup("You are here");
  },
  (err) => console.warn("Location access denied or unavailable."),
  { enableHighAccuracy: true }
);

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

fetch("https://opensheet.elk.sh/1saesqAewFioAJss_sjoYfVwYNuTCiWlgSoMWLiYw8WE/Sheet1")
  .then(res => res.json())
  .then(data => {
    const grouped = {};
    data.forEach(row => {
      const lat = parseFloat(row.Latitude);
      const lng = parseFloat(row.Longitude);
      const category = row.Category || "Uncategorized";
      const icon = icons[category] || icons["Emergency Shelter"];
      const markerIcon = markerIcons[category] || markerIcons["Emergency Shelter"];
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
          <div class="popup-content">
            <div class="popup-header">
              <strong>${row.Name}</strong><br>
              <em>${row.Category}</em>
            </div>
            ${row.Hours ? `<div><b>Hours:</b> ${row.Hours}</div>` : ""}
            ${row.Description ? `<div><b>Description:</b> ${row.Description}</div>` : ""}
            ${row["Address Link"] ? `<div><b>Address:</b> ${row["Address Link"]}</div>` : ""}
            ${row.Phone ? `<div><b>Phone:</b> ${row.Phone}</div>` : ""}
          </div>
        `);
        if (isMobile && listContainer) {
          const dist = userLocation ? getDistanceKm(userLocation[0], userLocation[1], lat, lng) : null;
          if (!grouped[category]) grouped[category] = { icon: markerIcon, items: [] };
          grouped[category].items.push({ name: row.Name, marker, distance: dist });
        }
      }
    });

    if (isMobile && listContainer) {
      for (const [category, group] of Object.entries(grouped)) {
        group.items.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        const section = document.createElement("div");
        section.className = "category-section";

        const header = document.createElement("div");
        header.className = "category-header";
        header.innerHTML = `
          <img src="${group.icon}" alt="" class="category-icon">
          <span>${category}</span>
          <span style="margin-left:auto;font-size:16px;color:#003366;">Tap to collapse</span>
        `;

        const content = document.createElement("div");
        content.className = "category-items";

        group.items.forEach(({ name, marker, distance }) => {
          const listItem = document.createElement("div");
          listItem.className = "list-item";
          listItem.innerHTML = `
            <strong>${name}</strong>
            ${distance != null ? `<span style="float:right;color:#888;font-size:13px;">${distance.toFixed(1)} km</span>` : ""}
          `;
          listItem.addEventListener("click", () => {
            map.setView(marker.getLatLng(), 17);
            marker.openPopup();
          });
          content.appendChild(listItem);
        });

        header.addEventListener("click", () => content.classList.toggle("collapsed"));

        section.appendChild(header);
        section.appendChild(content);
        listContainer.appendChild(section);
      }
    }
  });
