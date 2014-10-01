var module = angular.module("slycat-project", ["slycat-configuration", "slycat-model-changes", "ui.bootstrap"]);

module.controller("slycat-project-controller", ["$scope", "$window", "$http", "$modal", "$sce", "slycat-configuration", function($scope, $window, $http, $modal, $sce, configuration)
{
  $scope.markings = {};
  $scope.projects = {path:configuration["server-root"] + "projects"};
  $scope.project = {};
  $scope.models = [];

  $http.get($window.location.href).success(function(data)
  {
    $scope.project = data;
    $scope.project.path = configuration["server-root"] + "projects/" + $scope.project._id;
    $window.document.title = $scope.project.name + " - Slycat Project";
  });

  $http.get($window.location.href + "/models").success(function(data)
  {
    $scope.models = data;
    angular.forEach($scope.models, function(model, key)
    {
      model.path = configuration["server-root"] + "models/" + model._id;
    });
  });

  $scope.init = function(markings)
  {
    angular.forEach(markings, function(value, key)
    {
      $scope.markings[key] = {"label":value.label, "html":$sce.trustAsHtml(value.html)};
    });
  }

  $scope.edit = function()
  {
    var edit_dialog = $modal.open({
      templateUrl: "slycat-edit-project.html",
      controller: edit_dialog_controller,
      resolve:
      {
        "project" : function() { return {"name":$scope.project.name, "description":$scope.project.description, "acl":$scope.project.acl}; },
      },
    });

    edit_dialog.result.then
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

  var edit_dialog_controller = function ($scope, $window, $http, $modalInstance, $filter, project)
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

}]);

