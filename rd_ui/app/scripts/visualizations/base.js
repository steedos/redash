(function () {
  var VisualizationProvider = function () {
    this.visualizations = {};
    this.visualizationTypes = {};
    var defaultConfig = {
      defaultOptions: {},
      skipTypes: false,
      editorTemplate: null
    }

    this.registerVisualization = function (config) {
      var visualization = _.extend({}, defaultConfig, config);

      // TODO: this is prone to errors; better refactor.
      if (_.isEmpty(this.visualizations)) {
        this.defaultVisualization = visualization;
      }

      this.visualizations[config.type] = visualization;

      if (!config.skipTypes) {
        this.visualizationTypes[config.name] = config.type;
      }
      ;
    };

    this.getSwitchTemplate = function (property) {
      var pattern = /(<[a-zA-Z0-9-]*?)( |>)/

      var mergedTemplates = _.reduce(this.visualizations, function (templates, visualization) {
        if (visualization[property]) {
          var ngSwitch = '$1 ng-switch-when="' + visualization.type + '" $2';
          var template = visualization[property].replace(pattern, ngSwitch);

          return templates + "\n" + template;
        }

        return templates;
      }, "");

      mergedTemplates = '<div ng-switch on="visualization.type">' + mergedTemplates + "</div>";

      return mergedTemplates;
    }

    this.$get = ['$resource', function ($resource) {
      var Visualization = $resource('/api/visualizations/:id', {id: '@id'});
      Visualization.visualizations = this.visualizations;
      Visualization.visualizationTypes = this.visualizationTypes;
      Visualization.renderVisualizationsTemplate = this.getSwitchTemplate('renderTemplate');
      Visualization.editorTemplate = this.getSwitchTemplate('editorTemplate');
      Visualization.defaultVisualization = this.defaultVisualization;

      return Visualization;
    }];
  };

  var VisualizationName = function(Visualization) {
    return {
      restrict: 'E',
      scope: {
        visualization: '='
      },
      template: '<small>{{name}}</small>',
      replace: false,
      link: function (scope) {
        if (Visualization.visualizations[scope.visualization.type].name != scope.visualization.name) {
          scope.name = scope.visualization.name;
        }
      }
    }
  }

  var VisualizationRenderer = function ($location, Visualization) {
    return {
      restrict: 'E',
      scope: {
        visualization: '=',
        queryResult: '='
      },
      // TODO: using switch here (and in the options editor) might introduce errors and bad
      // performance wise. It's better to eventually show the correct template based on the
      // visualization type and not make the browser render all of them.
      template: '<filters></filters>\n' + Visualization.renderVisualizationsTemplate,
      replace: false,
      link: function (scope) {
        scope.$watch('queryResult && queryResult.getFilters()', function (filters) {
          if (filters) {
            scope.filters = filters;
          }
        });
      }
    }
  };

  var VisualizationOptionsEditor = function (Visualization) {
    return {
      restrict: 'E',
      template: Visualization.editorTemplate,
      replace: false
    }
  };

  var Filters = function () {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/filters.html'
    }
  }

  var EditVisualizationForm = function (Events, Visualization, growl) {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/edit_visualization.html',
      replace: true,
      scope: {
        query: '=',
        queryResult: '=',
        visualization: '=?',
        openEditor: '@',
        onNewSuccess: '=?'
      },
      link: function (scope, element, attrs) {
        scope.editRawOptions = currentUser.hasPermission('edit_raw_chart');
        scope.visTypes = Visualization.visualizationTypes;

        scope.newVisualization = function () {
          return {
            'type': Visualization.defaultVisualization.type,
            'name': Visualization.defaultVisualization.name,
            'description': '',
            'options': Visualization.defaultVisualization.defaultOptions
          };
        }

        if (!scope.visualization) {
          var unwatch = scope.$watch('query.id', function (queryId) {
            if (queryId) {
              unwatch();

              scope.visualization = scope.newVisualization();
            }
          });
        }

        scope.$watch('visualization.type', function (type, oldType) {
          // if not edited by user, set name to match type
          if (type && oldType != type && scope.visualization && !scope.visForm.name.$dirty) {
            scope.visualization.name = _.string.titleize(scope.visualization.type);
          }

          if (type && oldType != type && scope.visualization) {
            scope.visualization.options = Visualization.visualizations[scope.visualization.type].defaultOptions;
          }

        });

        scope.submit = function () {
          if (scope.visualization.id) {
            Events.record(currentUser, "update", "visualization", scope.visualization.id, {'type': scope.visualization.type});
          } else {
            Events.record(currentUser, "create", "visualization", null, {'type': scope.visualization.type});
          }

          scope.visualization.query_id = scope.query.id;

          Visualization.save(scope.visualization, function success(result) {
            growl.addSuccessMessage("可视化图表已保存！");

            scope.visualization = scope.newVisualization(scope.query);

            var visIds = _.pluck(scope.query.visualizations, 'id');
            var index = visIds.indexOf(result.id);
            if (index > -1) {
              scope.query.visualizations[index] = result;
            } else {
              // new visualization
              scope.query.visualizations.push(result);
              scope.onNewSuccess && scope.onNewSuccess(result);
            }
          }, function error() {
            growl.addErrorMessage("可视化图表保存失败！");
          });
        };
      }
    }
  };


  angular.module('redash.visualization', [])
      .provider('Visualization', VisualizationProvider)
      .directive('visualizationRenderer', ['$location', 'Visualization', VisualizationRenderer])
      .directive('visualizationOptionsEditor', ['Visualization', VisualizationOptionsEditor])
      .directive('visualizationName', ['Visualization', VisualizationName])
      .directive('filters', Filters)
      .directive('editVisulatizationForm', ['Events', 'Visualization', 'growl', EditVisualizationForm])
})();
