var stixxApp = angular.module('stixxApp', []);

stixxApp.factory('stixxFactory', function ($http) {


    return $http.get('data/indicator-for-malicious-URL.json');


});

stixxApp.controller('stixxController', ['$scope', '$http', 'stixxFactory', function ($scope, $http, stixxFactory) {

    var links = [];
    var nodes = [];
    var nodesData = [];
    var relationships = ["applies-to", "created-by", "indicates", "saw", "sighting-of", "attributed-to", "targets"];
    $scope.type = {};
    stixxFactory.then(function (response) {
        $scope.type = response.data;

        var length = $scope.type['objects'].length;
        // alert(objects.toString());


        for (var i = 0; i < length; i++) {

            var SDO = $scope.type['objects'][i];


            if (SDO.type === 'relationship') {
                console.log("Skipping already added object!", SDO);

            } else {
                var str = SDO.name;

                if (typeof str === 'undefined') {

                }
                else {
                    var newString = str.replace(/\s*\(.*?\)\s*/g, '').trim(); // remove parentheses and content
                    newString = newString.split("-")[0].trim(); // remove dash and content
                }

                SDO.name = newString;

                nodesData.push(SDO);
            }

        }


        var links1 = [];
        $scope.type['objects'].forEach(function (item) {
            if (item['type'] === 'relationship') {
                links1.push(item);
                return;
            }
            if ('created_by_ref' in item) {
                links1.push({
                    'source_ref': item['id'],
                    'target_ref': item['created_by_ref'],
                    'relationship_type': 'created-by'
                });
            }
            if ('object_marking_refs' in item) {
                item['object_marking_refs'].forEach(function (markingID) {
                    links1.push({
                        'source_ref': markingID,
                        'target_ref': item['id'],
                        'relationship_type': 'applies-to'
                    });
                });
            }
            if ('object_refs' in item) {
                item['object_refs'].forEach(function (objID) {
                    links1.push({
                        'source_ref': item['id'],
                        'target_ref': objID,
                        'relationship_type': 'refers-to'
                    });
                });
            }
            if ('sighting_of_ref' in item) {
                links1.push({
                    'source_ref': item['id'],
                    'target_ref': item['sighting_of_ref'],
                    'relationship_type': 'sighting-of'
                });
            }
            if ('observed_data_refs' in item) {
                item['observed_data_refs'].forEach(function (objID) {
                    links1.push({
                        'source_ref': item['id'],
                        'target_ref': objID,
                        'relationship_type': 'observed'
                    });
                });
            }
            if ('where_sighted_refs' in item) {
                item['where_sighted_refs'].forEach(function (objID) {
                    links1.push({
                        'source_ref': objID,
                        'target_ref': item['id'],
                        'relationship_type': 'saw'
                    });
                });
            }

        });
        //alert(links1.toString());


        for (var i = 0; i < links1.length; i++) {

            if (links1[i].source_ref === null || links1[i].source_ref === undefined) {
                console.error("Couldn't find source!");
            } else if (links1[i].target_ref === null || links1[i].target_ref === undefined) {
                console.error("Couldn't find target!");
            } else {


                links.push({
                    source: links1[i].source_ref,
                    target: links1[i].target_ref,
                    type: getType(links1[i])
                });  // different paths depending on relationship


            }


        }

        function getType(edge) {

            return edge.relationship_type.toString();

        }

        links.forEach(function (link) {
            link.source = nodes[link.source] || (nodes[link.source] = {id: link.source});
            link.target = nodes[link.target] || (nodes[link.target] = {id: link.target});
        });

    });


    $scope.d3Data = {
        links: '',
        nodes: '',
        nodesData: ''
    };

    $scope.d3Data.links = links;
    $scope.d3Data.nodes = nodes;
    $scope.d3Data.nodesData = nodesData;




}]);

