angular.module('redash', [
    'redash.directives',
    'redash.admin_controllers',
    'redash.controllers',
    'redash.filters',
    'redash.services',
    'redash.renderers',
    'redash.visualization',
    'plotly',
    'plotly-chart',
    'angular-growl',
    'angularMoment',
    'ui.bootstrap',
    'ui.sortable',
    'smartTable.table',
    'ngResource',
    'ngRoute',
    'ui.select',
    'naif.base64',
    'ui.bootstrap.showErrors',
    'ngSanitize'
  ]).config(['$routeProvider', '$locationProvider', '$compileProvider', 'growlProvider', 'uiSelectConfig',
    function ($routeProvider, $locationProvider, $compileProvider, growlProvider, uiSelectConfig) {
      if (clientConfig.clientSideMetrics) {
        Bucky.setOptions({
          host: '/api/metrics'
        });

        Bucky.requests.monitor('ajax_requsts');
        Bucky.requests.transforms.enable('dashboards', /dashboard\/[\w-]+/ig, '/dashboard');
      }

      function getQuery(Query, $route) {
        var query = Query.get({'id': $route.current.params.queryId });
        return query.$promise;
      };

      uiSelectConfig.theme = "bootstrap";

      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|http|data):/);
      $locationProvider.html5Mode(true);
      growlProvider.globalTimeToLive(2000);

      $routeProvider.when('/embed/query/:queryId/visualization/:visualizationId', {
        templateUrl: '/views/visualization-embed.html',
        controller: 'EmbedCtrl',
        reloadOnSearch: false
      });
      $routeProvider.otherwise({
      //  redirectTo: '/embed',
        templateUrl: '/views/visualization-embed.html',
        controller: 'EmbedCtrl',
      });


    }
  ])
   .controller('EmbedCtrl', ['$scope', function ($scope) {} ])
   .controller('EmbeddedVisualizationCtrl', ['$scope', 'Query', 'QueryResult',
    function ($scope, Query, QueryResult) {
       $scope.embed = true;
       $scope.visualization = visualization;
       $scope.query = visualization.query;
       query = new Query(visualization.query);
       $scope.queryResult = new QueryResult({query_result:query_result});
    } ])
   ;
