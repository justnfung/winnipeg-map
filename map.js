// Set the default map center and zoom level based on device width
const DEFAULT_CENTER = [49.8951, -97.1384];
const DEFAULT_ZOOM = window.innerWidth <= 1000 ? 15 : 12;

// Initialize the Leaflet map without default zoom controls
const map = L.map("map", { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

const isMobile = window.innerWidth <= 1000;

// Adjust marker icon size and anchor points for mobile vs desktop
const markerSize = isMobile ? [20, 32] : [25, 41];
const shadowSize = isMobile ? [27, 27] : [41, 41];
const iconAnchor = isMobile ? [17, 55] : [12, 41];
const popupAnchor = isMobile ? [1, -40] : [1, -34];

// Load the tile layer from CARTO
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> © OpenStreetMap contributors',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

// Custom icons per resource category
const markerIcons = {
  "Emergency Shelter": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  "Donation Point": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  "Community Event": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  "Animal Shelter": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
};

// Build Leaflet icon objects
const icons = {};
for (const category in markerIcons) {
  icons[category] = L.icon({
    iconUrl: markerIcons[category],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: markerSize,
    iconAnchor: iconAnchor,
    popupAnchor: popupAnchor,
    shadowSize: shadowSize,
  });
}

const listContainer = document.getElementById("resource-list");
let userLocation = null;

// Haversine formula to calculate distance between two lat/lng points in km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Fetch resource data from Google Sheets API wrapper
function fetchResources() {
  fetch("https://opensheet.elk.sh/1saesqAewFioAJss_sjoYfVwYNuTCiWlgSoMWLiYw8WE/Sheet1")
    .then((res) => res.json())
    .then((data) => {
      const grouped = {};

      data.forEach((row) => {
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
                <em>
                  ${row.Category}
                  ${row.Hours ? ` | ${row.Hours}` : ""}
                </em>
              </div>
              ${row.Description ? `<div><b>Description:</b> ${row.Description.replace(/\n/g, '<br>')}</div>` : ""}
              ${(row.Phone || row["Address Link"]) ? `
                <div class="popup-meta">
                  ${row.Phone ? `<a href="tel:${row.Phone.replace(/\D/g, '')}">${row.Phone}</a>` : ""}
                  ${(row.Phone && row["Address Link"]) ? " | " : ""}
                  ${row["Address Link"] || ""}
                </div>` : ""}
            </div>
          `);

          if (!grouped[category])
            grouped[category] = { icon: markerIcon, items: [] };

          const distance = userLocation
            ? getDistanceKm(userLocation[0], userLocation[1], lat, lng)
            : null;

          grouped[category].items.push({
            name: row.Name,
            marker,
            distance,
            address: row["Address"]
          });
        }
      });

      // Insert a tip for the user only if categories exist
      if (listContainer && Object.keys(grouped).length > 0) {
        const tip = document.createElement("div");
        tip.className = "sidebar-tip-top";
        tip.textContent = "Click on any location for more details.";
        listContainer.insertBefore(tip, listContainer.firstChild);
      }

      // Optional custom display order
      const categoryOrder = [
        "Community Event",
        "Donation Point",
        "Emergency Shelter",
        "Animal Shelter"
      ];

      // Sort categories based on predefined order
      const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });

      // Render each category
      for (const [category, group] of sortedEntries) {
        group.items.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        const section = document.createElement("div");
        section.className = "category-section";

        const header = document.createElement("div");
        header.className = `category-header category-${category.replace(/\s+/g, '-').toLowerCase()}`;
        header.innerHTML = `
          <img src="${group.icon}" alt="" class="category-icon">
          <span class="category-title">${category}</span>
          <span class="collapse-toggle">Click to open/collapse</span>
        `;

        const content = document.createElement("div");
        content.className = "category-items collapsed";

        group.items.forEach(({ name, marker, distance, address }) => {
          const listItem = document.createElement("div");
          listItem.className = "list-item";

          listItem.innerHTML = `
            <div class="resource-entry">
              <div class="entry-top">
                <span class="entry-name">${name}</span>
                ${distance != null ? `<span class="entry-distance">${distance.toFixed(1)} km</span>` : ""}
              </div>
              ${address ? `<div class="entry-address">${address}</div>` : "<div class=\"entry-address\">Address unavailable</div>"}
            </div>
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
    });
}

// Handle location prompt and map initialization
// Includes fallback if user denies or device lacks geolocation

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("overlay");
  const enableBtn = document.getElementById("enable-location");
  const declineBtn = document.getElementById("decline-location");

  if (navigator.geolocation) {
    enableBtn.addEventListener("click", () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation = [pos.coords.latitude, pos.coords.longitude];
          const userMarker = L.circleMarker(userLocation, {
            radius: 8,
            fillColor: "#007bff",
            color: "#007bff",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(map).bindPopup("You are here :)");

          overlay.style.display = "none";

          setTimeout(() => {
            map.invalidateSize(); // Force map to re-render properly
            map.setView(userLocation, 13, { animate: true });
            userMarker.openPopup();
            fetchResources();
          }, 300);
        },
        (err) => {
          console.warn("⚠️ Location access denied. Showing unsorted locations.");
          overlay.style.display = "none";
          fetchResources();
        },
        { enableHighAccuracy: true }
      );
    });

    declineBtn.addEventListener("click", () => {
      overlay.style.display = "none";
      fetchResources();
    });
  } else {
    overlay.innerHTML = `<p>Your browser does not support geolocation.</p>`;
    fetchResources();
  }
});

// Manual Zoom In button handler
// Increases zoom by 2 levels (capped to maxZoom)
document.getElementById("zoom-in-btn").addEventListener("click", () => {
  const currentZoom = map.getZoom();
  const newZoom = Math.min(currentZoom + 2, map.getMaxZoom());
  const targetCenter = map.getCenter();
  map.setView(targetCenter, newZoom, { animate: true });
});

// Manual Zoom Out button handler
// Decreases zoom by 2 levels (not below 5)
document.getElementById("zoom-out-btn").addEventListener("click", () => {
  const currentZoom = map.getZoom();
  const newZoom = Math.max(currentZoom - 2, 5);
  const targetCenter = map.getCenter();
  map.setView(targetCenter, newZoom, { animate: true });
});

// Button to recenter map to user's location (if available)
document.getElementById("locate-btn").addEventListener("click", () => {
  if (userLocation) {
    map.setView(userLocation, 15);
  } else {
    alert("Location not available yet.");
  }
});

// Button to trigger email client for contact
// Opens default email app with prefilled subject
document.getElementById("contact-btn").addEventListener("click", () => {
  window.location.href = "mailto:justinfung.ca@gmail.com?subject=Community%20Compass%20Inquiry";
});
