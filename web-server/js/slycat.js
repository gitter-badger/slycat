var slycat_application = angular.module("slycat-application", ["ui.bootstrap"]);

slycat_application.controller("slycat-new-model-controller", function($scope)
{
  $scope.finished = [
    {"name":"Model A"},
    {"name":"Model B"},
    {"name":"Model C"},
  ];

  $scope.working = [
    {"name":"Model D"},
    {"name":"Model E"},
  ];
});

slycat_application.controller("slycat-model-controller", ["$scope", "$window", "$http", "$modal", function($scope, $window, $http, $modal)
{
  $scope.server_root = "";
  $scope.project = {};
  $scope.model = {};

  $scope.init = function(server_root)
  {
    $scope.server_root = server_root;
    $http.get($window.location.href).success(function(data)
    {
      $scope.model = data;
      $http.get($scope.server_root + "projects/" + $scope.model.project).success(function(data)
      {
        $scope.project = data;
      });
    });
  }

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
              $window.location.href = $scope.server_root + "projects/" + $scope.project._id;
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
