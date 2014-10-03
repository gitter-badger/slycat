var module = angular.module("slycat-project", ["slycat-configuration", "slycat-navbar", "ui.bootstrap", "xeditable"]);

module.run(function(editableOptions, editableThemes)
{
  editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
  editableThemes.bs3.inputClass = 'input';
  editableThemes.bs3.buttonsClass = 'btn-xs';
});

module.controller("slycat-project-controller", ["$scope", "$window", "$http", "$modal", "$sce", "slycat-configuration", function($scope, $window, $http, $modal, $sce, configuration)
{
  $scope.markings = {};
  $scope.projects = {"path" : configuration["server-root"] + "projects"};
  $scope.project = {};
  $scope.models = {};

  $http.get($window.location.href + "?_=" + new Date().getTime()).success(function(data)
  {
    $scope.project = data;
    $scope.project.path = configuration["server-root"] + "projects/" + $scope.project._id;
    $window.document.title = $scope.project.name + " - Slycat Project";
    console.log($scope);
  });

  $http.get($window.location.href + "/models").success(function(data)
  {
    $scope.models.list = data;
    angular.forEach($scope.models.list, function(model, key)
    {
      model.path = configuration["server-root"] + "models/" + model._id;
    });
    console.log($scope);
  });

  $scope.init = function(markings)
  {
    angular.forEach(markings, function(value, key)
    {
      $scope.markings[key] = {"label":value.label, "html":$sce.trustAsHtml(value.html)};
    });
  }

  $scope.save_name = function()
  {
    $http.put($window.location.href, {"name":$scope.project.name}).error(function(data, status, headers, config)
    {
      console.log(data, status, headers, config);
    });
  }

  $scope.save_description = function()
  {
    $http.put($window.location.href, {"description":$scope.project.description}).error(function(data, status, headers, config)
    {
      console.log(data, status, headers, config);
    });
  }
}]);

