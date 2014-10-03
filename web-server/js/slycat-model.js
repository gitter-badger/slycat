var module = angular.module("slycat-model", ["slycat-configuration", "slycat-navbar", "ui.bootstrap"]);

module.controller("slycat-model-controller", ["$scope", "$window", "$http", "$modal", "slycat-configuration", function($scope, $window, $http, $modal, configuration)
{
  $scope.projects = {"path" : configuration["server-root"] + "projects"};
  $scope.project = {};
  $scope.model = {};
  $scope.alerts = [];
  $http.get($window.location.href).success(function(data)
  {
    $scope.model = data;
    $scope.model.path = configuration["server-root"] + "models/" + $scope.model._id;
    $http.get(configuration["server-root"] + "projects/" + $scope.model.project).success(function(data)
    {
      $scope.project = data;
      $scope.project.path = configuration["server-root"] + "projects/" + $scope.model.project;
    });
    $window.document.title = $scope.model.name + " - Slycat Model";

    if($scope.model.state == "waiting")
      $scope.alerts.push({"type":"info", "message":"The model is waiting for data to be uploaded."})

    if($scope.model.state == "running")
      $scope.alerts.push({"type":"success", "message":"The model is being computed.  Patience!"})

    if($scope.model.result == "failed")
      $scope.alerts.push({"type":"danger", "message":"Model failed to build.  Here's what was happening when things went wrong:", "detail": $scope.model.message})

    if($scope.model.state == "finished")
      $http.put($window.location.href, {state : "closed"});
  });

}]);

