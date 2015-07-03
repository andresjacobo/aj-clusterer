/* This file is to be used as a web worker in a separate thread */

var treeDepth = 20;
var runloopClusterIterations = 1000;
var clusterCounter = 0; //Used to mark markers already clustered.
var commandCounter = 0; //Used to track the current clustering operation, and abort it if a new one has been requested.
var currentZoomLevel = -1;
var currentClusterDistance = 100; //pixels. Determines how close or far markers should be clustered. Decreasing the distance causes more clusters, but becomes more computationally expensive.
var clusters = null;
var markers = null;

/* This is where we receive and post messages back to the main thread. */
onmessage = function (e) {

    var command = e.data.command;
    var payload = e.data.payload;
    commandCounter++;

    if (command === "init") {

        importScripts(payload.underscoreURL, payload.geometryURL);
        markers = new aj.geometry.QuadTree(treeDepth, new aj.geometry.TreeNode(new aj.geometry.Rect(new aj.geometry.Point(0.0, 0.0), new aj.geometry.Size(256.0, 256.0))));

    } else if (command === "add-coordinates") {

        _.each(payload.coordinates, function (aCoordinate) {

            var coordinate = new aj.geometry.Coordinate(aCoordinate[0], aCoordinate[1]);
            var worldPosition = getWorldPositionForCoordinate(coordinate);
            var newMarker = new aj.geometry.Marker(coordinate, worldPosition, -1, aCoordinate[2]);
            markers.insertItem(newMarker, worldPosition);
        });

    } else if (command === "set-cluster-distance") {

        currentClusterDistance = payload.distance;
        currentZoomLevel = -1;

    } else if (command === "get-clusters") {

        //Begin by setting the global variables if the zoom has changed;
        if (payload.zoomLevel !== currentZoomLevel) {
            clusterCounter++;
            currentZoomLevel = payload.zoomLevel;
            clusters = new aj.geometry.QuadTree(treeDepth, new aj.geometry.TreeNode(new aj.geometry.Rect(new aj.geometry.Point(0.0, 0.0), new aj.geometry.Size(256.0, 256.0))));
        }

        var markersInBounds;
        var swWorldPosition = getWorldPositionForCoordinate(new aj.geometry.Coordinate(payload.swLatitude, payload.swLongitude));
        var neWorldPosition = getWorldPositionForCoordinate(new aj.geometry.Coordinate(payload.neLatitude, payload.neLongitude));

        //We add padding, so that markers right outside the bounds are still taken into account, if possible.
        var numTiles = 1 << currentZoomLevel;
        var worldDistanceTolerance = currentClusterDistance / numTiles;
        swWorldPosition.x = Math.max(0, swWorldPosition.x - worldDistanceTolerance);
        swWorldPosition.y = Math.min(256.0, swWorldPosition.y + worldDistanceTolerance);
        neWorldPosition.x = Math.min(256.0, neWorldPosition.x + worldDistanceTolerance);
        neWorldPosition.y = Math.max(0, neWorldPosition.y - worldDistanceTolerance);

        //We take into account if we're crossing the anti-meridian, in which case we split the bounds in 2.
        if (swWorldPosition.x > neWorldPosition.x) {

            var boundsRect1 = new aj.geometry.Rect(new aj.geometry.Point(swWorldPosition.x, neWorldPosition.y), new aj.geometry.Size(256.0 - swWorldPosition.x, swWorldPosition.y - neWorldPosition.y));
            var boundsRect2 = new aj.geometry.Rect(new aj.geometry.Point(0, neWorldPosition.y), new aj.geometry.Size(neWorldPosition.x, swWorldPosition.y - neWorldPosition.y));
            markersInBounds = markers.findItemsInRect(boundsRect1);
            markersInBounds = markersInBounds.concat(markers.findItemsInRect(boundsRect2));
            recursivelyGetClusters(markersInBounds, [boundsRect1, boundsRect2], worldDistanceTolerance, commandCounter, 0);

        } else {

            var boundsRect = new aj.geometry.Rect(new aj.geometry.Point(swWorldPosition.x, neWorldPosition.y), new aj.geometry.Size(neWorldPosition.x - swWorldPosition.x, swWorldPosition.y - neWorldPosition.y));
            markersInBounds = markers.findItemsInRect(boundsRect);
            recursivelyGetClusters(markersInBounds, [boundsRect], worldDistanceTolerance, commandCounter, 0);
        }
    }
};


