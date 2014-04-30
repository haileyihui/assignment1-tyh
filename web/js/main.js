var map, jsonArray = [],
        boundaryArray = [],
        googleLayerSatellite, googleLayerStreet, openStreeMapLayer, markersCluster, PointSymbolMap, PointSymbolMapLegend, pointSymbolHeatMap,
        schoolsLayer, polygonBoundary, polygonBoundaryLegend, proportionalSymbolMap, proportionalInfo, proportionalFocus, info, choroplethInfo, choroplethMaxValue, choroplethMinValue, numberOfChoroplethClasses = 7,
        choroplethFocus, osmMap, choroplethControl, layerControl, mrtStationGeoJsonData, schoolGeoJsonData;

function loadScript() {

    $.ajaxSetup({
        async: false
    });

    map = new L.Map('map', {
        center: new L.LatLng(1.355312, 103.827068),
        zoom: 12
    });
    openStreeMapLayer = L.tileLayer.grayscale('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    googleLayerStreet = new L.Google('ROADMAP');
    osmMap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; ' + '<a href="http://openstreetmap.org">OpenStreetMap</a>' + ' Contributors'
    });
    var baseMaps = {
        'Open Street Map': osmMap,
        'Open Street Maps (B/W)': openStreeMapLayer,
        'Google (Street)': googleLayerStreet,
    };
    markersCluster = L.markerClusterGroup();
    transactedPriceHeatMap = new L.TileLayer.HeatCanvas({}, {
        'step': 0.3,
        'degree': HeatCanvas.QUAD,
        'opacity': 0.5
    });
    //initializing the layer groups
    PointSymbolMap = L.layerGroup();
    pointSymbolHeatMap = new L.TileLayer.WebGLHeatMap({}, {
        size: 1000,
        autoresize: true,
        opacity: 0.5
                // zIndex: 100
    });
    proportionalSymbolMap = L.layerGroup();
    schoolsLayer = L.layerGroup();

    //loading of property transaction data
    $.getJSON('data/realis.geojson', function(data) {
        jsonArray = data;

        //treat the data according to marker cluster
        addMarkerCluster(jsonArray);
       
        //treat the data according to point symbols
        addPointSymbolMap(jsonArray, 'Property T');
        addPointSymbolHeatMap(jsonArray);

        $.getJSON('data/Polygon.geojson', function(polygonData) {
            boundaryArray = polygonData;
            setChoroplethLayer(boundaryArray, jsonArray, 'Average Price Area');
            //addProportionateSymbolMap(boundaryArray);
        });


        $.getJSON('data/PolygonCentroid.geojson', function(polygonCentroidData) {
            addProportionateSymbolMap(polygonCentroidData, boundaryArray, 'Number Of Transactions');
        });

    });
    
    $.getJSON('data/Schools.geojson', function(schoolData) {
        addSchoolsMap(schoolData);
    });


    /*
     $.getJSON('data/sgroadsnetwork.geojson', function(data) {
     var myLayer = L.geoJson().addTo(map);
     myLayer.addData(data);
     });
     */

    var overlayMaps = {
        'Cluster Marker (of ALL Properties)': markersCluster,
        'Point Symbol (of DIFFERENT Property Types)': PointSymbolMap,
        'Planning Sub Zones': polygonBoundary,
        'Proportional Symbol': proportionalSymbolMap,
        'Point Symbol Heat Map': pointSymbolHeatMap
    };

    map.addLayer(osmMap);
    
    layerControl = L.control.layers(baseMaps, overlayMaps, {
        collapsed: false
    }).addTo(map);
    addLayerChangeEventHandler();
    addPanLayerControl();
    //addUserMarkerControl();

    $.ajaxSetup({
        async: false
    });
    $(".genericcontainer").fadeOut(1500, function() {
        $(".genericcontainer").remove();
    });

    $(".splashlayer").fadeOut(1200);
}

function addPanLayerControl() {
    panLayerControl = L.control.pan({
        position: "topleft"
    }).addTo(map);
}

