var module = angular.module("slycat-projects", ["slycat-configuration", "slycat-new-models", "ui.bootstrap"]);

module.controller("slycat-projects-controller", ["$scope", "$window", "$http", "$modal", "$sce", "slycat-configuration", function($scope, $window, $http, $modal, $sce, configuration)
{
  $scope.projects = [];
  $scope.projects_path = configuration["server-root"] + "projects";
  $http.get($window.location.href).success(function(data)
  {
    $scope.projects = data;
    angular.forEach($scope.projects, function(project, key)
    {
      project.path = configuration["server-root"] + "projects/" + project._id;
    });
  });

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
        $http.post($window.location.href, project).success(function()
        {
          $http.get($window.location.href).success(function(data)
          {
            $scope.projects = data;
          });
        })
        .error(function(data, status, headers, config)
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

