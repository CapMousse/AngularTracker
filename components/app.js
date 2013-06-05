angular.module('timetracker', [])

.directive('ngEnter', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs, ctrl){
            element.bind('keypress', function(event){
                if (!event || !event.keyCode || event.keyCode !== 13){
                    return;
                }

                scope.$apply(attrs.ngEnter);
            });
        }
    };
})

.service('localStorageService', function(){
    this.checkIfLocalStorageSupported = function(){
        return ('localStorage' in window && window['localStorage'] !== null);
    };

    this.get = function(name){
        var data = localStorage.getItem(name);
        return data === null ? null : JSON.parse(data);
    };

    this.set = function(name, value){
        value = JSON.stringify(value);
        return localStorage.setItem(name, value);
    };

    this.remove = function(name){
        return localStorage.removeItem(name);
    };
})

.filter('markdown', function(){
    var timeout = false;

    return function(text){
        var converter = new Showdown.converter();

        if (void(0) === text || '' === text) {
            return text;
        }

        if (timeout === false) {
            timeout = setTimeout(function(){
                Rainbow.color();

                timeout = false;
            }, 100);
        }

        return converter.makeHtml(text);
    };
})

.filter('i18n', function(){
    var language = window.navigator.userLanguage || window.navigator.language;
    language = language.split('-')[0];

    return function(text){
        if (window.lang[language] === void(0)) {
            return text;
        }

        if (window.lang[language][text] === void(0)) {
            return text;
        }

        return window.lang[language][text];
    };
})

.controller('ProjectsController', function($rootScope, $scope, $location, localStorageService){
    $rootScope.projects = localStorageService.get('timetracker') || [];
    $rootScope.timers = {};
    $rootScope.activeProject = null;
    $rootScope.activeTask = null;

    $scope.addProject = function(){
        var project = {
            name: '',
            status: 1,
            edit: true,
            tasks: [],
            id: $rootScope.projects.length
        };

        $rootScope.projects.push(project);
    };

    $scope.editProject = function(project) {
        project.edit = true;
    };

    $scope.saveProject = function(project) {
        project.edit = false;

        if (project.name === "") {
            if ($rootScope.activeProject === project.id) {
                $rootScope.activeProject = null;
            }

            $rootScope.projects.splice(project.id, 1);
        }

        localStorageService.set('timetracker', $rootScope.projects);
    };

    $scope.openProject = function(project) {
        $rootScope.activeTask = null;
        $rootScope.activeProject = project.id;
    };

    $scope.getTotalTime = function(project, current) {
        var totalTime = 0;
        var i, len, val;

        for(i = project.tasks.length - 1; i >= 0; i--) {
            val = current ? project.tasks[i].currentTime : project.tasks[i].maxTime;

            if (val !== false) {
                totalTime += parseInt(val, 10);
            }
        }

        return Math.floor(totalTime / 60) + 'h ' + (totalTime % 60) + 'm';
    };
})

.controller('TasksController', function($rootScope, $scope, $location, localStorageService){
    $scope.addTask = function(){
        $rootScope.projects[$rootScope.activeProject].tasks.push({
            name: '',
            description: '',
            maxTime: null,
            currentTime: false,
            edit: true,
            id: $rootScope.projects[$rootScope.activeProject].tasks.length
        });
    };

    $scope.saveTask = function(task, id) {
        task.edit = false;

        if (task.name === "") {
            if ($rootScope.activeTask === task.id) {
                $rootScope.activeTask = null;
            }

            $rootScope.projects[$rootScope.activeProject].tasks.splice(task.id, 1);
        }

        localStorageService.set('timetracker', $rootScope.projects);
    };

    $scope.editTask = function(task) {
        task.edit = true;
    };

    $scope.deleteProject = function() {
        $rootScope.projects.splice($rootScope.activeProject, 1);
        localStorageService.set('timetracker', $rootScope.projects);
        $rootScope.activeProject = null;
    };

    $scope.openTask = function(task) {
        $rootScope.activeTask = task.id;
    };

    $scope.getStatus = function(task) {
        var status = 'good', margin;

        if (task.maxTime === null || task.maxTime === '') {
            return status;
        }

        margin = task.maxTime * 10 / 100;

        if (task.currentTime >= task.maxTime - 3*margin) {
            status = "warning";
        }

        if (task.currentTime >= task.maxTime - margin) {
            status = "alert";
        }

        return status;
    };
})

.controller('DescriptionController', function($rootScope, $scope, $location, $window, localStorageService){
    $scope.task = {};
    $scope.editTitle = false;
    $scope.editContent = false;

    $rootScope.$watch('activeTask', function(newValue, oldValue){
        if (newValue !== oldValue) {
            if (newValue === null) {
                $scope.task = {};
            } else {
                $scope.task = $rootScope.projects[$rootScope.activeProject].tasks[$rootScope.activeTask];
                $scope.editContent = ($scope.task.description === '');
            }
        }
    });

    $scope.saveTask = function(){
        $scope.editTitle = false;
        $scope.editContent = false;
        localStorageService.set('timetracker', $rootScope.projects);
    };

    $scope.deleteTask = function(){
        $rootScope.projects[$rootScope.activeProject].tasks.splice($scope.task.id, 1);
        localStorageService.set('timetracker', $rootScope.projects);
        $rootScope.activeTask = null;
    }

    $scope.startTimer = function(){
        var project = parseInt($rootScope.activeProject, 10);
        var task = parseInt($rootScope.activeTask, 10);

        $rootScope.timers[$rootScope.activeTask] = setInterval(function(){
            $rootScope.projects[project].tasks[task].currentTime++;
            localStorageService.set('timetracker', $rootScope.projects);

            console.log('update ' +  project + ', ' + task);

            $rootScope.$apply();
        }, 60000);
    };

    $scope.endTimer = function(){
        clearInterval($rootScope.timers[$rootScope.activeTask]);
        delete $rootScope.timers[$rootScope.activeTask];
    };
});