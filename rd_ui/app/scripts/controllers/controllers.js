(function () {
  var dateFormatter = function (value) {
    if (!value) {
      return "-";
    }

    return value.format(clientConfig.dateTimeFormat);
  };

  var QuerySearchCtrl = function($scope, $location, $filter, Events, Query) {
    $scope.$parent.pageTitle = "Queries Search";

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };

    $scope.gridColumns = [
      {
        "label": "名称",
        "map": "name",
        "cellTemplateUrl": "/views/queries_query_name_cell.html"
      },
      {
        'label': '创建者',
        'map': 'user.name'
      },
      {
        'label': '创建日期',
        'map': 'created_at',
        'formatFunction': dateFormatter
      },
      {
        'label': '刷新一览表',
        'map': 'schedule',
        'formatFunction': function (value) {
          return $filter('scheduleHumanize')(value);
        }
      }
    ];

    $scope.queries = [];
    $scope.$parent.term = $location.search().q;

    Query.search({q: $scope.term }, function(results) {
      $scope.queries = _.map(results, function(query) {
        query.created_at = moment(query.created_at);
        return query;
      });
    });

    $scope.search = function() {
      if (!angular.isString($scope.term) || $scope.term.trim() == "") {
        $scope.queries = [];
        return;
      }

      $location.search({q: $scope.term});
    };

    Events.record(currentUser, "search", "query", "", {"term": $scope.term});
  };

  var QueriesCtrl = function ($scope, $http, $location, $filter, Query) {
    $scope.$parent.pageTitle = "All Queries";
    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
      isGlobalSearchActivated: true};

    $scope.allQueries = [];
    $scope.queries = [];

    var filterQueries = function () {
      $scope.queries = _.filter($scope.allQueries, function (query) {
        if (!$scope.selectedTab) {
          return false;
        }

        if ($scope.selectedTab.key == 'my') {
          return query.user.id == currentUser.id && query.name != 'New Query';
        } else if ($scope.selectedTab.key == 'drafts') {
          return query.user.id == currentUser.id && query.name == 'New Query';
        }

        return query.name != 'New Query';
      });
    }

    Query.query(function (queries) {
      $scope.allQueries = _.map(queries, function (query) {
        query.created_at = moment(query.created_at);
        query.retrieved_at = moment(query.retrieved_at);
        return query;
      });

      filterQueries();
    });

    $scope.gridColumns = [
      {
        "label": "名称",
        "map": "name",
        "cellTemplateUrl": "/views/queries_query_name_cell.html"
      },
      {
        'label': '创建者',
        'map': 'user.name'
      },
      {
        'label': '创建日期',
        'map': 'created_at',
        'formatFunction': dateFormatter
      },
      {
        'label': '运行时间',
        'map': 'runtime',
        'formatFunction': function (value) {
          return $filter('durationHumanize')(value);
        }
      },
      {
        'label': '最近执行日期',
        'map': 'retrieved_at',
        'formatFunction': dateFormatter
      },
      {
        'label': '刷新一览表',
        'map': 'schedule',
        'formatFunction': function (value) {
          return $filter('scheduleHumanize')(value);
        }
      }
    ]

    $scope.tabs = [
      {"name": "我的查询", "key": "my"},
      {"key": "all", "name": "所有查询"},
      {"key": "drafts", "name": "草稿箱"}
    ];

    $scope.$watch('selectedTab', function (tab) {
      if (tab) {
        $scope.$parent.pageTitle = tab.name;
      }

      filterQueries();
    });
  }

  var MainCtrl = function ($scope, $location, Dashboard, notifications) {
    $scope.version = clientConfig.version;
    $scope.newVersionAvailable = clientConfig.newVersionAvailable && currentUser.hasPermission("admin");

    if (clientConfig.clientSideMetrics) {
      $scope.$on('$locationChangeSuccess', function(event, newLocation, oldLocation) {
        // This will be called once per actual page load.
        Bucky.sendPagePerformance();
      });
    }

    $scope.dashboards = [];
    $scope.reloadDashboards = function () {
      Dashboard.query(function (dashboards) {
        $scope.dashboards = _.sortBy(dashboards, "name");
        $scope.allDashboards = _.groupBy($scope.dashboards, function (d) {
          parts = d.name.split(":");
          if (parts.length == 1) {
            return "Other";
          }
          return parts[0];
        });
        $scope.otherDashboards = $scope.allDashboards['Other'] || [];
        $scope.groupedDashboards = _.omit($scope.allDashboards, 'Other');
      });
    };

    $scope.searchQueries = function() {
      $location.path('/queries/search').search({q: $scope.term});
    };

    $scope.reloadDashboards();

    $scope.currentUser = currentUser;
    $scope.newDashboard = {
      'name': null,
      'layout': null
    }

    $(window).click(function () {
      notifications.getPermissions();
    });
  };

  var IndexCtrl = function ($scope, Events, Dashboard) {
    Events.record(currentUser, "view", "page", "homepage");
    $scope.$parent.pageTitle = "Home";
  };

  var PersonalIndexCtrl = function ($scope, Events, Dashboard, Query) {
    Events.record(currentUser, "view", "page", "personal_homepage");
    $scope.$parent.pageTitle = "Home";

    $scope.recentQueries = Query.recent();
    $scope.recentDashboards = Dashboard.recent();
  };

  angular.module('redash.controllers', [])
    .controller('QueriesCtrl', ['$scope', '$http', '$location', '$filter', 'Query', QueriesCtrl])
    .controller('IndexCtrl', ['$scope', 'Events', 'Dashboard', IndexCtrl])
    .controller('PersonalIndexCtrl', ['$scope', 'Events', 'Dashboard', 'Query', PersonalIndexCtrl])
    .controller('MainCtrl', ['$scope', '$location', 'Dashboard', 'notifications', MainCtrl])
    .controller('QuerySearchCtrl', ['$scope', '$location', '$filter', 'Events', 'Query',  QuerySearchCtrl]);
})();
