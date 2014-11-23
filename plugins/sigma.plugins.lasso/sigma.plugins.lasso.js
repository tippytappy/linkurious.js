;(function (undefined) {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  // Initialize package:
  sigma.utils.pkg('sigma.plugins');

  /**
   * Sigma Lasso
   * =============================
   *
   * @author Florent Schildknecht <florent.schildknecht@gmail.com> (Florent Schildknecht)
   * @version 0.0.1
   */
   var _sigmaInstance = undefined,
       _graph = undefined,
       _renderer = undefined,
       _body,
       _activated = false,
       _settings = {
        'fillStyle': 'rgb(200, 200, 200)',
        'strokeStyle': 'black',
        'lineWidth': 5,
        'fillWhileDrawing': false
       },
       _drawingCanvas = undefined,
       _drawingContext = undefined,
       _drewPoints = [],
       _selectedNodes = [],
       isDrawing = false;

  /**
   * Overwrites object1's values with object2's and adds object2's if non existent in object1
   * @param object1
   * @param object2
   * @returns object3 a new object based on object1 and object2
   */
  function mergeOptions (object1, object2) {
      var object3 = {}, attrname;
      for (attrname in object1) {
        object3[attrname] = object1[attrname];
      }
      for (attrname in object2) {
        object3[attrname] = object2[attrname];
      }
      return object3;
  }

  function onMouseDown (event) {
    var drawingRectangle = _drawingCanvas.getBoundingClientRect();

    if (_activated) {
      isDrawing = true;
      _drewPoints = [];
      _selectedNodes = [];
      _drawingContext.beginPath();
      _drawingContext.lineWidth = _settings.lineWidth;
      _drawingContext.strokeStyle = _settings.strokeStyle;
      _drawingContext.fillStyle = _settings.fillStyle;

      _drewPoints.push({
        x: event.clientX - drawingRectangle.left,
        y: event.clientY - drawingRectangle.top
      });
      _drawingContext.moveTo(event.clientX - drawingRectangle.left, event.clientY - drawingRectangle.top);

      event.stopPropagation();
    }
  }

  function onMouseMove (event) {
    var drawingRectangle = _drawingCanvas.getBoundingClientRect();

    if (_activated && isDrawing) {
      _drewPoints.push({
        x: event.clientX - drawingRectangle.left,
        y: event.clientY - drawingRectangle.top
      });
      _drawingContext.lineTo(event.clientX - drawingRectangle.left, event.clientY - drawingRectangle.top);

      _drawingContext.stroke();
      if (_settings.fillWhileDrawing) {
        _drawingContext.fill();
      }

      event.stopPropagation();
    }
  }

  function onMouseUp (event) {
    if (_activated) {
      isDrawing = false;

      // Select the nodes inside the path
      var nodes = _sigmaInstance.graph.nodes(),
        nodesLength = nodes.length,
        i = 0;

      console.log(_drewPoints);

      // Redraw the path invisibly to check for isPointInPath : without filling or stroking
      _drawingContext.save();
      _drawingContext.beginPath();
      _drawingContext.moveTo(_drewPoints[0].x, _drewPoints[0].y);
      for (i = 1; i < _drewPoints.length; i++) {
        _drawingContext.moveTo(_drewPoints[i].x, _drewPoints[i].y);
      }

      while (nodesLength--) {
        var node = nodes[nodesLength],
            x = node.x,
            y = node.y;
        console.log(x, y);

        if (_drawingContext.isPointInPath(x, y)) {
          _selectedNodes.push(node);
        }
      }

      console.log('selected', _selectedNodes);

      // Clear the drawing canvas
      _drawingContext.clearRect(0, 0, _drawingCanvas.width, _drawingCanvas.height);

      event.stopPropagation();
    }
  }

  /**
   * Lasso Object
   * ------------------
   * @param  {sigma}    sigmaInstance The related sigma instance.
   * @param  {renderer} renderer      The sigma instance renderer.
   * @param  {object}   settings      A list of settings.
   */
  function Lasso (sigmaInstance, renderer, settings) {
    // A quick hardcoded rule to prevent people from using this plugin with the
    // WebGL renderer (which is impossible at the moment):
    if (
      sigma.renderers.webgl &&
      renderer instanceof sigma.renderers.webgl
    )
      throw new Error(
        'The sigma.plugins.lasso is not compatible with the WebGL renderer'
      );

    _sigmaInstance = sigmaInstance;
    _graph = sigmaInstance.graph;
    _renderer = renderer;
    _settings = mergeOptions(_settings, settings || {});
    _body = document.body;

    console.log('created with', _body, _settings);
  };

  /**
   * This method is used to destroy the lasso.
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   * > lasso.clear();
   *
   * @return {sigma.plugins.lasso} Returns the instance.
   */
  Lasso.prototype.clear = function () {
    this.unactivate();
    lasso = null;

    return this;
  };

  /**
   * This method is used to activate the lasso mode.
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   * > lasso.activate();
   *
   * @return {sigma.plugins.lasso} Returns the instance.
   */
  Lasso.prototype.activate = function () {
    if (!_activated) {
      _activated = true;

      // Add a new background layout canvas to draw the path on
      if (!_renderer.domElements['lasso-background']) {
        _renderer.initDOM('canvas', 'lasso-background');
        _renderer.domElements['lasso-background'].width = _renderer.container.offsetWidth;
        _renderer.domElements['lasso-background'].height = _renderer.container.offsetHeight;
        _renderer.container.appendChild(_renderer.domElements['lasso-background']);
        _drawingCanvas = _renderer.domElements['lasso-background'];
        _drawingContext = _drawingCanvas.getContext('2d');
      }

      this.bindAll();

      console.log('activated');
    }

    return this;
  };

  /**
   * This method is used to unactivate the lasso mode.
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   * > lasso.unactivate();
   *
   * @return {sigma.plugins.lasso} Returns the instance.
   */
  Lasso.prototype.unactivate = function () {
    if (_activated) {
      _activated = false;

      if (_renderer.domElements['lasso-background']) {
        _renderer.container.removeChild(_renderer.domElements['lasso-background']);
        delete _renderer.domElements['lasso-background'];
        _drawingCanvas = null;
        _drawingContext = null;
      }

      this.unbindAll();

      console.log('unactivated');
    }
    return this;
  };

  /**
   * This method is used to activate or unactivate the lasso mode.
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   * > lasso.toggleActivation();
   *
   * @return {sigma.plugins.lasso} Returns the instance.
   */
  Lasso.prototype.toggleActivation = function () {
    if (_activated) {
      this.unactivate();
    } else {
      this.activate();
    }

    return this;
  };

  /**
   * This method is used to bind all events of the lasso mode.
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   * > lasso.activate();
   *
   * @return {sigma.plugins.lasso} Returns the instance.
   */
  Lasso.prototype.bindAll = function () {
    _body.addEventListener('mousedown', onMouseDown);
    _body.addEventListener('mousemove', onMouseMove);
    _body.addEventListener('mouseup', onMouseUp);

    return this;
  };

  /**
   * This method is used to unbind all events of the lasso mode.
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   * > lasso.activate();
   *
   * @return {sigma.plugins.lasso} Returns the instance.
   */
  Lasso.prototype.unbindAll = function () {
    _body.removeEventListener('mousedown', onMouseDown);
    _body.removeEventListener('mousemove', onMouseMove);
    _body.removeEventListener('mouseup', onMouseUp);

    return this;
  };

  /**
   * This method is used to retrieve the previously selected nodes
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   * > lasso.getSelectedNodes();
   *
   * @return {array} Returns an array of nodes.
   */
  Lasso.prototype.getSelectedNodes = function () {
    return _selectedNodes;
  };

  /**
   * Interface
   * ------------------
   *
   * > var lasso = new sigma.plugins.lasso(sigmaInstance);
   */
  var lasso = null;

  /**
   * @param  {sigma}    sigmaInstance The related sigma instance.
   * @param  {renderer} renderer      The sigma instance renderer.
   * @param  {object}   settings      A list of settings.
   *
   * @return {sigma.plugins.lasso} Returns the instance
   */
  sigma.plugins.lasso = function (sigmaInstance, renderer, settings) {
    // Create lasso if undefined
    if (!lasso) {
      lasso = new Lasso(sigmaInstance, renderer, settings);
    }

    sigmaInstance.bind('kill', function () {
      lasso.unactivate();
      lasso = null;
    });

    return lasso;
  };

}).call(this);