function addLayerChangeEventHandler() {
    map.on('overlayadd', function(eventLayer) {

        if (eventLayer.name === 'Point Symbol') {
            this.addControl(PointSymbolMapLegend);
            this.addControl(info);
        }

        if (eventLayer.name === 'Singapore Sub Zones') {
            this.addControl(polygonBoundaryLegend);
            this.addControl(choroplethInfo);
            this.addControl(choroplethControl);
        }

        if (eventLayer.name === 'Proportional Symbol') {
            this.addControl(proportionalInfo);
        }
        if (eventLayer.name === 'Heat Map') {
            this.addControl(heatMapLegend);
        }

    });
    map.on('overlayremove', function(eventLayer) {
        if (eventLayer.name === 'Point Symbol') {
            this.removeControl(PointSymbolMapLegend);
            this.removeControl(info);
        }

        if (eventLayer.name === 'Singapore Sub Zones') {
            this.removeControl(polygonBoundaryLegend);
            this.removeControl(choroplethInfo);
            this.removeControl(choroplethControl);
        }

        if (eventLayer.name === 'Proportional Symbol') {
            this.removeControl(proportionalInfo);
        }
        if (eventLayer.name === 'Heat Map') {
            this.removeControl(heatMapLegend);
        }
    });
}

function addMRTStationMap(stationData, railData) {

    var mrtIcon = L.icon({
        iconUrl: 'img/mrt.png',
        iconSize: [15, 15]
    });

    var geoJsonLayer = new L.geoJson(railData, {
        style: function(feature, latlng) {
            switch (feature.properties.name) {
                case 'MRT North-South Line (NSL-NB)':
                    return {
                        color: '#de2d26'
                    };
                case 'MRT East-West Line (EWL-EB)':
                    return {
                        color: '#109531'
                    };
                case 'MRT North East Line (NEL)':
                    return {
                        color: '#9016b2'
                    };
                case 'MRT Downtown Line (DTL)':
                    return {
                        color: '#0a3f95'
                    };
                case 'MRT Circle Line (CCL)':
                    return {
                        color: '#fb8708'
                    };
            }
        },
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: mrtIcon
            });
        }
    });

}

function addSchoolsMap(schoolData) {
    var schoolIcon = L.icon({
        iconUrl: 'img/school.png',
        iconSize: [15, 15]
    });

    var geoJsonLayer = new L.geoJson(schoolData, {
        onEachFeature: function(feature, layer) {
            layer.bindPopup(renderFeatureTableFor(feature));
            // layer.on('mouseover', onCircleMouseOver);
            // layer.on('mouseout', onCircleMouseOut);
        },
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: schoolIcon
            });
        }
    });
    schoolsLayer = geoJsonLayer;
    schoolGeoJsonData = schoolData;
}

function addProportionateSymbolMap(polygonCentroidData, boundaryArray, categoryType) {
    //to modifyvar categoryTypeArray = [];

    var valueArr = [];
    proportionalFocus = categoryType;

    for (var i in polygonCentroidData["features"]) {
        for (var j in boundaryArray["features"]) {
            if (polygonCentroidData["features"][i]["properties"]["DGPSZ_CODE"] === boundaryArray["features"][j]["properties"]["DGPSZ_CODE"]) {
                polygonCentroidData["features"][i]["properties"][proportionalFocus] = boundaryArray['features'][j]['properties'][proportionalFocus];
                valueArr.push(polygonCentroidData["features"][i]["properties"][categoryType]);
            }
        }
    }

    //to be modified
    var maxValue = Math.max.apply(Math, valueArr);


    var geoJsonLayer = new L.geoJson(polygonCentroidData, {
        onEachFeature: function(feature, layer) {
            layer.on('mouseover', onProportionMouseOver);
            layer.on('mouseout', onProportionMouseOut);
        },
        pointToLayer: function(feature, latlng) {


            return L.circleMarker(latlng, {
                radius: feature.properties[proportionalFocus] / maxValue * 25,
                color: 'black',
                weight: 1,
                fillColor: 'red',
                fillOpacity: 0.5,
                opacity: 1
            });
            /*
             return L.circleMarker(latlng, {
             radius: feature.properties[proportionalFocus] / minValue * 5,
             color: 'black',
             weight: 1,
             fillColor: 'red',
             fillOpacity: 0.3,
             opacity: 1
             });
             */
        }
    });

    proportionalSymbolMap = geoJsonLayer;
}

function onProportionMouseOver(e) {
    var layer = e.target;
    layer.setStyle({
        fillOpacity: 0.8
    });

    proportionalInfo.update(layer['feature']['properties']);
    //layer.setRadius(100);
}

function onProportionMouseOut(e) {
    var layer = e.target;
    layer.setStyle({
        fillOpacity: 0.3
    });
    proportionalInfo.update();
    //layer.setRadius(20);
}

function addProportionalHoverInfoControl() {
    proportionalInfo = L.control({
        position: 'bottomleft'
    });
    proportionalInfo.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };
    proportionalInfo.update = function(subzone) {
        this._div.innerHTML = '<h4>Sub Zone</h4>' + (subzone ? getSubZoneProportionalInfo(subzone) : 'Hover over a Sub Zone');
    };
}

