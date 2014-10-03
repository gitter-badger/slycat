var module = angular.module("slycat-model-changes", ["slycat-configuration"]);

module.service("slycat-model-changes-service", ["$rootScope", "$window", "$http", "slycat-configuration", function($rootScope, $window, $http, configuration)
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
        $rootScope.$broadcast("slycat-models-changed");
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

