/* This library requires underscore.js to function  */

/* Namespacing */
if (_.isUndefined(self.aj))
    aj = {};

if (_.isUndefined(self.aj.geometry))
    aj.geometry = {};

/* Source Code */
aj.geometry.Point = function (x, y) {
    this.x = x;
    this.y = y;
};


aj.geometry.Coordinate = function (lat, lng) {
    this.lat = lat;
    this.lng = lng;
};


aj.geometry.Size = function (width, height) {
    this.width = width;
    this.height = height;
};


aj.geometry.Marker = function (position, worldPosition, clusterCounter, context) {
    this.position = position;
    this.worldPosition = worldPosition;
    this.clusterCounter = clusterCounter;
    this.context = context;
};


aj.geometry.Cluster = function (initialMarkers) {

    this.markers = initialMarkers;
    this.position = initialMarkers[0].position;
    this.worldPosition = initialMarkers[0].worldPosition;
};


aj.geometry.Rect = function (origin, size) {

    this.origin = origin;
    this.size = size;

    this.containsPoint = function (point) {
        if (this.origin.x <= point.x && (this.origin.x + this.size.width) >= point.x)
            if (this.origin.y <= point.y && (this.origin.y + this.size.height >= point.y))
                return true;

        return false;
    };

    this.containsRect = function (rect) {

        if (this.origin.x <= rect.origin.x && this.origin.y <= rect.origin.y)
            if ((this.origin.x + this.size.width) >= (rect.origin.x + rect.size.width) && (this.origin.y + this.size.height) >= (rect.origin.y + rect.size.height))
                return true;

        return false;
    };

    this.intersectsRect = function (rect) {

        if (this.origin.x < (rect.origin.x + rect.size.width) && (this.origin.x + this.size.width) > rect.origin.x)
            if (this.origin.y < (rect.origin.y + rect.size.height) && (this.origin.y + this.size.height) > rect.origin.y)
                return true;

        return false;
    };

    this.getTopLeftQuadrant = function () {
      return new aj.geometry.Rect(this.origin, new aj.geometry.Size(this.size.width / 2.0, this.size.height / 2.0))
    };

    this.getTopRightQuadrant = function () {
      return new aj.geometry.Rect(new aj.geometry.Point(this.origin.x + this.size.width / 2.0, this.origin.y),
                                      new aj.geometry.Size(this.size.width / 2.0, this.size.height / 2.0))
    };

    this.getBottomLeftQuadrant = function () {
      return new aj.geometry.Rect(new aj.geometry.Point(this.origin.x, this.origin.y + this.size.height / 2.0),
                                      new aj.geometry.Size(this.size.width / 2.0, this.size.height / 2.0))
    };

    this.getBottomRightQuadrant = function () {
      return new aj.geometry.Rect(new aj.geometry.Point(this.origin.x + this.size.width / 2.0, this.origin.y + this.size.height / 2.0),
                                      new aj.geometry.Size(this.size.width / 2.0, this.size.height / 2.0))
    };
};


aj.geometry.TreeNode = function (rect) {

    this.topLeft = null;
    this.topRight = null;
    this.bottomLeft = null;
    this.bottomRight = null;
    this.rect = rect;
    this.contents = [];

    this.getChildCount = function () {
        var childCount = 4;

        if (_.isNull(this.topLeft))
            childCount--;
        if (_.isNull(this.topRight))
            childCount--;
        if (_.isNull(this.bottomLeft))
            childCount--;
        if (_.isNull(this.bottomRight))
            childCount--;

        return childCount;
    }
};


aj.geometry.QuadTree = function (treeDepth, masterNode) {

    this.treeDepth = treeDepth;
    this.masterNode = masterNode;

    this.insertItem = function (item, point) {

        this._insertItem(0, this.masterNode, item, point);
    };

    this.findItemsInRect = function (rect, n) {

        //First we find all the items recursively.
        var items = this._recursivelyFindItemsInRect(0, this.masterNode, rect);

        if (items.length <= n || !n)
            return items;

        //Since the items array is segmented into quadrants, we want to space out the choice as evenly as possible.
        var selectedItems = [];
        var spaceInterval = (items.length - 1) / (n - 1);

        for (var i = 0; i < n; i++) {
            selectedItems.push(items[Math.round(spaceInterval*i)]);
        }

        return selectedItems;
    };

    this._insertItem = function (zoomLevel, node, item, point) {

        if (zoomLevel == this.treeDepth) {
            //Don't call ourselves again. This ends the recursion.

        } else if (node.rect.getTopLeftQuadrant().containsPoint(point)) {
            if (_.isNull(node.topLeft))
                node.topLeft = new aj.geometry.TreeNode(node.rect.getTopLeftQuadrant());

            this._insertItem(zoomLevel + 1, node.topLeft, item, point)

        } else if (node.rect.getTopRightQuadrant().containsPoint(point)) {
            if (_.isNull(node.topRight))
                node.topRight = new aj.geometry.TreeNode(node.rect.getTopRightQuadrant());

            this._insertItem(zoomLevel + 1, node.topRight, item, point)

        } else if (node.rect.getBottomLeftQuadrant().containsPoint(point)) {
            if (_.isNull(node.bottomLeft))
                node.bottomLeft = new aj.geometry.TreeNode(node.rect.getBottomLeftQuadrant());

            this._insertItem(zoomLevel + 1, node.bottomLeft, item, point)

        } else if (node.rect.getBottomRightQuadrant().containsPoint(point)) {
            if (_.isNull(node.bottomRight))
                node.bottomRight = new aj.geometry.TreeNode(node.rect.getBottomRightQuadrant());

            this._insertItem(zoomLevel + 1, node.bottomRight, item, point)
        }

        node.contents.push(item);
    };

    this._recursivelyFindItemsInRect = function (zoomLevel, node, rect) {

        if (node.getChildCount() == 0) {
            //This is a leaf node, so we return its contents. This ends recursion.
            return node.contents;
        } else {

            var items = [];

            if (!_.isNull(node.topLeft) && node.topLeft.rect.intersectsRect(rect)) {
                items = items.concat(this._recursivelyFindItemsInRect(zoomLevel + 1, node.topLeft, rect))
            }
            if (!_.isNull(node.topRight) && node.topRight.rect.intersectsRect(rect)) {
                items = items.concat(this._recursivelyFindItemsInRect(zoomLevel + 1, node.topRight, rect))
            }
            if (!_.isNull(node.bottomLeft) && node.bottomLeft.rect.intersectsRect(rect)) {
                items = items.concat(this._recursivelyFindItemsInRect(zoomLevel + 1, node.bottomLeft, rect))
            }
            if (!_.isNull(node.bottomRight) && node.bottomRight.rect.intersectsRect(rect)) {
                items = items.concat(this._recursivelyFindItemsInRect(zoomLevel + 1, node.bottomRight, rect))
            }

            return items;
        }
    };
};