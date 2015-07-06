## What is the AJ Clusterer Library?

A lightweight, easy to use, open-source (MIT license) clustering library for use with the Google Maps JavaScript API.
It was inspired by the excellent [MarkerClusterer](https://github.com/googlemaps/js-marker-clusterer) library. Compared to MarkerClusterer, this library offers less flexibility, but has two distinct advantages:

1. It is arguably easier to use (And has cuter default icons!).
2. It takes advantage of multi-threading on modern clients to achieve better performance and dramatically more responsiveness when dealing with large datasets. 

If you like the library and have time, consider contributing to it! This library was made to solve performance problems with data vizualization at Robert McNeel & Associates.

## Live demo
View a live demo [here](https://rawgit.com/andresjacobo/aj-clusterer/master/demo.html)!

## Requirements for using this library

### Web browser requirements:
This library uses many modern JavaScript features, and so requires a modern browser to run:

1. Safari 6 or later.
2. IE 10 or later.
3. A recent version of Chrome, Firefox, or Opera.
4. Other browsers adhering to the latest standards should also work.

### Dependencies:
This library depends on the following 2 libraries to run:

1. ``underscore.js``. A lightweight and popular utility library used for a lot of the heavy computation. Get it [here](http://underscorejs.org).
2. ``Google Maps JavaScript API``. A pretty obvious requirement, although the heavy lifting is decoupled allowing for the future possibility of using it with other mapping libraries.

##Getting started
Follow the steps below and start clustering away in minutes!

- **Get the source code.** There are three JS files you'll need: ``aj-clusterer-min.js``, ``aj-clusterer-async-min.js``, and ``aj-geometry-min.js``. They are all in the repository. They are minified to minimize download time. You are also welcome to exchange them for the non-minified versions. They are the same.

- **Load aj-clusterer.js and its dependencies in your page.** Don't load ``aj-clusterer-async-min.js`` or ``aj-geometry-min.js``. These are used by background threads and are not used directly.

#######
	<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY_HERE"></script>
	<script src="/path/to/underscore-min.js"></script>
	<script src="/js/path/to/aj-clusterer-min.js"></script>

- **Setup your Google Map as usual.** Nothing special here!

#######
	var mapOptions = {
  		center: { lat: 26.397, lng: -81.0},
  		zoom: 6,
  		minZoom: 3
	};
	
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	
- **Create a new Clusterer instance.** To do so, pass it the map we just created, a delagate (which we will configure in the next steps), as well as the URLs for ``aj-clusterer-async-min.js``, ``aj-geometry-min.js`` and ``underscore.js``. Background threads managed by the Clusterer will reference these URLs when they're doing their work.

#######
	var clusterer = new aj.geometry.Clusterer(map, delegate, "/path/to/aj-clusterer-async-min.js", "/path/to/aj-geometry-min.js", "/path/to/underscore-min.js");
	
- **Add data to the Clusterer.** You can add coordiantes to the Clusterer at any time. It expects an array of coordinates (which are themselves simple ``[lat, lon]`` arrays). You can *optionally* add an object as the 3rd item of a coordinate to identify it when it is passed back to the delegate. If you do add an object, keep it small to maximize performance. (more info in the next steps).

#######
	var coordinates = [ [26, -81, {name: 'Miami', country: 'US'}], 
					    [27, -81, {name: 'Ft. Lauderdale', country: 'US'}],
						[35, 139, {name: 'Tokyo', country: 'JP'}],
						[2, 41, {name: 'Barcelona' country: 'ES'}]
					  ]
	
	clusterer.addCoordinates(coordinates); //And they will magically appear on the map!
	
- **Setup the delegate.** The delegate will be notified whenever a cluster or a lonely marker is clicked/tapped. The delegate can be any object, including the page's window. Here we will just create a simple delegate object *before* we declare the Clusterer:

#######
	var infoWindow = new google.maps.InfoWindow({});

	var delegate = {
  		didSelectCluster: function (clusterer, cluster, googleMarker) { 
          infoWindow.open(map, googleMarker); //See the reference for details on didSelectCluster.
  		}
	};
	
	//Rest of code goes here.
	
- **Advanced: Dynamically change the Clusterer's behavior.** Read the *Reference* for a detailed explanation of the ``Clusterer`` class, and how you can use it to dynamically change its behavior.
