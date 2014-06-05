/**
 * This plugin provides a method to drag & drop nodes. Check the
 * sigma.plugins.dragNodes function doc or the examples/basic.html &
 * examples/api-candy.html code samples to know more.
 */
(function() {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  sigma.utils.pkg('sigma.plugins');

  /**
   * This function will add `mousedown`, `mouseup` & `mousemove` events to the
   * nodes in the `overNode`event to perform drag & drop operations. It uses
   * `linear interpolation` [http://en.wikipedia.org/wiki/Linear_interpolation]
   * and `rotation matrix` [http://en.wikipedia.org/wiki/Rotation_matrix] to
   * calculate the X and Y coordinates from the `cam` or `renderer` node
   * attributes. These attributes represent the coordinates of the nodes in
   * the real container, not in canvas.
   *
   * Recognized parameters:
   * **********************
   * @param  {sigma}    s        The related sigma instance.
   * @param  {renderer} renderer The related renderer instance.
   */
  sigma.plugins.dragNodes = function(s, renderer) {
    // A quick hardcoded rule to prevent people from using this plugin with the
    // WebGL renderer (which is impossible at the moment):
    if (
      sigma.renderers.webgl &&
      renderer instanceof sigma.renderers.webgl
    )
      throw new Error(
        'The sigma.plugins.dragNodes is not compatible with the WebGL renderer'
      );

    var _body = document.body,
        _container = renderer.container,
        _mouse = _container.lastChild,
        _camera = renderer.camera,
        _node = null,
        _prefix = '',
        _isOverNode = [],
        _isMouseDown = false,
        _isMouseOverCanvas = false;

    // It removes the initial substring ('read_') if it's a WegGL renderer.
    if (renderer instanceof sigma.renderers.webgl) {
      _prefix = renderer.options.prefix.substr(5);
    } else {
      _prefix = renderer.options.prefix;
    }

    var nodeMouseOver = function(event) {
      // Deal with overNode being triggered multiple times
      if(!event.data.node.over) {
        event.data.node.over = true;
        // Add node to array of current nodes over
        _isOverNode.push(event.data.node);

        if(_isOverNode.length && ! _isMouseDown) {
          // Set the current node to be the last one in the array
          _node = _isOverNode[_isOverNode.length - 1];
          _mouse.addEventListener('mousedown', nodeMouseDown);
        }
      }
    };

    var treatOutNode = function(event) {
      // Deal with outNode being triggered multiple times
      if(event.data.node.over) {
        event.data.node.over = false;
        // Check if there is an index of the node in the array and remove it
        var indexCheck = _isOverNode.map(function(e) { return e; }).indexOf(event.data.node);
        _isOverNode.splice(indexCheck, 1);

        if(_isOverNode.length && ! _isMouseDown) {
          _node = _isOverNode[_isOverNode.length - 1];
        } else {
          _mouse.removeEventListener('mousedown', nodeMouseDown);
        }
      }
    };

    var nodeMouseDown = function(event) {
      _isMouseDown = true;
      var size = s.graph.nodes().length;
      if (size > 1) {
        _mouse.removeEventListener('mousedown', nodeMouseDown);
        _body.addEventListener('mousemove', nodeMouseMove);
        _body.addEventListener('mouseup', nodeMouseUp);

        // Deactivate drag graph.
        renderer.settings({mouseEnabled: false, enableHovering: false});
        s.refresh();
      }
    };

    var nodeMouseUp = function(event) {
      _isMouseDown = false;
      _mouse.addEventListener('mousedown', nodeMouseDown);
      _body.removeEventListener('mousemove', nodeMouseMove);
      _body.removeEventListener('mouseup', nodeMouseUp);

      // Activate drag graph.
      renderer.settings({mouseEnabled: true, enableHovering: true});
      s.refresh();
    };

    var nodeMouseMove = function(event) {
      var x = event.pageX - _container.offsetLeft,
          y = event.pageY - _container.offsetTop,
          cos = Math.cos(_camera.angle),
          sin = Math.sin(_camera.angle),
          nodes = s.graph.nodes(),
          ref = [];

      // Getting and derotating the reference coordinates.
      for (var i = 0; i < 2; i++) {
        var n = nodes[i];
        var aux = {
          x: n.x * cos + n.y * sin,
          y: n.y * cos - n.x * sin,
          renX: n[_prefix + 'x'],
          renY: n[_prefix + 'y'],
        };
        ref.push(aux);
      }

      // Applying linear interpolation.
      x = ((x - ref[0].renX) / (ref[1].renX - ref[0].renX)) *
        (ref[1].x - ref[0].x) + ref[0].x;
      y = ((y - ref[0].renY) / (ref[1].renY - ref[0].renY)) *
        (ref[1].y - ref[0].y) + ref[0].y;

      // Rotating the coordinates.
      _node.x = x * cos - y * sin;
      _node.y = y * cos + x * sin;

      s.refresh();
    };

    renderer.bind('overNode', nodeMouseOver);
    renderer.bind('outNode', treatOutNode);
  };

}).call(window);