stixxApp.directive('networkgraph', function () {

    return {

        restrict: 'E',
        scope: false,
        link: function (scope, element, attrs) {

            var relationships = ["applies-to", "created-by", "indicates", "saw", "sighting-of", "attributed-to", "targets"];

        console.log(scope);
            $(document).ready(function () {
                $('[data-toggle="popover"]').popover({
                    html: true

                });

            });

            var table = $('<table id="dataTable">').html('<thead><tr><th>Attribute</th><th>Value</th></tr></thead>').appendTo('body');

            var width = 1460,
                height = 922;


            var div = d3.select('body').append('div');
            var svg = div.append('svg:svg')
                .attr('width', width)
                .attr('height', height)
                .style('background-color', '#FFFFFF');

            window.onresize = function () {
                console.log( scope.$apply());
                return scope.$apply();
            };


            scope.$watch('d3Data', function (data) {
               // scope.$apply();
                if (!data) {
                    return;
                }
                return scope.render(data);


            }, true);


            scope.$watch(function () {
                    return angular.element(window)[0].innerWidth;
                }, function () {
                    return scope.render(scope.d3Data);
                }
            );





            scope.render = function (d3Data) {


                svg.selectAll("*").remove();

                var force = d3.layout.force()
                    .nodes(d3.values(d3Data.nodes))
                    .links(d3Data.links)
                    .size([width, height])
                    .linkDistance(350)
                    .charge(-3000)
                    .on("tick", tick)
                    .start();


                var path = svg.append("g").selectAll("path")
                    .data(force.links())
                    .enter()
                    .append("path")
                    .attr("class", function (d) {
                        return "link " + d.type;
                    })
                    .attr("marker-end", function (d) {
                        return "url(#" + d.type + ")";
                    });


                var circle = svg.append("g").selectAll("circle")
                    .data(force.nodes())
                    .enter().append("circle")
                    .attr('data-toggle', 'popover')
                    .attr('data-trigger', 'hover')
                    .attr('data-container', 'body')
                    .attr('title', "")
                    .attr('data-content', "")
                    .attr('data-placement', 'top')
                    .attr("r", 6 * 4)

                    .on("mouseover", function (d) {
                        d3.select(this).attr("r", 36);






                    }).on("mouseout", function (d) {
                        d3.select(this).attr("r", 24);

                    }).on("click", function (d) {


                    })
                    .style("fill", function (d) {

                        for (var i = 0; i < d3Data.nodesData.length; i++) {

                            if (d3Data.nodesData[i].id === d.id) {

                                switch (d3Data.nodesData[i].type) {


                                    case 'indicator':
                                        return 'blue';
                                        break;

                                    case 'identity':
                                        return '#145A32'
                                        break;

                                    case 'attack-pattern':
                                        return '#5DADE2';
                                        break;

                                    case 'threat-actor':
                                        return '#A93226';
                                        break;

                                    case 'sighting':
                                        return '#6C3483';
                                        break;

                                    case 'campaign':
                                        return '#1B4F72';
                                        break;

                                    default:
                                        break;

                                }


                            }


                        }


                    })
                    .call(force.drag);


                var text = svg.append("g").selectAll("text")
                        .data(force.nodes())
                        .enter().append("text")
                        .attr("x", 8 * 4)
                        .attr("y", -20).text("test")
                    /*  .text(function (d) {

                     for (var i = 0; i < nodesData.length; i++) {

                     if (nodesData[i].id === d.id) {


                     return nodesData[i].name;


                     }


                     }


                     }) */;


                svg.append("defs").selectAll("marker")
                    .data(relationships)
                    .enter().append("marker")
                    .attr("id", function (d) {
                        return d;
                    })
                    .attr("viewBox", "0 -5 10 10")
                    .attr("refX", 35)
                    .attr("refY", -2)
                    .attr("markerWidth", 6)
                    .attr("markerHeight", 6)
                    .attr("orient", "auto")
                    .append("path")
                    .attr("d", "M0,-5L10,0L0,5");


                function tick() {
                    path.attr("d", linkArc);
                    circle.attr("transform", transform);
                    text.attr("transform", transform);
                }


                function linkArc(d) {
                    var dx = d.target.x - d.source.x,
                        dy = d.target.y - d.source.y,
                        dr = Math.sqrt(dx * dx + dy * dy);
                    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
                }


                function transform(d) {
                    //console.log(d);
                    return "translate(" + d.x + "," + d.y + ")";
                }


             /*   function parseToTable(obj, el) {
                    $.each(obj, function (key, value) {
                        var keyType = ($.isPlainObject(value) ? '{' + key + '}' : ($.isArray(value) ? '[' + key + ']' : key));
                        var tr = $('<tr/>').html('<td>' + keyType + ' :</td>').appendTo(el);
                        if ($.isPlainObject(value) || $.isArray(value)) {
                            parseToTable(value, $('<table/>').html('<thead><tr><th>Attribute</th><th>Value</th></tr></thead>').appendTo(tr));
                        } else {
                            tr.append('<td>' + value + '</td>');
                        }
                    });
                } */


            };


        }
    }

});
