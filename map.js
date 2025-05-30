const map = L.map('map').setView([49.8951, -97.1384], 12); // Example: Winnipeg

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> © OpenStreetMap contributors',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);


const icons = {
  "Emergency Shelter": L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  "Donation Point": L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  "Medical Aid": L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  "Animal Shelter": L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  "Info Station": L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
};

fetch("https://opensheet.elk.sh/1saesqAewFioAJss_sjoYfVwYNuTCiWlgSoMWLiYw8WE/Sheet1")
  .then(res => res.json())
  .then(data => {
    data.forEach(row => {
      const lat = parseFloat(row.Latitude);
      const lng = parseFloat(row.Longitude);
      const category = row.Category || "Emergency Shelter"; // Default fallback

      if (!isNaN(lat) && !isNaN(lng)) {
        const icon = icons[category] || icons["Emergency Shelter"];
        L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
            <div class="popup-content">
            <div class="popup-header">
                <strong>${row.Name}</strong><br>
                <em>${row.Category}</em>
            </div>

            ${row.Hours ? `<div><b>Hours:</b> ${row.Hours}</div>` : ""}
            ${row.Description ? `<div><b>Description:</b> ${row.Description}</div>` : ""}
            ${row["Address Link"] ? `<div><b>Address:</b> ${row["Address Link"]}</div>` : ""}
            ${row.Phone ? `<div><b>Phone:</b> ${row.Phone}</div>` : ""}
            ${row.ImageURL ? `
            <div style="margin-top: 12px; text-align: center;">
                <a href="${row.ImageURL}" target="_blank">
                <img src="${row.ImageURL}" alt="Items accepted" 
                    style="width:100%; max-width: 200px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                </a>
                <div style="margin-top: 6px;">
                <small style="color: #555;">Currently being accepted</small>
                </div>
            </div>
            ` : ""}
        `);
      }
    });
  });