function getSubZoneProportionalInfo(subzone) {

    var interestedValue = subzone[proportionalFocus];

    return '<b>Area Name: ' + subzone.DGPZ_NAME + '</b><br />' +
            'Sub Area Name: ' + subzone.DGPSZ_NAME + '<br>' +
            proportionalFocus + ': ' + Math.round(interestedValue) + '<br>';
}

function setChoroplethLayer(polygonJson, transactionJson, chosenFocus) {
    for (var i in polygonJson['features']) {
        polygonJson['features'][i]['properties'].transactionList = [];
        for (var j in transactionJson['features']) {
            if (polygonJson['features'][i]['properties']['DGPSZ_CODE'] === transactionJson['features'][j]['properties']['DGPSZ_CODE']) {
                polygonJson['features'][i]['properties'].transactionList.push(transactionJson['features'][j]);
            }
        }
    }

    var transactionList = [];

    for (var i in polygonJson['features']) {
        transactionList = polygonJson['features'][i]['properties'].transactionList;
        polygonJson['features'][i]['properties']["Number Of Transactions"] = 0;
        polygonJson['features'][i]['properties']["Total Area Sold"] = 0;
        polygonJson['features'][i]['properties']["Total Transaction Amount"] = 0;
        polygonJson['features'][i]['properties']["Average Transaction Amount"] = 0;
        polygonJson['features'][i]['properties']["Average Price Area"] = 0;

        if (transactionList.length === 0) {
            continue;
        }

        var totalTransactedAmount = 0;
        var totalArea = 0;

        for (var j in transactionList) {

            totalTransactedAmount = totalTransactedAmount + transactionList[j]['properties']['Transacted'];
            totalArea = totalArea + transactionList[j]['properties']['Area (sqm)'];
        }

        polygonJson['features'][i]['properties']["Number Of Transactions"] = transactionList.length;
        polygonJson['features'][i]['properties']["Total Area Sold"] = totalArea;
        polygonJson['features'][i]['properties']["Total Transaction Amount"] = totalTransactedAmount;
        polygonJson['features'][i]['properties']["Average Transaction Amount"] = totalTransactedAmount / transactionList.length;
        polygonJson['features'][i]['properties']["Average Price Area"] = totalTransactedAmount / totalArea;

    }

    setChoroplethFocus(polygonJson, chosenFocus);

    polygonBoundary = new L.geoJson(polygonJson, {
        style: styleChoropleth,
        onEachFeature: onChoroplethEachFeature
    });

    setChoroplethLegendFor(chosenFocus);
}

function setChoroplethFocus(polygonJson, chosenFocus) {
    var chosenValue = [];

    for (var i in polygonJson['features']) {
        chosenValue.push(polygonJson['features'][i]['properties'][chosenFocus]);
        //console.log(polygonJson['features'][i]['properties'][chosenFocus]);
    }

    choroplethMinValue = Math.min.apply(Math, chosenValue);
    choroplethMaxValue = Math.max.apply(Math, chosenValue);

    /*
     choroplethMinValue = finder(Math.min, chosenValue, chosenFocus);
     choroplethMaxValue = finder(Math.max, chosenValue, chosenFocus);
     */

    choroplethFocus = chosenFocus;
}

function onChoroplethEachFeature(feature, layer) {
    layer.on({
        mouseover: mouseoverChoroplethLayer,
        mouseout: mouseoutChoroplethLayer,
        click: zoomToFeature
    });
}

function mouseoverChoroplethLayer(e) {
    var layer = e.target;
    layer.setStyle({
        color: 'black'
    });
    choroplethInfo.update(layer.feature);
}

function mouseoutChoroplethLayer(e) {
    var layer = e.target;
    layer.setStyle({
        color: 'white'
    });
    choroplethInfo.update();
}

function getSubZoneInfo(subzone) {
    var zone = subzone.properties;
    var interestedValue = subzone.properties[choroplethFocus];

    return '<b>Area Name: ' + zone.DGPZ_NAME + '</b><br />' +
            'Sub Area Name: ' + zone.DGPSZ_NAME + '<br>' +
            choroplethFocus + ': ' + Math.round(interestedValue) + '<br>';
}

