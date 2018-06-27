/*

  ## query

  ### Parameters
  * query ::  A string or an array of querys. String if multi is off, array if it is on
              This should be fixed, it should always be an array even if its only
              one element
*/
define([
  'angular',
  'app',
  'underscore',
  'css!./query.css'
], function (angular, app, _) {
  'use strict';

  var module = angular.module('kibana.panels.smartquery', []);
  app.useModule(module);

  module.controller('smartquery', function($scope, querySrv, $rootScope, dashboard, $http) {
    $scope.panelMeta = {
      modals: [{
        description: "Inspect",
        icon: "icon-info-sign",
        partial: "app/partials/inspector.html",
        show: true
      }],
      status  : "Experimental",
      description : "Search against multiple fields as defined to smartFields array."
    };

    // Set and populate defaults
    var _d = {
      query   : "*:*",
      pinned  : true,
      history : [],
      spyable : true,
      remember: 10, // max: 100, angular strap can't take a variable for items param
    };
    _.defaults($scope.panel,_d);

    $scope.querySrv = querySrv;
    $scope.smartFields = ["_text_", "_text_latin_", "_text_bm_" , "serial"];
    $scope.fuzzyMode = false;
    $scope.andMode= true;

    /**
     * Help function, creates an array of non empty unique values from a set of words separated by whitespace(s)
     */
    $scope.getArrayFromStr = function(inp) {
        var querySplit = inp.split(/\s/);
        var querySplitNoEmpty = querySplit.filter(function onlyUnique(value, index, self) {
            return (self.indexOf(value) === index) && (value !== "" );
        }); 

        return querySplitNoEmpty;
    };
    
    $scope.init = function() {
    };

    
    /**
     * Reset to defaults
     */
    $scope.reset = function() {

      $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = _d.query;
      $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query_display = _d.query;
      $rootScope.$broadcast('refresh');
    };;
        
    
    $scope.refresh = function() {
      update_history(_.pluck($scope.querySrv.list,'query_display'));
      var queryStr = (_.pluck($scope.querySrv.list,'query_display'))[0];
      queryStr = queryStr.replace("@"," ");
      var queryArray = $scope.getArrayFromStr(queryStr);

      var term = '';
      console.log("queryStr: " + queryStr);
      
      if (queryStr != '*:*') {
        var queryToExec = "";
        var extQueryOperator = "";
        var intQueryOperator = "";
        var subQuery;
        var fuzzyOperator = ($scope.fuzzyMode) ? "~"  : "";
        var smartOperator = ($scope.andMode) ? "AND"  : "OR";
        for(var i=0; i < queryArray.length; ++i) {
            extQueryOperator = (i==0) ? "" : " " + smartOperator + " " ;
            subQuery = "";
            for (var k=0; k < $scope.smartFields.length; ++k) {
                intQueryOperator = (k==0) ? "" : " OR " ;
                subQuery =  subQuery  + intQueryOperator +  $scope.smartFields[k] + ": " + queryArray[i] + fuzzyOperator;
            }
            queryToExec =  queryToExec  + extQueryOperator +  "(" + subQuery + ")";
        }
        $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = queryToExec;
      }
      else {
          $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = "*:*";
      }
      $rootScope.$broadcast('refresh');
    }; 
    
    $scope.render = function() {
      $rootScope.$broadcast('render');
    };

    $scope.toggle_pin = function(id) {
      querySrv.list[id].pin = querySrv.list[id].pin ? false : true;
    };

    $scope.close_edit = function() {
      $scope.refresh();
    };

    var update_history = function(query) {
      if($scope.panel.remember > 0) {
        $scope.panel.history = _.union(query.reverse(),$scope.panel.history);
        var _length = $scope.panel.history.length;
        if(_length > $scope.panel.remember) {
          $scope.panel.history = $scope.panel.history.slice(0,$scope.panel.remember);
        }
      }
    };

    $scope.init();
  });
});
