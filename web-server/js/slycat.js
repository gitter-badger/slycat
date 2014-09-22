var slycatApp = angular.module("slycat-application", ["ui.bootstrap"]);

slycatApp.controller("slycat-model-controller", ["$scope", "$http", "$modal", function($scope, $http, $modal)
{
  $scope.project = {};
  $scope.model = {};

  $http.get(window.location.href).success(function(data)
  {
    $scope.model = data;

    $http.get("/projects/" + $scope.model.project).success(function(data)
    {
      $scope.project = data;
    });
  });

  $scope.edit = function()
  {
    var edit_model = $modal.open({
      templateUrl: "slycat-edit-model.html",
      controller: edit_model_controller,
      resolve:
      {
        "model" : function() { return {"name":$scope.model.name, "description":$scope.model.description}; },
      },
    });

    edit_model.result.then(function(changes)
    {
      $scope.model.name = changes.name;
      $scope.model.description = changes.description;
      $http.put(window.location.href, changes).error(function(data, status, headers, config)
      {
        console.log(data, status, headers, config);
      });
    });
  }

  var edit_model_controller = function ($scope, $modalInstance, model)
  {
    $scope.model = model;

    $scope.ok = function()
    {
      $modalInstance.close($scope.model);
    }

    $scope.cancel = function()
    {
      $modalInstance.dismiss("cancel");
    }

    $scope.delete = function()
    {
      $modalInstance.close();
    }
  };

}]);
