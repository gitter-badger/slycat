var module = angular.module("slycat-application", ["ui.bootstrap"]);

module.directive("slycatNewModelDropdown", function()
{
  return {
    "replace" : true,
    "restrict" : "E",
    "templateUrl" : "/templates/new-model-dropdown.html",
  };
});

module.controller("slycat-new-model-controller", function($scope, $http, $window)
{
  $scope.current_revision = null;
  $scope.models = [];

  $scope.close = function($event, mid)
  {
    $event.preventDefault();
    $http.put($scope.server_root + "models/" + mid, {state : "closed"});
  }

  function update()
  {
    var url = $scope.server_root + "models" + "?_=" + new Date().getTime();
    if($scope.current_revision != null)
      url += "&revision=" + $scope.current_revision;

    $http.get(url).success(function(results)
    {
      $scope.models = results.models;
      $scope.current_revision = results.revision;
      $window.setTimeout(update, 10); // Restart the request immediately.
    })
    .error(function()
    {
      $window.setTimeout(update, 5000); // Rate-limit requests when there's an error.
    });
  }

  update();
});

module.controller("slycat-model-controller", ["$scope", "$window", "$http", "$modal", function($scope, $window, $http, $modal)
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
      $window.document.title = $scope.model.name + " - Slycat Model";
      $http.put($window.location.href, {state : "closed"});
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