function setChoroplethLegendFor(chosenOption) {
    var colourArray = [];
    var interval = (choroplethMaxValue - choroplethMinValue) / numberOfChoroplethClasses;
    var lowerBound = choroplethMinValue;
    var upperBound = choroplethMinValue + interval;
    var key;

    while (upperBound < choroplethMaxValue) {
        if (chosenOption == 'Average Transaction Amount' ||
                chosenOption == 'Total Transaction Amount' ||
                chosenOption == 'Average Price per Area' ||
                chosenOption == 'Average Price Area') {
            key = numeral(lowerBound).format('$0,0.00') + ' - ' + numeral(upperBound).format('$0,0.00');
        } else {
            key = numeral(lowerBound).format('0,0') + ' - ' + numeral(upperBound).format('0,0');
            // key = Math.round(lowerBound) + "-" + Math.round(upperBound);
        }
        colourArray[key] = getChoroplethColour(upperBound);
        lowerBound = upperBound;
        upperBound = upperBound + interval;
    }

    polygonBoundaryLegend = getLegend(colourArray, choroplethFocus);
}

function styleChoropleth(feature) {
    return {
        fillColor: getChoroplethColour(feature.properties[choroplethFocus]),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

function getChoroplethColour(value) {
    var interval = (choroplethMaxValue - choroplethMinValue) / numberOfChoroplethClasses;

    return value > choroplethMaxValue - 1 * interval ? '#fef0d9' :
            value > choroplethMaxValue - 2 * interval ? '#fdd49e' :
            value > choroplethMaxValue - 3 * interval ? '#fdbb84' :
            value > choroplethMaxValue - 4 * interval ? '#fc8d59' :
            value > choroplethMaxValue - 5 * interval ? '#ef6548' :
            value > choroplethMaxValue - 6 * interval ? '#d7301f' :
            value > choroplethMaxValue - 7 * interval ? '#990000' :
            // value > choroplethMaxValue - 8 * interval ? '#deebf7' :
            '#f7fbff';
}

//Information Control for dynamic tooltipping

function getTransactionInfo(transaction) {
    return renderTransactionDataTableFor(transaction);
}

function addPointSymbolMap(json, categoryType) {

    var transactionArray = json['features'];

    var categoryTypeArray = [];
    $.each(transactionArray, function(index, transaction) {
        if ($.inArray(transaction['properties'][categoryType], categoryTypeArray) === -1) {
            categoryTypeArray.push(transaction['properties'][categoryType]);
        }
    });

    var colourArray = [];
    $.each(categoryTypeArray, function(index, categoryType) {
        colourArray[categoryType] = colorSet(index, categoryTypeArray.length);
        //colourArray[propertyType] = getRandomColour();
    });

    var geoJsonLayer = new L.geoJson(json, {
        pointToLayer: function(feature, latlng) {

            return L.circleMarker(latlng, {
                radius: 5,
                color: 'black',
                weight: 1,
                fillColor: colourArray[feature['properties'][categoryType]],
                fillOpacity: 1,
                opacity: 1
            });
        }
    });

    PointSymbolMap = geoJsonLayer;

    PointSymbolMapLegend = getLegend(colourArray, 'Point Symbol Legend');
}

function addMarkerCluster(json) {
    var geoJsonLayer = new L.geoJson(json, {
        onEachFeature: function(feature, layer) {
            layer.bindPopup(getTransactionInfo(feature.properties));
        }
    });
    markersCluster.addLayer(geoJsonLayer);
}

function getLegend(colourArray, legendHeading) {
    var legend = L.control({
        position: 'bottomright'
    });
    legend.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'info legend');
        var legendInput = '<h4>' + legendHeading + '</h4>';
        for (var k in colourArray) {
            legendInput += '<i style="background:' + colourArray[k] + '"></i> ' + k + '<br>';
        }

        div.innerHTML = legendInput;
        return div;
    };
    return legend;
}

function onCircleMouseOver(e) {
    var layer = e.target;
    layer.setStyle({
        weight: 5
    });

    info.update(layer['feature']['properties']);
    //layer.setRadius(100);
}

function onCircleMouseOut(e) {
    var layer = e.target;
    layer.setStyle({
        weight: 1
    });
    info.update();
    //layer.setRadius(20);
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function resetInputMarkerIcon() {
    for (var i = 0; i < inputMarker.length; i++) {
        inputMarker[i].setIcon(new L.Icon.Default());
    }
}

function addPointSymbolHeatMap(json) {
    // array of arrays 
    var heatMapArray = [];

    $.each(json['features'], function(i, val) {
        var properties = [];
        properties['lat'] = val["properties"]["latitude"];
        properties['lng'] = val["properties"]["longitude"];
        properties['size'] = 0.05;
        properties['intensity'] = 5;
        heatMapArray.push(properties);
    });

    for (var i = 0, len = heatMapArray.length; i < len; i++) {
        var point = heatMapArray[i];
        pointSymbolHeatMap.addDataPoint(point['lat'], point['lng'], point['size'], point['intensity']);
    }

}
