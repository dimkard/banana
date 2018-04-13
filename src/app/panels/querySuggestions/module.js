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

  var module = angular.module('kibana.panels.querySuggestions', []);
  app.useModule(module);

  module.controller('querySuggestions', function($scope, querySrv, $rootScope, dashboard, $http) {
    $scope.panelMeta = {
      modals: [{
        description: "Inspect",
        icon: "icon-info-sign",
        partial: "app/partials/inspector.html",
        show: true
      }],
      status  : "Experimental",
      description : "Provides a single search bar for free-form queries, providing suggestions in case of spell check errors or poor result sets. Assumes the existence of a solr dictionary with name 'default'"
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

    $scope.clearSuggestions = function() {
      $scope.didyoumean = '';
      $scope.suggestions = '';
      $scope.didyoumeanLabel = '';
      $scope.suggestionsLabel = '';
      $scope.didyoumeanMark = '';
    };
    
    /**
     * Clear all suggestions and reset to defaults
     */
    $scope.reset = function() {

      $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = _d.query;
      $scope.clearSuggestions();
      $rootScope.$broadcast('refresh');
    };;
    
    /*
     * When user drilldowns to 'did you mean' suggestion, set it as the query, call refresh, but do not provide further suggestions
     */
    $scope.refineToDym = function() {
      if ( $scope.didyoumean !== '') {
          $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = $scope.didyoumean;
          $scope.refresh(false);
          }
    };
    
    /*
     * When user drilldowns to suggestion provided, set it as the query, call refresh, but do not provide further suggestions
     */    
    $scope.refineToSuggestion = function() {
      if ( $scope.suggestions !== '') {
          $scope.querySrv.list[Object.keys($scope.querySrv.list).length - 1].query = $scope.suggestions;
          $scope.refresh(false);
      }
    };
    
    /*
     * By default, search for suggestions. If argument provided is false, bypass suggester
     */
    $scope.refresh = function(suggest = true) {
      const MAX_SUGGESTIONS = 3; //Max suggestions to hanlde     
      const DID_YOU_MEAN_THRESHOLD = 1/100;
      $scope.clearSuggestions();
      update_history(_.pluck($scope.querySrv.list,'query'));
      var queryStr = (_.pluck($scope.querySrv.list,'query'))[0];
      var queryArray = $scope.getArrayFromStr(queryStr);
      var queryStrLen = queryArray.length;
      var coreUrl = dashboard.current.solr.server + dashboard.current.solr.core_name + '/spell?spellcheck.onlyMorePopular=true&spellcheck.maxResultsForSuggest=3&spellcheck.dictionary=default&spellcheck=true&spellcheck.collate=false&spellcheck.q=' ;
      var searchUrl;
      var dymObj = {};
      var dymStr = "";
      var suggestionsObj = {};
      var suggestionsStr = "";
      var term = '';
      if(suggest) {
        for (var i=0; i < queryStrLen; i++) { //Loop into query terms
                term = queryArray[i];
                searchUrl = coreUrl + term + '&wt=json';
                $http({ //For each term look for suggestions
                    method: 'GET',
                    url: searchUrl,
                    params: {searchword: term}
                    }).then(
                        function successCallback(response) {
                            var sugg = "";
                            var first_sugg_hits = 0;
                            var curr_srch_hits = 0;
                            var maxSuggestionsToHandle = 0;
                            var querObj = _.pluck($scope.querySrv.list,'query');
                            if( response.data.spellcheck.suggestions.length > 0 && response.data.spellcheck.suggestions[1].suggestion.length > 0 ) {    // Suggestions found
                                maxSuggestionsToHandle = Math.min(response.data.spellcheck.suggestions[1].suggestion.length, MAX_SUGGESTIONS); 
                                for (var j=0; j < maxSuggestionsToHandle; j++) { 
                                    sugg = (sugg == "") ? response.data.spellcheck.suggestions[1].suggestion[j].word : sugg + ' ' + response.data.spellcheck.suggestions[1].suggestion[j].word;
                                }
                                first_sugg_hits = response.data.spellcheck.suggestions[1].suggestion[0].freq;
                                curr_srch_hits =  response.data.spellcheck.suggestions[1].origFreq;
                                
                                if (first_sugg_hits > 0  && curr_srch_hits/first_sugg_hits < DID_YOU_MEAN_THRESHOLD )  {
                                    // Did you mean found
                                    dymObj[response.config.params.searchword] = response.data.spellcheck.suggestions[1].suggestion[0].word ;
                                }
                                else {
                                    // Did you mean not found
                                    dymObj[response.config.params.searchword] = response.config.params.searchword;
                                }
                                    
                                suggestionsObj[response.config.params.searchword] = sugg;
                            }
                            else {
                                //Suggestions not found
                                suggestionsObj[response.config.params.searchword] = response.config.params.searchword;
                                dymObj[response.config.params.searchword] = response.config.params.searchword;
                            }
                            
                            // check if last callback has responded (objects have been fully populated)
                            if ( Object.keys(dymObj).length == queryStrLen) {
                                queryStr = queryArray.join(" "); 
                                for (var k =0; k< queryStrLen; ++k) {
                                    dymStr = (dymStr == "") ? dymObj[queryArray[k]] : dymStr + " " + dymObj[queryArray[k]];
                                }

                                if( dymStr != queryStr ) {
                                    $scope.didyoumeanLabel = "Did you mean: ";
                                    $scope.didyoumean = dymStr;
                                    $scope.didyoumeanMark = " ?";
                                }
                            }
                            
                            if ( Object.keys(suggestionsObj).length == queryStrLen ) {
                                queryStr = queryArray.join(" "); 
                                for (var k =0; k< queryStrLen; ++k) {
                                    suggestionsStr  = (suggestionsStr == "") ? suggestionsObj[queryArray[k]] :  suggestionsStr + " " + suggestionsObj[queryArray[k]];
                                }            
                                
                                var suggestionsArray = $scope.getArrayFromStr(suggestionsStr); //eliminate duplicates
                                suggestionsStr = suggestionsArray.join(" ");
                                
                                if( suggestionsStr != queryStr ) {
                                    $scope.suggestionsLabel = "Similar searches: ";
                                    $scope.suggestions = suggestionsStr;
                                }
                            }                            
                        }, 
                        function errorCallback(response) {
                            $scope.clearSuggestions();
                        }
                    );                    
        }
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
