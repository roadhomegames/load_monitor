//Width and height
var w = 500;
var h = 300;

//Dynamic, random dataset
var dataset = [];
var numDataPoints = 50;
var xRange = Math.random() * 1000;
var yRange = Math.random() * 1000;
for (var i = 0; i < numDataPoints; i++) {
    var newNumber1 = Math.round(Math.random() * xRange);
    var newNumber2 = Math.round(Math.random() * yRange);
    dataset.push([newNumber1, newNumber2]);
}

var padding = 30;
var xScale = d3.scale.linear()
                     .domain([0, d3.max(dataset, function(d) { return d[0]; })])
                     .range([padding, w - padding]);
var yScale = d3.scale.linear()
                     .domain([0, d3.max(dataset, function(d) { return d[1]; })])
                     .range([h - padding, padding]);
var rScale = d3.scale.linear()
                     .domain([0, d3.max(dataset, function(d) { return d[1]; })])
                     .range([2, 5]);

var xAxis = d3.svg.axis()
                  .scale(xScale)
                  .orient("bottom")
                  .ticks(5);

//Define Y axis
var yAxis = d3.svg.axis()
                  .scale(yScale)
                  .orient("left")
                  .ticks(5);

//Create SVG element
var svg = d3.select(".panel")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

svg.selectAll("circle")
   .data(dataset)
   .enter()
   .append("circle")
   .attr("cx", function(d) {
        return xScale(d[0]);
   })
   .attr("cy", function(d) {
        return yScale(d[1]);
   })
   .attr("r", function(d) {
    return rScale(d[1]);
    });

svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + (h - padding) + ")")
    .call(xAxis);

//Create Y axis
svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);


// //Width and height
// var w = 500;
// var h = 100;
// var barPadding = 1;  // <-- New!
// var svg = d3.select("body")
//             .append("svg")
//             .attr("width", w)
//             .attr("height", h);
// // var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,
// //                 11, 12, 15, 20, 18, 17, 0, 18, 23, 25 ];
// var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,];

// function getHeight(d) { return d * 4; }

// svg.selectAll("rect")
//    .data(dataset)
//    .enter()
//    .append("rect")
//    .attr("x", 0)
//    .attr("y", 0)
//    .attr("width", 20)
//    .attr("height", 100)
//    .attr("x", function(d, i) {
//     return i * (w / dataset.length);
//     })
//    .attr("width", w / dataset.length - barPadding)
//    .attr("y", function(d) {
//     return h - getHeight(d);  //Height minus data value
//     })
//    .attr("height", function(d) {
//     return getHeight(d);  //Just the data value
//     })
//    .attr("fill", function(d) {
//     return "rgb(0, 0, " + (d * 10) + ")";
//     });

// svg.selectAll("text")
//    .data(dataset)
//    .enter()
//    .append("text")
//    .text(function(d) {
//         return d;
//    })
//    .attr("x", function(d, i) {
//           return i * (w / dataset.length) + (w / dataset.length - barPadding) / 2;
//    })
//    .attr("y", function(d) {
//         return Math.min(h - getHeight(d) + 14, h);
//    })
//    .attr("font-family", "sans-serif")
//    .attr("font-size", "11px")
//    .attr("fill", "white")
//    .attr("text-anchor", "middle");
//    