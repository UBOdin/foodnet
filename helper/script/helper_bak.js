// var $j = jQuery.noConflict();
// $(".selectLayer").popover({
//   container: "body",
//   html: true,
//   placement: "right",
//   sanitize: false,
//   content: `<div >
//             <div id="Layers">
//               <div>
//                               <input id="Farms" class="layer_toggle" type="checkbox" name="Farms" onclick="javascript:userRequestedLayerToggle(this)" autocomplete="off" data-layer="AMS-USDA-Directories-Farms.json" checked />
//                               <label for="Farms">Farms with Stores</label>
//                            </div>
//                            <div>
//                               <input id="FarmMarkets" class="layer_toggle" type="checkbox" name="FarmMarkets" onclick="javascript:userRequestedLayerToggle(this)" autocomplete="off" data-layer="AMS-USDA-Directories-FarmersMarkets.json" checked />
//                               <label for="FarmMarkets">Farmers Markets</label>
//                            </div>
//                            <div>
//                               <input id="AgDistricts" class="layer_toggle" type="checkbox" name="AgDistricts" autocomplete="off" data-layer="CUGIR-WNY-AgDistricts.json" />
//                               <label for="AgDistricts">Ag Districts</label>
//                            </div>
//                            <hr/>
//                            <div style="text-align: center;">
//                               <button type="button" class= "submitButton" onclick="javascript:genericFeedback()">Provide Feedback</button>
//                            </div>
//             </div>
//           </div>`,
//   title: "Select Layer",
// });

var theMap = L.map("mapid").setView([43.016844, -78.741447], 11);
var layerData={};
var layer1;
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    maxZoom: 16,
  }
).addTo(theMap);

let cachedMarkers = {};
let cachedIcons = {};


// theMap.on('zoomend', function onDragEnd(){
//   var width = theMap.getBounds().getEast() - theMap.getBounds().getWest();
//   var height = theMap.getBounds().getNorth() - theMap.getBounds().getSouth();

//   alert (
//       'center:' + theMap.getCenter() +'\n'+
//       'width:' + width +'\n'+
//       'height:' + height +'\n'+
//       'size in pixels:' + theMap.getSize()
//   )});

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

//var coverages = new L.LayerGroup();

// theMap.on("zoomend", function() {
//   // Here getting clusters randomly, but you can decide which one you want to show coverage of.

// //alert()
// coverages.clearLayers();

// theMap.eachLayer(function(layer) {
//     if (layer instanceof L.MarkerCluster && layer.getChildCount() > 2) {
//       theMap._showCoverage( layer );
//       console.log(layer)
//       //coverages.addLayer(L.polygon(layer.getConvexHull()));
//     }
//     coverages.addTo(theMap);
//   });
// });

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

  var countDiv = document.getElementById("square-feet-div");

  countDiv.innerText = squareFtCount
    .toString()
    .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
  countDiv.style.display = "block";

  var loadingDiv = document.getElementById("squareFtCountLoading");
  loadingDiv.style.display = "none";

  return markerCount;
}

theMap.on("zoomend", () => {
  console.log(theMap.getBounds());

  var markersCount = countVisibleMarkers(theMap);

  console.log("Visible" + markersCount);
});

function getIcon(label, color) {
  //console.log("Getting Icon for " + label);
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


function showLayer(layer) {
  //console.log(layer)
  // iterate over cachedMarkers that are
  // maintain a seperate list if retail or not
  if (cachedMarkers[layer] != undefined) {
    cachedMarkers[layer].addTo(theMap);
  } else {
    layerInfo= $.getJSON("Layers/json-files/" + layer);
    
    layerInfo.then( function (data) {
      console.log(data)
      var markers = L.markerClusterGroup({
        maxClusterRadius: 30,
        showCoverageOnHover: true,
      });
      // var markers = L.featureGroup();
      console.log("markers")
      cachedMarkers[layer] = markers;
            console.log(cachedMarkers[layer])

      for (point in data) {
        L.geoJSON(data[point], {
          pointToLayer: function (feature, latLng) {
            return L.marker(latLng, {
              icon: getIcon(
                feature.properties.icon.mdi,
                feature.properties.icon.color
              ),
            });
          },
        }).addTo(markers);
      }
      
      console.log(markers)

      markers
        .bindPopup(function (element) {
          // console.log(element);
          return generatePopUp(element.feature.properties);
          //return element.feature.properties.popup;
        })
        .bindTooltip(function (element) {
          return element.feature.properties.tooltip;
        });

      markers.addTo(theMap);
      countVisibleMarkers(theMap);

    });
  
   layerData[layer]= layer1
  }
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
    "</i><br/><hr/><b>Valid Hours: </b><br/>" +
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

    dateString +=
      (!isDatesNull
        ? fromDate.toLocaleString("default", { month: "short" }) +
          " " +
          fromDate.getDate() +
          " to " +
          toDate.toLocaleString("default", { month: "short" }) +
          " " +
          toDate.getDate()
        : "NA") +
      "&nbsp;|&nbsp;&nbsp;<i>" +
      date.time +
      "</i><br/>";
  });
  return (
    "<div style='max-height: 60px; overflow:auto'>" + dateString + "</div>"
  );
}

function hideLayer(layer) {
  if (cachedMarkers[layer] != undefined) {
    theMap.removeLayer(cachedMarkers[layer]);
  }
}


function removeMarkerPaymentSearch(map,marker, props, cashType){

console.log(props.payment)
        if(!props.hasOwnProperty("payment") || (props.payment ==null|| props.payment.length==0) || !props.payment.includes(cashType) )
        map.removeLayer(marker)
}
function userRequestedFilter(event){
console.log(event.id)

  theMap.eachLayer(function (layer) {
    if (
      layer instanceof L.Marker &&
      theMap.getBounds().contains(layer.getLatLng())
    ) {
      if(layer.hasOwnProperty("feature"))
      {
        let props=layer.feature.properties;
     removeMarkerPaymentSearch(theMap, layer, props, event.id )
      }

      else{
        layer.getAllChildMarkers().forEach(element => {
                  let props=element.feature.properties;

     removeMarkerPaymentSearch(theMap, element, props, event.id )
 
         // console.log(element.hasOwnProperty("feature"))
        });
        //console.log(layer.getAllChildMarkers())
        //console.log("false")
      }
    //  console.log(layer)
    }
  });


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

fetch("reference.json")
  .then((response) => response.json())
  .then((layers) => {
    var filterDiv = document.createElement("div");
    filterDiv.id = "filter";
    filterDiv.className = "filter";

    layers.layersIndex.forEach(function (layer) {
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

    var paymentFilter = document.createElement("div");
    paymentFilter.id = "paymentFilter";
    paymentFilter.className = "paymentFilter";
    document.getElementById("cash-filter").appendChild(paymentFilter);

    console.log(layers);
    layers.paymentFilter.forEach((element) => {
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
     console.log(layerData)
     console.log(cachedMarkers)

  });


