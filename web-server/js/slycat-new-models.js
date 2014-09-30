var module = angular.module("slycat-new-models", ["slycat-configuration"]);

module.service("slycat-new-model-service", ["$rootScope", "$window", "$http", "slycat-configuration", function($rootScope, $window, $http, configuration)
{
  var service =
  {
    current_revision : null,
    models : [],
    update : function()
    {
      var url = configuration["server-root"] + "models?_=" + new Date().getTime();
      if(service.current_revision != null)
        url += "&revision=" + service.current_revision;

      $http.get(url).success(function(results)
      {
        service.current_revision = results.revision;
        service.models = results.models;
        angular.forEach(service.models, function(model, key)
        {
          model.path = configuration["server-root"] + "models/" + model._id;
        });
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

module.controller("slycat-new-model-controller", ["$scope", "$http", "slycat-configuration", "slycat-new-model-service", function($scope, $http, configuration, new_model_service)
{
  $scope.new_models = new_model_service.models;

  $scope.$on("slycat-new-models-changed", function()
  {
    $scope.new_models = new_model_service.models;
  });

  $scope.close = function($event, mid)
  {
    $event.preventDefault();
    $http.put(configuration["server-root"] + "models/" + mid, {state : "closed"});
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

