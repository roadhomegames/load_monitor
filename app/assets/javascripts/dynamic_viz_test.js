var JSONData = [
  { "id": 3, "created_at": "Sun May 05 2013", "amount": 12000},
  { "id": 1, "created_at": "Mon May 13 2013", "amount": 2000},
  { "id": 2, "created_at": "Thu Jun 06 2013", "amount": 17000},
  { "id": 4, "created_at": "Thu May 09 2013", "amount": 15000},
  { "id": 5, "created_at": "Mon Jul 01 2013", "amount": 16000}
];

(function() {
  var data = JSONData.slice()
  var format = d3.time.format("%a %b %d %Y")
  var amountFn = function(d) { return d.amount }
  var dateFn = function(d) { return format.parse(d.created_at) }

  var x = d3.time.scale()
    .range([10, 280])
    .domain(d3.extent(data, dateFn))

  var y = d3.scale.linear()
    .range([180, 10])
    .domain(d3.extent(data, amountFn))
  
  var svg = d3.select(".panel").append("svg:svg")
  .attr("width", 300)
  .attr("height", 200)

  var refreshGraph = function() {
    x.domain(d3.extent(data, dateFn))
    y.domain(d3.extent(data, amountFn))

    var circles = svg.selectAll("circle").data(data, dateFn)
    
    circles.transition()
     .attr("cx", function(d) { return x(dateFn(d)) })
     .attr("cy", function(d) { return y(amountFn(d)) })

    // circles
    //  .attr("cx", function(d) { return x(dateFn(d)) })
    //  .attr("cy", function(d) { return y(amountFn(d)) })


     circles.enter()
      .append("svg:circle")
      .attr("r", 4)
      .attr("cx", function(d) { return x(dateFn(d)) })
      .attr("cy", function(d) { return y(amountFn(d)) })

      circles
        .exit()
        .remove();
  }

  d3.selectAll(".add-data")
   .on("click", function() {
     var start = d3.min(data, dateFn)
     var end = d3.max(data, dateFn)
     var time = start.getTime() + Math.random() * (end.getTime() - start.getTime())
     var date = new Date(time)

     obj = {
       'id': Math.floor(Math.random() * 70),
       'amount': Math.floor(1000 + Math.random() * 30001),
       'created_at': date.toDateString()
     }
     data.push(obj)
     refreshGraph()
  })

  d3.selectAll(".remove-data")
   .on("click", function() {
    var toRemove = Math.floor(Math.random() * (data.length - 1))
    data.splice(toRemove, 1)
    refreshGraph()
  })

  refreshGraph()

  var url = document.URL;
  url = url.substring(0, url.indexOf("monitor"));

  $.getJSON( url + "json/app_params", function( data ) {
    var items = [];
    $.each( data, function( key, val ) {
      items.push( "<li id='" + key + "'>" + val + "</li>" );
    });
   
    $( "<ul/>", {
      "class": "my-new-list",
      html: items.join( "" )
    }).appendTo( "body" );
  });

})();
