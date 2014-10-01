var module = angular.module("slycat-model", ["slycat-configuration", "slycat-model-changes", "ui.bootstrap"]);

module.controller("slycat-model-controller", ["$scope", "$window", "$http", "$modal", "slycat-configuration", function($scope, $window, $http, $modal, configuration)
{
  $scope.projects = {path:configuration["server-root"] + "projects"};
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

  $scope.edit = function()
  {
    var edit_model = $modal.open({
      templateUrl: "slycat-edit-model.html",
      controller: edit_model_controller,
      resolve:
      {
        "project" : function() { return {"_id":$scope.project._id}; },
        "model" : function() { return {"name":$scope.model.name, "description":$scope.model.description}; },
      },
    });

    edit_model.result.then
    (
      function(changes)
      {
        $scope.model.name = changes.name;
        $scope.model.description = changes.description;
        $http.put($window.location.href, changes).error(function(data, status, headers, config)
        {
          console.log(data, status, headers, config);
        });
      },
      function(reason)
      {
        if(reason == "delete")
        {
          if($window.confirm("Delete " + $scope.model.name + "? All data will be deleted immediately, and this cannot be undone."))
          {
            $http.delete($window.location.href).success(function()
            {
              $window.location.href = configuration["server-root"] + "projects/" + $scope.project._id;
            });
          }
        }
      }
    );
  }

  var edit_model_controller = function ($scope, $window, $http, $modalInstance, model)
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
      $modalInstance.dismiss("delete");
    }
  };

}]);

