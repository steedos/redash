(function() {
  'use strict';

  function QuerySourceCtrl(Events, growl, $controller, $scope, $location, Query, Visualization, KeyboardShortcuts) {
    // extends QueryViewCtrl
    $controller('QueryViewCtrl', {$scope: $scope});
    // TODO:
    // This doesn't get inherited. Setting it on this didn't work either (which is weird).
    // Obviously it shouldn't be repeated, but we got bigger fish to fry.
    var DEFAULT_TAB = 'table';

    Events.record(currentUser, 'view_source', 'query', $scope.query.id);

    var isNewQuery = !$scope.query.id,
        queryText = $scope.query.query,
        // ref to QueryViewCtrl.saveQuery
        saveQuery = $scope.saveQuery;

    $scope.sourceMode = true;
    $scope.canEdit = currentUser.canEdit($scope.query) || clientConfig.allowAllToEditQueries;
    $scope.isDirty = false;
    $scope.base_url = $location.protocol()+"://"+$location.host()+":"+$location.port();

    $scope.newVisualization = undefined;

    // @override
    Object.defineProperty($scope, 'showDataset', {
      get: function() {
        return $scope.queryResult && $scope.queryResult.getStatus() == 'done';
      }
    });

    var shortcuts = {
      'meta+s': function () {
        if ($scope.canEdit) {
          $scope.saveQuery();
        }
      },
      'ctrl+s': function () {
        if ($scope.canEdit) {
          $scope.saveQuery();
        }
      },
      // Cmd+Enter for Mac
      'meta+enter': $scope.executeQuery,
      // Ctrl+Enter for PC
      'ctrl+enter': $scope.executeQuery
    };

    KeyboardShortcuts.bind(shortcuts);

    // @override
    $scope.saveQuery = function(options, data) {
      var savePromise = saveQuery(options, data);

      savePromise.then(function(savedQuery) {
        queryText = savedQuery.query;
        $scope.isDirty = $scope.query.query !== queryText;

        if (isNewQuery) {
          // redirect to new created query (keep hash)
          $location.path(savedQuery.getSourceLink()).replace();
        }
      });

      return savePromise;
    };

    $scope.duplicateQuery = function() {
      Events.record(currentUser, 'fork', 'query', $scope.query.id);
      $scope.query.name = '拷贝于 (#'+$scope.query.id+') '+$scope.query.name;
      $scope.query.id = null;
      $scope.query.schedule = null;
      $scope.saveQuery({
        successMessage: '已拷贝新建！',
        errorMessage: '此查询无法拷贝新建！'
      }).then(function redirect(savedQuery) {
        // redirect to forked query (clear hash)
        $location.url(savedQuery.getSourceLink()).replace()
      });
    };

    $scope.deleteVisualization = function($e, vis) {
      $e.preventDefault();
      if (confirm('确定要删除 ' + vis.name + ' ?')) {
        Events.record(currentUser, 'delete', 'visualization', vis.id);

        Visualization.delete(vis, function() {
          if ($scope.selectedTab == vis.id) {
            $scope.selectedTab = DEFAULT_TAB;
            $location.hash($scope.selectedTab);
          }
          $scope.query.visualizations =
            $scope.query.visualizations.filter(function (v) {
              return vis.id !== v.id;
            });
        }, function () {
          growl.addErrorMessage("删除可视化图表错误！ 请确认是否在仪表盘中使用此图表。");
        });

      }
    };

    $scope.$watch('query.query', function(newQueryText) {
      $scope.isDirty = (newQueryText !== queryText);
    });

    $scope.$on('$destroy', function destroy() {
      KeyboardShortcuts.unbind(shortcuts);
    });

    if (isNewQuery) {
      // save new query when creating a visualization
      var unbind = $scope.$watch('selectedTab == "add"', function(triggerSave) {
        if (triggerSave) {
          unbind();
          $scope.saveQuery();
        }
      });
    }
  }

  angular.module('redash.controllers').controller('QuerySourceCtrl', [
    'Events', 'growl', '$controller', '$scope', '$location', 'Query',
    'Visualization', 'KeyboardShortcuts', QuerySourceCtrl
    ]);
})();
