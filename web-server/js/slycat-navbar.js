var module = angular.module("slycat-navbar", ["slycat-configuration", "slycat-model-changes"]);

module.controller("slycat-navbar-controller", ["$scope", "$http", "$modal", "$window", "slycat-configuration", "slycat-model-changes-service", function($scope, $http, $modal, $window, configuration, model_changes_service)
{
  $scope.new_models = {"list" : model_changes_service.models};

  $scope.$on("slycat-models-changed", function()
  {
    $scope.new_models.list = model_changes_service.models;
  });

  $scope.close_model = function($event, mid)
  {
    $event.preventDefault();
    $http.put(configuration["server-root"] + "models/" + mid, {state : "closed"});
  }

  $scope.create_project = function()
  {
    var create_project_dialog = $modal.open({
      templateUrl: "slycat-create-project.html",
      controller: create_project_dialog_controller,
    });

    create_project_dialog.result.then
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

  var create_project_dialog_controller = function ($scope, $window, $http, $modalInstance, $filter)
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

  $scope.edit_project = function()
  {
    var edit_project_dialog = $modal.open({
      templateUrl: "slycat-edit-project.html",
      controller: edit_project_dialog_controller,
      resolve:
      {
        "project" : function() { return {"name":$scope.project.name, "description":$scope.project.description, "acl":$scope.project.acl}; },
      },
    });

    edit_project_dialog.result.then
    (
      function(changes)
      {
        $scope.project.name = changes.name;
        $scope.project.description = changes.description;
        $scope.project.acl = changes.acl;
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
              $window.location.href = configuration["server-root"] + "projects";
            });
          }
        }
      }
    );
  }

  var edit_project_dialog_controller = function ($scope, $window, $http, $modalInstance, $filter, project)
  {
    $scope.project = project;
    $scope.new_administrator = null;
    $scope.new_writer = null;
    $scope.new_reader = null;

    $scope.add_administrator = function(username)
    {
      $http.get("/users/" + username).success(function(user)
      {
        if(!$window.confirm("Make " + user.name + " an administrator?  They will be able to read and write all project data, plus add and remove project users."))
          return;

        $scope.project.acl.administrators.push({"user":username});
      });
    }

    $scope.remove_administrator = function(username)
    {
      $scope.project.acl.administrators = $filter("filter")($scope.project.acl.administrators, {"user":"!" + username});
    }

    $scope.add_writer = function(username)
    {
      $http.get("/users/" + username).success(function(user)
      {
        if(!$window.confirm("Make " + user.name + " a writer?  They will be able to read and write all project data."))
          return;

        $scope.project.acl.writers.push({"user":username});
      });
    }

    $scope.remove_writer = function(username)
    {
      $scope.project.acl.writers = $filter("filter")($scope.project.acl.writers, {"user":"!" + username});
    }

    $scope.add_reader = function(username)
    {
      $http.get("/users/" + username).success(function(user)
      {
        if(!$window.confirm("Make " + user.name + " a reader?  They will be able to read all project data."))
          return;

        $scope.project.acl.readers.push({"user":username});
      });
    }

    $scope.remove_reader = function(username)
    {
      $scope.project.acl.readers = $filter("filter")($scope.project.acl.readers, {"user":"!" + username});
    }

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

  $scope.edit_model = function()
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

module.directive("slycatNavbar", ["slycat-configuration", function(configuration)
{
  return {
    "replace" : true,
    "restrict" : "E",
    "templateUrl" : configuration["server-root"] + "templates/slycat-navbar.html",
  };
}]);

