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

  var module = angular.module('kibana.panels.patternquery', []);
  app.useModule(module);

  module.controller('patternquery', function($scope, querySrv, $rootScope, dashboard, $http) {
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
    $scope.smartFields = ["serial"];
    $scope.fuzzyMode = false;
    $scope.andMode = true;
    $scope.data = {
     singleSelect: null,
     multipleSelect: [],
    };
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
     * Clear all suggestions and reset to defaults
     */
    $scope.reset = function() {

      $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = _d.query;
      $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query_display = _d.query;
      $scope.clearSuggestions();
      $rootScope.$broadcast('refresh');
    };;
    
    /*
     * When user drilldowns to 'did you mean' suggestion, set it as the query, call refresh, but do not provide further suggestions
     */
    $scope.refineToDym = function() {
      if ( $scope.didyoumean !== '') {
          $scope
          Srv.list[Object.keys($scope.querySrv.list).length - 1].query_display = $scope.didyoumean;
          $scope.refresh(false);
          }
    };
    
    /*
     * When user drilldowns to suggestion provided, set it as the query, call refresh, but do not provide further suggestions
     */    
    $scope.refineToSuggestion = function() {
      if ( $scope.suggestions !== '') {
          $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query_display = $scope.suggestions;
          $scope.refresh(false);
      }
    };
    
    /*
     * By default, search for suggestions. If argument provided is false, bypass suggester
     */
    $scope.refresh = function() {
      update_history(_.pluck($scope.querySrv.list,'query_display'));
      var queryStr = (_.pluck($scope.querySrv.list,'query_display'))[0];
      queryStr = queryStr.replace("@"," ");
      var queryArray = $scope.getArrayFromStr(queryStr);
      var queryStrLen = queryArray.length;
      console.log("queryStr: " + queryStr);
      console.log("pattern: " + $scope.data.singleSelect);
//       console.log("fuzzyMode: " + $scope.fuzzyMode);
      switch($scope.data.singleSelect) {
          case "visa":
              console.log("VISA");
              $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = "serial:/([^0-9]4[0-9]{12}[0-9]{3}?[^0-9])/";
              break;
         case "greek-iban":
              console.log("IBAN");
              $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = "serial:/(GR[0-9]{2}[0-9]{3}[0-9]{4}[a-zA-Z0-9]{16})/";
              break; 
         case "master-card":
              console.log("MASTER CARD");
              $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = "serial:/([^0-9](5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}[^0-9])/";
              break;
         case "american-express":
              console.log("AMERICAN EXPRESS");
              $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = "serial:/([^0-9]3[47][0-9]{13}[^0-9])/";
              break;
         case "plate-number":
              console.log("Plate");
              $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = "serial:/([ABEZHIKKMNOPTYXΑΒΕΖΗΙΚΜΝΟΡΤΥΧ]{3}[0-9]{4}[^0-9])/";
              break;         default:
             $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = "serial:*";
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
