document$.subscribe(function () {

  const mapElement = document.getElementById("sites-map");

  if (!mapElement || mapElement._leaflet_id) return;

  const map = L.map("sites-map");

  L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  ).addTo(map);


  function findRawFeature(feature, rawFeatures) {

    if (
      !feature.geometry ||
      !feature.geometry.coordinates
    ) {
      return null;
    }

    const [x, y] = feature.geometry.coordinates;

    const tolerance = 0.000001;

    const coordinateMatch = rawFeatures.find((raw) => {

      if (
        !raw.geometry ||
        !raw.geometry.coordinates
      ) {
        return false;
      }

      const [rawX, rawY] = raw.geometry.coordinates;

      return (
        Math.abs(rawX - x) <= tolerance &&
        Math.abs(rawY - y) <= tolerance
      );
    });

    return coordinateMatch || null;
  }


  function createPopup(feature, rawFeature) {

    const processed = feature.properties;

    const raw =
      rawFeature
        ? rawFeature.properties
        : null;


    const fields = [
      ["Category", "category", "category"],
      ["Quantity", "quantity", "quantity"],
      ["Area", "area", "area_m2"],
      ["Price", "price_eur", "price_eur"],
      ["Date", "date_collected", "date_collected"]
    ];


    let rows = "";


    for (const [label, rawKey, processedKey] of fields) {

      const rawValue =
        raw
          ? (raw[rawKey] ?? "N/A")
          : "N/A";

      const processedValue =
        processed[processedKey] ?? "N/A";


      rows += `
        <tr>
          <th>${label}</th>
          <td>${rawValue}</td>
          <td>${processedValue}</td>
        </tr>
      `;
    }


    const warning =
      rawFeature
        ? ""
        : "<p>No matching raw record found.</p>";


    return `
      <div class="comparison-popup">

        <h3>
          ${processed.address ?? "No address"}
        </h3>

        <table class="data-comparison">

          <thead>
            <tr>
              <th></th>
              <th>Raw</th>
              <th>Processed</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>

        ${warning}

      </div>
    `;
  }


  async function loadData() {

    try {

      const rawData =
        await fetch("data/sites_raw.geojson")
          .then((response) => {

            if (!response.ok) {
              throw new Error(
                `Could not load raw GeoJSON: ${response.status}`
              );
            }

            return response.json();
          });


      const processedData =
        await fetch("data/sites_processed.geojson")
          .then((response) => {

            if (!response.ok) {
              throw new Error(
                `Could not load processed GeoJSON: ${response.status}`
              );
            }

            return response.json();
          });


      if (
        !rawData ||
        !Array.isArray(rawData.features)
      ) {
        throw new Error(
          "Raw GeoJSON does not contain a features array."
        );
      }


      if (
        !processedData ||
        !Array.isArray(processedData.features)
      ) {
        throw new Error(
          "Processed GeoJSON does not contain a features array."
        );
      }


      const sites =
        L.geoJSON(
          processedData,
          {

            pointToLayer:
              (feature, latlng) =>
                L.marker(latlng),


            onEachFeature:
              (feature, layer) => {

                const rawFeature =
                  findRawFeature(
                    feature,
                    rawData.features
                  );


                /*
                 * Search index only.
                 *
                 * This does NOT modify the GeoJSON
                 * feature properties.
                 */
                const properties =
                  feature.properties;


                const searchTitle =
                  [
                    properties.id ?? "N/A",
                    properties.address ?? "N/A",
                    properties.category ?? "N/A"
                  ]
                    .map((value) => String(value))
                    .join(" — ");


                layer.options.title =
                  searchTitle;


                layer.bindPopup(
                  createPopup(
                    feature,
                    rawFeature
                  )
                );


                layer.bindTooltip(
                  `${properties.address ?? "No address"}`,
                  {
                    sticky: true
                  }
                );

              }

          }
        ).addTo(map);


      /*
       * Leaflet.Control.Search
       *
       * Searches the existing marker layer.
       */
      const searchControl =
        L.control.search(
          {

            layer: sites,

            propertyName: "title",

            container: "site-search",

            textPlaceholder:
              "Search ID, address or category...",

            collapsed: false,

            autoCollapse: false,

            autoType: false,

            initial: false,

            casesensitive: false,

            minLength: 1,

            delayType: 250,

            tooltipLimit: 10,

            tipAutoSubmit: true,

            firstTipSubmit: false,

            zoom: 15,

            marker: false,


            buildTip:
              function (text, value) {

                const layer =
                  value.layer;

                if (
                  layer &&
                  layer.feature &&
                  layer.feature.properties
                ) {

                  const properties =
                    layer.feature.properties;

                  const id =
                    properties.id ?? "N/A";

                  const address =
                    properties.address ?? "N/A";

                  const category =
                    properties.category ?? "N/A";


                  const tip =
                    document.createElement("li");

                  tip.innerHTML =
                    `<strong>${id}</strong> — ` +
                    `${address} — ` +
                    `${category}`;

                  return tip;
                }


                return text;
              }

          }
        );


      /*
       * When a search result is selected:
       *
       * 1. Leaflet-Control.Search moves the map.
       * 2. We open the existing popup for that marker.
       *
       * The marker itself is not changed.
       */
      searchControl.on(
        "search:locationfound",
        function (event) {

          const layer =
            event.layer;

          if (
            layer &&
            typeof layer.openPopup === "function"
          ) {

            layer.openPopup();

          }

        }
      );


      map.addControl(searchControl);


      /*
       * Initial map extent.
       */
      if (
        sites.getBounds().isValid()
      ) {

        map.fitBounds(
          sites.getBounds(),
          {
            padding: [30, 30]
          }
        );

      }


    } catch (error) {

      console.error(
        "Could not load raw and processed GeoJSON:",
        error
      );

    }

  }


  loadData();

});