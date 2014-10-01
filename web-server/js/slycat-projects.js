var module = angular.module("slycat-projects", ["slycat-configuration", "slycat-project-changes", "slycat-model-changes", "ui.bootstrap"]);

module.controller("slycat-projects-controller", ["$scope", "$window", "$http", "$modal", "$sce", "slycat-configuration", function($scope, $window, $http, $modal, $sce, configuration)
{
  $scope.projects = {"path" : configuration["server-root"] + "projects"};
  
  $scope.create_project = function()
  {
    var edit_dialog = $modal.open({
      templateUrl: "slycat-create-project.html",
      controller: edit_dialog_controller,
    });

    edit_dialog.result.then
    (
      function(project)
      {
        $http.post($window.location.href, project).error(function(data, status, headers, config)
        {
          console.log(data, status, headers, config);
        });
      }
    );
  }

  var edit_dialog_controller = function ($scope, $window, $http, $modalInstance, $filter)
  {
    $scope.project = {"name":"", "description":""};

    $scope.ok = function()
    {
      $modalInstance.close($scope.project);
    }

    $scope.cancel = function()
    {
      $modalInstance.dismiss("cancel");
    }
  };

}]);

