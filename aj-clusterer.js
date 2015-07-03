/* This library requires underscore.js and Google Maps Api library to function. It also requires eds-async-clustering.js
  * to be present in the same path as this file. */

/* Dependency check */
if (!self._)
    throw "underscore.js not loaded";

/* Namespacing */
if (_.isUndefined(self.aj))
    aj = {};

if (_.isUndefined(self.aj.geometry))
    aj.geometry = {};

/* Source Code. A Clusterer instance automatically clusters and manages any coordinates that you wish to display in a
 * map. If you specify a delegate, that delegate will receive a didSelectCluster(clusterer, cluster, googleMarker)
 * whenever a cluster is clicked/tapped on. */
aj.geometry.Clusterer = function (map, delegate, asyncURL, geometryURL, underscoreURL) {

    /* Do setup specific to this class. */
    var clusterer = this;
    this.map = map;
    this.workerURL = asyncURL;
    this.geometryURL = geometryURL;
    this.underscoreURL = underscoreURL;
    this.delegate = delegate;
    this.worker = null;
    this.cnv= document.createElement("canvas");
    this.liveMarkers = [];
    this.ceilValue = 10000;
    this.minClusterSize = 25;
    this.maxClusterSize = 50;
    this.clusterLineWidth = 2;
    this.ctx = this.cnv.getContext("2d");

    google.maps.event.addDomListener(map, 'zoom_changed', function () {clusterer.redraw();});
    google.maps.event.addDomListener(map, 'dragend', function () {clusterer.redraw();});


    this.onmessageFn = function (e) {

        //This fn is invoked by the worker whenever it posts a message to the main thread.
        //Note that we assume the worker will only give us valid, up-to-date clusters for the current bounds.
        _.each(clusterer.liveMarkers, function (aMarker) {
           aMarker.setMap(null);
        });

        clusterer.liveMarkers = [];

        _.each(e.data.clusters, function (aCluster) {

            var newMarker = new google.maps.Marker({
                position: aCluster.position,
                draggable: false,
                map: map
            });

            /* The code below dynamically draws the icon for the marker based on its size if the cluster is > 1 marker. */
            var numOfMarkers = aCluster.markers.length;

            if (numOfMarkers > 1) {

                var hueValue;

                if (numOfMarkers >= clusterer.ceilValue)
                    hueValue = -100; //Violet
                else
                    hueValue = Math.floor(220 - (300 / Math.log(clusterer.ceilValue)) * Math.log(numOfMarkers)); //The larger the number, the more intense the hue.

                var clusterSize;

                if (numOfMarkers >= clusterer.ceilValue)
                    clusterSize = clusterer.maxClusterSize;
                else
                    clusterSize = Math.floor(clusterer.minClusterSize + ((clusterer.maxClusterSize - clusterer.minClusterSize) / Math.log(clusterer.ceilValue)) * Math.log(numOfMarkers)); //The larger the number, the larger the icon.

                clusterer.cnv.width = clusterSize;
                clusterer.cnv.height = clusterSize;

                var centerX = clusterSize / 2;
                var centerY = clusterSize / 2;

                clusterer.ctx.clearRect(0, 0, clusterSize, clusterSize);
                clusterer.ctx.beginPath();
                clusterer.ctx.arc(centerX, centerY, clusterSize / 2 - clusterer.clusterLineWidth / 2, 0, 2 * Math.PI, false);
                clusterer.ctx.fillStyle = 'hsla(' + hueValue + ', 50%, 70%, 0.7)';
                clusterer.ctx.fill();
                clusterer.ctx.strokeStyle = 'hsla(' + hueValue + ', 50%, 20%, 0.7)';
                clusterer.ctx.lineWidth = clusterer.clusterLineWidth;
                clusterer.ctx.stroke();
                clusterer.ctx.fillStyle = 'rgb(0,0,0)';
                clusterer.ctx.textAlign = 'center';
                clusterer.ctx.font = 'bold 9pt Arial';
                clusterer.ctx.textBaseline = "middle";
                clusterer.ctx.fillText(numOfMarkers, centerX, centerY);
                newMarker.setIcon(clusterer.cnv.toDataURL());
            }

            google.maps.event.addListener(newMarker, 'click', function() {

                if (clusterer.delegate) {
                    clusterer.delegate.didSelectCluster(clusterer, aCluster, newMarker);
                }
            });

            clusterer.liveMarkers.push(newMarker);
        });
    };

    /* PUBLIC METHODS */
    this.addCoordinates = function (coordinates) {

        var message = {command: "add-coordinates", payload: {coordinates: coordinates}};
        this.worker.postMessage(message);
        this.redraw();
    };

    this.setClusterDistance = function (clusterDistance) {

        var message = {command: "set-cluster-distance", payload: {distance: clusterDistance}};
        this.worker.postMessage(message);
        this.redraw();
    };

    this.setMinClusterSize = function (minClusterSize) {
        this.minClusterSize = minClusterSize;
        this.redraw();
    };

    this.setMaxClusterSize = function (maxClusterSize) {
        this.maxClusterSize = maxClusterSize;
        this.redraw();
    };

    this.redraw = function () {

        var mapBounds = this.map.getBounds();

        if (_.isUndefined(mapBounds)) {

            google.maps.event.addListenerOnce(this.map, 'idle', function () { clusterer.redraw();});

        } else {
            this.worker.postMessage({command: "get-clusters", payload: {zoomLevel: this.map.getZoom(),
                                                                        swLatitude: mapBounds.getSouthWest().lat(),
                                                                        swLongitude: mapBounds.getSouthWest().lng(),
                                                                        neLatitude: mapBounds.getNorthEast().lat(),
                                                                        neLongitude: mapBounds.getNorthEast().lng()}});
        }
    };

    this.clear = function () {

        if (this.worker)
            this.worker.terminate();

        this.worker = new Worker(this.workerURL);
        this.worker.onmessage = this.onmessageFn;
        this.worker.postMessage({command: "init", payload: {geometryURL: this.geometryURL,
                                                            underscoreURL: this.underscoreURL}});
        this.redraw();
    };

    /* call the clear() function on initalization */
    this.clear();
};