/* This function clusters the passed markers into clusters given the tolerance passed. It
 * references the global clusters QuadTree, adding and/or modifying cluster instances as necessary. This method also
 * marks markers that have been clustered by setting their clusterCounter property to the global clusterCounter variable.
 * If the same marker is passed to this function and the global clusterCounter has not changed (i.e. because the zoom
 * level is the same, then the marker will be ignored to increase performance. This method returns control to the runloop
 * every runloopClusterIterations iterations, then is immediately re-invoked until it is done. This is useful because the
 * web worker can receive messages when it regains control of the runloop, allowing it to change the commandCounter,
 * in which case the self-recursion will be aborted to give priority to the new command/operation.
 */
recursivelyGetClusters = function (markers, boundsRects, worldDistanceTolerance, currentCommandCounter, offset) {

    if (currentCommandCounter !== commandCounter) {
        return;
    }

    var markersToCluster = markers.slice(offset, offset + runloopClusterIterations);

    _.each(markersToCluster, function (aMarker) {

        if (aMarker.clusterCounter !== clusterCounter) {

            var closestCluster = getClosestClusterForMarker(aMarker, worldDistanceTolerance);

            if (_.isNull(closestCluster)) {
                closestCluster = new aj.geometry.Cluster([aMarker]);
                clusters.insertItem(closestCluster, closestCluster.worldPosition);
            } else {

                closestCluster.markers.push(aMarker);
            }

            aMarker.clusterCounter = clusterCounter;
        }
    });

    if (markersToCluster.length == runloopClusterIterations) {
        //We call ourselves again immediately, allowing the web worker to regain control of the runloop.
        setTimeout(function () {
            recursivelyGetClusters(markers, boundsRects, worldDistanceTolerance, currentCommandCounter, offset + runloopClusterIterations);
        }, 0);
    } else {
       //We're done, so we post a message back with the clusters.
       var clustersInBounds = [];

        _.each(boundsRects, function (boundRect) {
            clustersInBounds = clustersInBounds.concat(clusters.findItemsInRect(boundRect));
        });

        self.postMessage({clusters: clustersInBounds});
    }
};


/* This function finds the closest cluster to aMarker on a mercator projection. If no cluster is closer than
 * worldDistanceTolerance, this function returns null */
getClosestClusterForMarker = function (aMarker, worldDistanceTolerance) {

    var closestCluster = null;
    var closestDistance = Number.POSITIVE_INFINITY;
    var rectOrigin = new aj.geometry.Point(aMarker.worldPosition.x - worldDistanceTolerance / 2.0, aMarker.worldPosition.y - worldDistanceTolerance / 2.0);
    var rectSize = new aj.geometry.Size(worldDistanceTolerance, worldDistanceTolerance);

    var nearbyClusters = clusters.findItemsInRect(new aj.geometry.Rect(rectOrigin, rectSize));

    _.each(nearbyClusters, function (aCluster) {

        //Estimate the distance between the two coordinates. This is useless except for comparisons.
        var distance = getApproxDistanceBetweenPoints(aCluster.worldPosition, aMarker.worldPosition);

        if (distance < closestDistance) {
            closestCluster = aCluster;
            closestDistance = distance;
        }
    });

    return closestCluster;
};


/* This function is useful to compare the distance between to cartesian points. */
getApproxDistanceBetweenPoints = function (a, b) {

    return Math.pow(a.y - b.y, 2) + Math.pow(a.x - b.x, 2);
};


/* This function converts a coordinate to 256x256 Mercator projection. */
getWorldPositionForCoordinate = function (coordinate) {

  var mapWidth = 256;
  var mapHeight = 256;
  var x = (coordinate.lng+180)*(mapWidth/360);

  var y;

  if (coordinate.lat > 85.0) {
      y = 0;
  } else if (coordinate.lat < -85.0) {
      y = mapHeight;
  } else {
      var latRad = coordinate.lat*Math.PI/180;
      y = Math.log(Math.tan((latRad/2) + (Math.PI/4)));
      y = (mapHeight / 2) - (mapWidth * y / (2 * Math.PI));
  }

  return new aj.geometry.Point(x, y);
};