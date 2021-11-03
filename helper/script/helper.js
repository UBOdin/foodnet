var theMap = L.map("mapid").setView([43.016844, -78.741447], 11);
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    maxZoom: 16,
  }
).addTo(theMap);

// remove and add in reference file

let cachedMarkers = {};
let cachedCluster = {};
let cachedIcons = {};
let lyrMarkerCluster;
let lyrMarkers = [];
let filterConditions = [];
let paymentOption = [];
lyrMarkerCluster = L.markerClusterGroup();

let isOpenTodayCondition = false;

theMap.on("zoomstart", function onDragEnd() {
  console.log(theMap.getBounds());
  // countVisibleMarkers(theMap);
});

var markerList = [];
theMap.eachLayer(function (layer) {
  if (
    layer instanceof L.Marker &&
    theMap.getBounds().contains(layer.getLatLng())
  ) {
    markerList.push(layer);
  }
});

function countVisibleMarkers(map) {
  var markerCount = 0;
  var squareFtCount = 0;

  map.eachLayer(function (layer) {
    if (
      layer instanceof L.Marker &&
      map.getBounds().contains(layer.getLatLng())
    ) {
      if (layer.hasOwnProperty("_childClusters")) {
        markerCount += layer.getAllChildMarkers().length;
        layer.getAllChildMarkers().forEach((element) => {
          squareFtCount += parseInt(element.feature.properties.sq_feet);
        });
      } else {
        markerCount++;
        squareFtCount += parseInt(layer.feature.properties.sq_feet);
      }
    }
  });
  var loadingDiv = document.getElementById("countLoading");
  loadingDiv.style.display = "none";

  var countDiv = document.getElementById("count-div");
  countDiv.innerText = markerCount;
  countDiv.style.display = "block";

  var squareFitDiv = document.getElementById("square-feet-div");

  squareFitDiv.innerText = squareFtCount
    .toString()
    .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
  squareFitDiv.style.display = "block";

  var squareFitDivLoading = document.getElementById("squareFtCountLoading");
  squareFitDivLoading.style.display = "none";

  return markerCount;
}

theMap.on("zoomend", () => {
  //console.log(layerInfo);

  console.log(theMap.getBounds());

  var markersCount = countVisibleMarkers(theMap);

  console.log("Visible" + markersCount);
});

function filterMarkers(json) {
  if (filterConditions.length == 0 && !isOpenTodayCondition) return true;
  var element = json.properties;

  let elementvalid = false;

  if (filterConditions.includes("payment")) {
    for (payment in paymentOption) {
      if (
        element.payment != null &&
        element.payment.includes(paymentOption[payment])
      ) {
        elementvalid = true;
        break;
      } else if (
        (element.payment == null || element.payment.length == 0) &&
        paymentOption.includes("na")
      ) {
        console.log("null");
        elementvalid = true;
        break;
      }
    }
  } else elementvalid = true;

  let isOpenToday = false;
  if (isOpenTodayCondition) {
    //console.log(element.seasonal)
    let fromDate,
      toDate,
      today = new Date();

    element.seasonal.forEach((date) => {
      if (date.dates.length == 2) {
        fromDate = new Date(date.dates[0]);
        toDate = new Date(date.dates[1]);

        isOpenToday =
          today.getMonth() >= fromDate.getMonth() &&
          today.getMonth() <= toDate.getMonth() &&
          today.getDay() >= fromDate.getDay() &&
          today.getDay() <= toDate.getDay()
            ? true
            : false;
      }
    });
  } else isOpenToday = true;

  //console.log(elementvalid)
  return elementvalid && isOpenToday;
}

function returnMarker(json, latlng) {
  var element = json.properties;

  return L.marker(latlng, {
    icon: getIcon(element.icon.mdi, element.icon.color),
  })
    .bindTooltip(element.tooltip)
    .bindPopup(function () {
      return generatePopUp(element);
    });
}

function showLayer(layer) {
  //console.log(layer);
  // iterate over cachedMarkers that are
  // maintain a seperate list if retail or not

  // console.log(lyrMarkerCluster)
  if (cachedMarkers.hasOwnProperty(layer)) {
    //lyrMarkerCluster = L.markerClusterGroup();
    lyrMarkerCluster.addLayer(cachedMarkers[layer]);
    //lyrMarkerCluster.addTo(theMap);
    //cachedMarkers[layer].addTo(theMap);
  } else {
    let layerInfo = L.geoJSON.ajax("Layers/json-files/" + layer, {
      pointToLayer: returnMarker,
      filter: filterMarkers,
    });

    layerInfo.on("data:loaded", function (element) {
      if (paymentOption.length > 0) {
        //  lyrMarkerCluster.clearLayers();
      }
      if (paymentOption.length == 0) lyrMarkers.push(layerInfo);

      lyrMarkerCluster.addLayer(layerInfo);
      cachedMarkers[layer] = layerInfo;

      lyrMarkerCluster.addTo(theMap);
      countVisibleMarkers(theMap);
    });

    cachedCluster[layer] = lyrMarkerCluster;
  }
  // console.log(cachedCluster);
}

