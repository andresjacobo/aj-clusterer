## ``Clusterer`` Class Reference

### Constructor

- ``aj.geometry.Clusterer(map, delegate, asyncURL, geometryURL, underscoreURL)``
	- ***map***: The Google Map instance where the clusterer will display the coordinates.
	- ***delegate***: An optional delegate that will be notified whenever a cluster or marker is clicked/tapped.
	- ***asyncURL***: The URL to the ``aj-clusterer-async-min.js`` file. It is referenced by background threads.
	- ***geometryURL***: The URL to the ``aj-geometry-min.js`` file. It is referenced by background threads.
	- ***underscoreURL***: The URL to the ``underscore.js`` file. It is referenced by background threads. Note that you will still need to load underscore in your page for the main thread to reference it.


### Public Methods

- ``addCoordinates(coordinates)`` *Use this method to add coordinates to the Clusterer at any time. Invoking this method causes a redraw.*
	- ***coordinates***: An array of 0 or more coordinates to add. See readme for details.

- ``setClusterDistance(distance)`` *Sets how close or far apart coordinates should be clustered. Invoking this method causes a redraw.*
	- ***distance***: The distance, in pixels, that the clusters should be spaced apart. A smaller value will result in more clusters being displayed, but will also decrease performance in large data sets.

- ``setMinClusterSize(minClusterSize)`` *Sets the minimum size of a cluster icon. Invoking this method causes a redraw.*
	- ***minClusterSize***: The minimum size, in pixels, of a cluster.

- ``setMaxClusterSize(maxClusterSize)`` *Sets the maximum size of a cluster icon. Invoking this method causes a redraw.*
	- ***maxClusterSize***: The maximum size, in pixels, of a cluster.

- ``redraw()`` *Forces a redraw of the clusters on the map. Normally you shouldn't need to invoke this method.*

- ``clear()`` *Removes all the coordinates from the clusterer and the map.*

### Delegate Methods

- ``didSelectCluster(clusterer, cluster, googleMarker)`` This method on the delegate will be invoked whenever a cluster or marker is clicked/tapped*
	- ***clusterer***: The Clusterer instance that invoked the method.
	- ***cluster***: An ``aj.geometry.Cluster`` istance representing all the data of the selected cluster. See the *Appendix* for details.
	- ***googleMarker***: The actual google.maps.Marker instance clicked on the map. Useful for attaching an InfoWindow or performing other operations.

### Appendix

#### ``aj.geometry.Cluster`` Object
A Cluster object contains the following properties:

- ***markers***: An array containing ``aj.geometry.Marker`` objects that each represent an individual coordinate.
- ***position***: The geographical position of the Cluster on the map defined as: ``{lat, long}``.
- ***worldPosition***: Cartesian coordinate ``{x, y}`` showing the Mercatorian position of the Cluster. Normally used internally to calculate the clusters.

#### ``aj.geometry.Marker`` Object
A Marker object contains the following properties:

- ***position***: The geographical position of the Marker on the map defined as: ``{lat, long}``.
- ***worldPosition***: Cartesian coordinate ``{x, y}`` showing the Mercatorian position of the Marker. Normally used internally to calculate the clusters.
- ***context (optional)***: If you passed a context as the 3rd item of a coordinate, it will be assigned to the Marker's context property. Otherwise this property is undefined.