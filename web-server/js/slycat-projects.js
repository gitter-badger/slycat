var module = angular.module("slycat-projects", ["slycat-configuration", "slycat-project-changes", "slycat-navbar", "ui.bootstrap"]);

module.controller("slycat-projects-controller", ["$scope", "$window", "$http", "$modal", "slycat-configuration", "slycat-project-changes-service", function($scope, $window, $http, $modal, configuration, project_changes_service)
{
  $scope.projects = {"path" : configuration["server-root"] + "projects"};
  $scope.projects.list = project_changes_service.projects;
  console.log("slycat-projects $scope", $scope);

  $scope.$on("slycat-projects-changed", function()
  {
    $scope.projects.list = project_changes_service.projects;
  });
}]);