function generatePopUp(properties) {
  var dateString =
    properties.seasonal != null && properties.seasonal.length > 0
      ? generateDateString(properties)
      : "Not available!";
  var popUp =
    "<b>" +
    properties.marketname +
    "</b><br/><a href='" +
    "https://bing.com/maps/default.aspx?rtp=~pos." +
    properties.y.toString() +
    "_" +
    properties.x.toString() +
    '\' target=\'_blank\'><img src="graphics/icons/directions-fork.svg" height="16px" width="16px" /></a>&nbsp;&nbsp;<a href=\'' +
    "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" +
    properties.y.toString() +
    "," +
    properties.x.toString() +
    '\' target=\'_blank\'><img src="graphics/icons/camera.svg" height="16px" width="16px" /></a><br/><i>' +
    properties.address.street +
    "<br/>" +
    properties.address.city +
    " ," +
    properties.address.state +
    " ," +
    properties.address.zip +
    "</i><br/><hr/><b>Open Hours: </b><br/>" +
    dateString +
    "<hr/><span class='font-size: -1pt;'>Last Updated: " +
    properties.updated +
    " <a href='javascript:feedbackForRecord(\"" +
    properties.record_id
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;") +
    '"' +
    ")'>[Report an error]</a></span>";
  // use encodeURI component here
  return popUp;
}

function generateDateString(properties) {
  console.log(properties.seasonal);
  var dateString = "";
  properties.seasonal.forEach(function (date) {
    let fromDate, toDate;
    let isDatesNull = true;
    if (date.dates != null) {
      fromDate = new Date(date.dates[0]);
      toDate = new Date(date.dates[1]);
      isDatesNull = false;
    }

    let dateStr = date.time != null ? date.time : "";
    dateString +=
      (!isDatesNull
        ? fromDate.toLocaleString("default", {
            month: "short",
          }) +
          " " +
          fromDate.getDate() +
          " to " +
          toDate.toLocaleString("default", {
            month: "short",
          }) +
          "  " +
          toDate.getDate() +
          " &nbsp;| "
        : " ") +
      "&nbsp;&nbsp;<i>" +
      dateStr +
      "</i><br/>";
  });

  console.log(dateString);
  return (
    "<div style='max-height: 60px; overflow:auto'>" + dateString + "</div>"
  );
}

function hideLayer(layer) {
  console.log(cachedMarkers[layer]);
  //theMap.clearLayers()
  console.log(layer);

  if (cachedMarkers[layer] != undefined) {
    lyrMarkerCluster.removeLayer(cachedMarkers[layer]);
    //lyrMarkerCluster.clearLayers()
    //cachedMarkers[layer].remove()
  }
}

function removeMarkerPaymentSearch(map, marker, props, cashType) {
  //console.log(props.payment)
  if (
    !props.hasOwnProperty("payment") ||
    props.payment == null ||
    props.payment.length == 0 ||
    !props.payment.includes(cashType)
  )
    map.removeLayer(marker);
}

function userRequestedFilter(event) {
  console.log("---");
  console.log(event);
  console.log(paymentOption);

  if ((event.name = "paymentFilter")) {
    if (paymentOption.includes(event.id)) {
      paymentOption.splice(paymentOption.indexOf(event.id), 1);
      lyrMarkerCluster.clearLayers();
      if (paymentOption.length == 0) {
        cachedMarkers = {};
        cachedCluster = {};
        cachedIcons = {};
        lyrMarkerCluster;
        lyrMarkers = [];
        filterConditions = [];
        reloadMap("reloadMap");
      } else
        for (var i in lyrMarkers) {
          lyrMarkers[i].refresh();
        }
    } else {
      filterConditions.push("payment");
      paymentOption = [];

      $("input[name=paymentFilter]").each(function () {
        // console.log(this.checked)
        if (this.checked) {
          paymentOption.push(this.id);
        }
      });

      if (paymentOption.length > 0) {
        console.log(lyrMarkerCluster.getLayers());

        lyrMarkerCluster.clearLayers();
        lyrMarkers.forEach((element) => {
          element.refresh();
        });
      }
    }
    console.log("end");
    if (paymentOption.length > 0) {
      var noCashDiv = document.getElementById("noCashDiv");
      noCashDiv.style.display = "block";
    } else {
      var noCashDiv = document.getElementById("noCashDiv");
      noCashDiv.style.display = "none";
    }

    console.log(paymentOption);
  }
}

