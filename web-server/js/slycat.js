var module = angular.module("slycat-application", ["ui.bootstrap"]);

module.service("slycatNewModelService", ["$rootScope", "$window", "$http", function($rootScope, $window, $http)
{
  var service =
  {
    current_revision : null,
    models : [],
    update : function()
    {
      var url = "/models" + "?_=" + new Date().getTime();
      if(service.current_revision != null)
        url += "&revision=" + service.current_revision;

      $http.get(url).success(function(results)
      {
        service.current_revision = results.revision;
        service.models = results.models;
        $rootScope.$broadcast("slycat-new-models-changed");
        $window.setTimeout(service.update, 10); // Restart the request immediately.
      })
      .error(function()
      {
        $window.setTimeout(service.update, 5000); // Rate-limit requests when there's an error.
      });
    }
  };

  service.update();
  return service;
}]);

module.controller("slycat-new-model-controller", ["$scope", "$http", "slycatNewModelService", function($scope, $http, slycatNewModelService)
{
  $scope.new_models = slycatNewModelService.models;

  $scope.$on("slycat-new-models-changed", function()
  {
    $scope.new_models = slycatNewModelService.models;
  });

  $scope.close = function($event, mid)
  {
    $event.preventDefault();
    $http.put($scope.server_root + "models/" + mid, {state : "closed"});
  }
}]);

module.directive("slycatNewModelDropdown", function()
{
  return {
    "replace" : true,
    "restrict" : "E",
    "templateUrl" : "/templates/new-model-dropdown.html",
  };
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

module.controller("slycat-project-controller", ["$scope", "$window", "$http", "$modal", "$sce", function($scope, $window, $http, $modal, $sce)
{
  $scope.server_root = "";
  $scope.markings = {};
  $scope.project = {};
  $scope.models = [];
  $scope.myHTML = $sce.trustAsHtml('I am an <code>HTML</code>string with ' + '<a href="#">links!</a> and other <em>stuff</em>');

  $scope.init = function(server_root, markings)
  {
    $scope.server_root = server_root;
    angular.forEach(markings, function(value, key)
    {
      $scope.markings[key] = {"label":value.label, "html":$sce.trustAsHtml(value.html)};
    });

    $http.get($window.location.href).success(function(data)
    {
      $scope.project = data;
      $window.document.title = $scope.project.name + " - Slycat Project";
    });

    $http.get($window.location.href + "/models").success(function(data)
    {
      $scope.models = data;
    });
  }

  $scope.edit = function()
  {
    var edit_dialog = $modal.open({
      templateUrl: "slycat-edit-project.html",
      controller: edit_dialog_controller,
      resolve:
      {
        "project" : function() { return {"name":$scope.project.name, "description":$scope.project.description}; },
      },
    });

    edit_dialog.result.then
    (
      function(changes)
      {
        $scope.project.name = changes.name;
        $scope.project.description = changes.description;
        $http.put($window.location.href, changes).error(function(data, status, headers, config)
        {
          console.log(data, status, headers, config);
        });
      },
      function(reason)
      {
        if(reason == "delete")
        {
          if($window.confirm("Delete " + $scope.project.name + "? All data will be deleted immediately, and this cannot be undone."))
          {
            $http.delete($window.location.href).success(function()
            {
              $window.location.href = $scope.server_root + "projects";
            });
          }
        }
      }
    );
  }

  var edit_dialog_controller = function ($scope, $window, $http, $modalInstance, project)
  {
    $scope.project = project;

    $scope.ok = function()
    {
      $modalInstance.close($scope.project);
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
