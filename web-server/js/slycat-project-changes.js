var module = angular.module("slycat-project-changes", ["slycat-configuration"]);

module.service("slycat-project-changes-service", ["$rootScope", "$window", "$http", "slycat-configuration", function($rootScope, $window, $http, configuration)
{
  var service =
  {
    current_revision : null,
    projects : [],
    update : function()
    {
      var url = configuration["server-root"] + "projects?_=" + new Date().getTime();
      if(service.current_revision != null)
        url += "&revision=" + service.current_revision;

      $http.get(url).success(function(results)
      {
        service.current_revision = results.revision;
        service.projects = results.projects;
        angular.forEach(service.projects, function(project, key)
        {
          project.path = configuration["server-root"] + "projects/" + project._id;
        });
        $rootScope.$broadcast("slycat-projects-changed");
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

module.controller("slycat-project-changes-controller", ["$scope", "$http", "slycat-configuration", "slycat-project-changes-service", function($scope, $http, configuration, project_changes)
{
  $scope.projects = project_changes.projects;

  $scope.$on("slycat-projects-changed", function()
  {
    $scope.projects = project_changes.projects;
  });
}]);