function filterOpenToday(event) {
  console.log(event);

  console.log(document.getElementById("openToday").checked);
  if ((event.name = "dateFilter")) {
    isOpenTodayCondition = document.getElementById("openToday").checked;

    lyrMarkerCluster.clearLayers();
    lyrMarkers.forEach((element) => {
      element.refresh();
    });
  }
}

function userRequestedLayerToggle(event) {
  console.log(event);
  let layer = event.attributes["data-layer"].value;

  if (event.checked) {
    showLayer(layer);
    event.checked = true;
  } else {
    hideLayer(layer);
    event.checked = false;
  }
  countVisibleMarkers(theMap);
}

function feedbackForRecord(recordId) {
  console.log(recordId);
  let feedbackURL =
    "https://docs.google.com/forms/d/e/1FAIpQLSdYwjfUK9xM0tjinV4Jj-tzaAg0kQXaMq-AOAD0EfQTSO1Lbw/viewform?usp=pp_url&entry.1693464332=__other_option__&entry.1693464332.other_option_response=" +
    encodeURIComponent("RECORD;" + recordId);
  console.log(
    "Providing feedback for [" + recordId + "] by redirecting to " + feedbackURL
  );
  window.open(feedbackURL);
}

function genericFeedback() {
  let feedbackURL =
    "https://docs.google.com/forms/d/e/1FAIpQLSdYwjfUK9xM0tjinV4Jj-tzaAg0kQXaMq-AOAD0EfQTSO1Lbw/viewform?usp=sf_link";
  window.open(feedbackURL);
}

//     $(".layer_toggle").change(userRequestedLayerToggle);
// check and remove reloadValue
function reloadMap(reloadValue) {
  fetch("reference.json")
    .then((response) => response.json())
    .then((layers) => {
      if (reloadValue != "reloadMap") {
        var filterDiv = document.createElement("div");
        filterDiv.id = "filter";
        filterDiv.className = "filter";
      }
      layers.layersIndex.forEach(function (layer) {
        if (reloadValue != "reloadMap")
          document
            .getElementById("filter-div")
            .appendChild(filterDiv)
            .insertAdjacentHTML(
              "afterbegin",
              '<div class="form-check"><input type="checkbox" data-layer=' +
                layer.fileName +
                ' checked="' +
                layer.isChecked +
                '" class="form-check-input filled-in" id="' +
                layer.id +
                '" onclick="javascript:userRequestedLayerToggle(this) "><label class="form-check-label small text-uppercase card-link-secondary" for="new">' +
                layer.layerName +
                "</label></div>"
            );

        if (layer.isChecked) {
          showLayer(layer.fileName);
        } else {
          document.getElementById(layer.id).checked = false;
        }
      });
      if (reloadValue != "reloadMap") {
        var paymentFilter = document.createElement("div");
        paymentFilter.id = "paymentFilter";
        paymentFilter.className = "paymentFilter";
        document.getElementById("cash-filter").appendChild(paymentFilter);
      }
      //console.log(layers);
      layers.paymentFilter.forEach((element) => {
        if (reloadValue != "reloadMap")
          document
            .getElementById("paymentFilter")
            .insertAdjacentHTML(
              "beforeend",
              '<div class="form-check form-check-inline"><input name="paymentFilter" onclick="javascript:userRequestedFilter(this)" class="form-check-input" type="checkbox" id="' +
                element.id +
                '"><label class="form-check-label" for="' +
                element.id +
                '">' +
                element.displayValue +
                "</label</div>"
            );
      });
    });
}

function getIcon(label, color) {
  //  console.log("Getting Icon for " + label);
  if (label == undefined || label == null) {
    return L.Icon.Default;
  } else {
    if (cachedIcons[label] == undefined) {
      cachedIcons[label] = L.icon({
        iconUrl: "graphics/icons/" + label + ".svg",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
        // shadowUrl: 'graphics/circle-white.png',
        // shadowSize: [24, 24],
        // shadowAnchor: [12, 12],
        className: "icon-image icon-image-" + label,
      });
      if (color) {
        document.styleSheets[0].insertRule(
          ".icon-image-" + label + " { background-color: " + color + " }",
          0
        );
      }
    }
    return cachedIcons[label];
  }
}

reloadMap("reloadPage");
