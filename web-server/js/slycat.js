var slycatApp = angular.module("slycat-application", []);

slycatApp.controller("slycat-model-controller", ["$scope", "$http", "$location", function($scope, $http, $location)
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
}]);
