const DEFAULT_CENTER = [49.8951, -97.1384];
const DEFAULT_ZOOM = window.innerWidth <= 1000 ? 15 : 12;

const map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);

const isMobile = window.innerWidth <= 1000;


const markerSize = isMobile ? [35, 55] : [25, 41];
const shadowSize = isMobile ? [50, 50] : [41, 41];
const iconAnchor = isMobile ? [17, 55] : [12, 41];
const popupAnchor = isMobile ? [1, -40] : [1, -34];

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> © OpenStreetMap contributors',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

const markerIcons = {
  "Emergency Shelter": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  "Donation Point": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  "Medical Aid": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  "Animal Shelter": "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
};

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
                  <em>${row.Category}</em>
                </div>
                ${row.Hours ? `<div><b>Hours:</b> ${row.Hours}</div>` : ""}
                ${row.Description ? `<div><b>Description:</b> ${row.Description}</div>` : ""}
                ${row["Address Link"] ? `<div><b>Address:</b> ${row["Address Link"]}</div>` : ""}
                ${row.Phone ? `<div><b>Phone:</b> ${row.Phone}</div>` : ""}
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

      // Only insert tip if there’s grouped data
      if (listContainer && Object.keys(grouped).length > 0) {
        const tip = document.createElement("div");
        tip.className = "sidebar-tip-top";
        tip.textContent = "Click on any location for more details.";
        listContainer.insertBefore(tip, listContainer.firstChild);
      }

      // Render each grouped category
      for (const [category, group] of Object.entries(grouped)) {
        group.items.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        const section = document.createElement("div");
        section.className = "category-section";

        const header = document.createElement("div");
        header.className = `category-header category-${category.replace(/\s+/g, '-').toLowerCase()}`;
        header.innerHTML = `
          <img src="${group.icon}" alt="" class="category-icon">
          <span class="category-title">${category}</span>
          <span class="collapse-toggle">Click to collapse</span>
        `;

        const content = document.createElement("div");
        content.className = "category-items";

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
          }).addTo(map).bindPopup("You are here");

          overlay.style.display = "none";

          setTimeout(() => {
            map.invalidateSize();                    // ⬅️ force correct sizing
            map.setView(userLocation, 15, { animate: true });
            userMarker.openPopup();
            fetchResources();                        // ⬅️ call AFTER view set
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


// Add zoom out
document.getElementById("zoom-out-btn").addEventListener("click", () => {
  const currentZoom = map.getZoom();
  const newZoom = Math.max(currentZoom - 2, 5); // Don't zoom out too far

  const targetCenter = map.getCenter(); // ✅ Always use the current view center
  map.setView(targetCenter, newZoom, { animate: true });
});



// Add recenter to user location
document.getElementById("locate-btn").addEventListener("click", () => {
  if (userLocation) {
    map.setView(userLocation, 15);
  } else {
    alert("Location not available yet.");
  }
});

//Contact button
  document.getElementById("contact-btn").addEventListener("click", () => {
  window.location.href = "mailto:justinfung.ca@gmail.com?subject=Community%20Compass%20Inquiry";
});

