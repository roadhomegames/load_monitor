// Grab the URL we'll be making our JSON calls to.
var url = document.URL;
var test = (url.indexOf("test") >= 0) ? "true" : "false";
url = url.substring(0, url.indexOf("monitor"));

var updateInterval = 10; // Update interval in seconds
var updateCount = 60; // Number of updates to maintain.
var lastUpdateTimestamp = 0; // Initialize last update time to say that no updates have been grabbed yet.

var alertStatus = { 
  alert: false, 
  // Current timestamp in seconds (we deal in timestamps because it's easy to translate dates with Ruby using them)
  timestamp: +(new Date()) / 1000, 
  loadVal: 0,
  inAlert: function() {
    return this.alert;
  },
  setStatus: function(alert, time, loadVal) {
    this.alert = alert;
    this.timestamp = time;
    this.loadVal = loadVal;
  },
  getAlertMsg: function() {
    return 'High load generated an alert - load = ' + this.loadVal + ', triggered at ' + timeString(this.timestamp);
  },
  getClearMsg: function(clearTime) {
    return 'High load alert dismissed at ' + timeString(clearTime) + '. Alert lasted ' + (clearTime - this.timestamp) + ' seconds.';
  }
};

var JSONData = [];
var alertGraphData = [];

// On page startup, grab initialization params
$.getJSON( url + "json/app_params", { test: test }, function( data ) {
  updateInterval = data["update_interval"];
  updateCount = data["updates_to_retain"];
});

var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 940 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var parseDate = d3.time.format("%d-%b-%y").parse;

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var lineOne = d3.svg.line()
    .x(function(d) { return x(d.time); })
    .y(function(d) { return y(d.one); });

var lineTwo = d3.svg.line()
    .x(function(d) { return x(d.time); })
    .y(function(d) { return y(d.two); });

var svg = d3.select("#graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var inputSelection = "one";
function selectInput(selection) {
  inputSelection = selection;
  updateGraph();
}
function oneSelected() {
  return inputSelection == "one";
}

function getLine()
{
  return (oneSelected() ? lineOne : lineTwo);
}

(function() {

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("average load");

  $('.btn-group').button();
  $('#select-one').on("click", function() { selectInput("one"); });
  $('#select-two').on("click", function() { selectInput("two"); });

  gatherUpdate();

})();

// ----------------------------------------------------------------------------

// Get a Date object from a seconds-based timestamp (the kind of timestamp we receive in our JSON calls)
function getTime(timestamp)
{
  return new Date(timestamp * 1000)
}

function timeString(timestamp)
{
  return getTime(timestamp).toLocaleString();
}

function handleDataSince(data)
{
  // Grab the timestamp for the last update that was sent to us so when issuing
  // the next update request, we know what time to use
  if (data.length > 0)
  {
    lastUpdateTimestamp = data[data.length - 1]["time"];
  }

  for (var i = 0; i < data.length; i++)
  {
    var d = data[i];
    JSONData.push( { one: d.one, two: d.two, time: getTime(d.time) } );
  }

  // Update our data
  while (JSONData.length > updateCount)
  {
    JSONData.shift();
  }

  // Clear out old alerts
  if (JSONData.length > 0)
  {
    while (alertGraphData.length > 0)
    {
      if (alertGraphData[0].time >= JSONData[0].time) break;
      else alertGraphData.shift(); // (we don't need an alert on the graph if it's older than the last update)
    }
  }

  updateGraph();
  
  // Schedule next update
  // console.log("Scheduling next update")
  // console.log(document.getElementsByTagName("*").length);
  setTimeout(gatherUpdate, updateInterval * 1000);
}

function updateGraph()
{
  x.domain(d3.extent(JSONData, function(d) { return d.time; }));

  var yDomain;
  if (oneSelected())
  {
    yDomain = d3.extent(JSONData, function(d) { return d.one; });
    
  }
  else
  {
    yDomain = d3.extent(JSONData, function(d) { return d.two; }); 
  }

  // Ensure the high load threshold is in view of our domain
  yDomain[0] = Math.min(0.9, yDomain[0]);
  yDomain[1] = Math.max(1.1, yDomain[1]);
  y.domain(yDomain);

  svg.selectAll("g.y.axis")
        .call(yAxis);

  svg.selectAll("g.x.axis")
        .call(xAxis);

  var lines = svg.selectAll("path.line")
      .data([ JSONData ], function(x) { return x.time; } );

  // This is kind of weird, but lines.attr("class", "update");
  // was breaking, so stuck with this for now, no time to figure it out.
  lines.transition().duration(10).attr('d', getLine());
   
  lines.enter().append("path")
      .attr("class", "line")
      .attr("d", getLine())
      .attr("stroke", "blue");

  lines
      .exit()
      .remove();

  if (JSONData.length > 0)
  {
    var first = JSONData[0];
    var last = JSONData[JSONData.length-1];
    var thresholdData = [ {one: 1.0, two: 1.0, time: first.time}, {one: 1.0, two: 1.0, time: last.time} ];
    var threshold = svg.selectAll("threshold")
      .data([ thresholdData ], function(x) { return x.time; });

    threshold.transition().duration(10).attr('d', getLine());

    threshold.enter().append("path")
        .attr("class", "line")
        .attr("d", getLine())
        .attr("stroke", "red");

    threshold.exit().remove();
  }

  var textData = "High Load = 1.0";
  var highLoad = svg.selectAll("#high_load").data([textData]);
  var textOffset = 5;

  highLoad.transition().duration(10)
      .attr("x", function(d) { return 10; })
      .attr("y", function(d) { return y(1.0) - textOffset;})

  highLoad.enter().append("text")
      .attr("class", "enter")
      .attr("id", "high_load")
      .attr("x", function(d) { return 10; })
      .attr("y", function(d) { return y(1.0) - textOffset;})
      .text(textData);

  // Plot alert positions
  var circles = svg.selectAll("circle").data(alertGraphData, function(d) { return d.time; });

  circles.transition().duration(10)
     .attr("cx", function(d) { return x(d.time); })
     .attr("cy", function(d) { return y(d.load); })

  circles.enter()
     .append("svg:circle")
     .attr("r", 0)
     .attr("cx", function(d) { return x(d.time); })
     .attr("cy", function(d) { return y(d.load); })
     .attr("fill", "transparent")
     .attr("stroke", function(d) { return d.alert ? "red" : "green"})
     .attr("stroke-width", "5px")
     .transition().duration(1000).
     attr("r", 5);

  circles.exit()
   .remove();
}

function setAlertStatus(alert, loadVal, alert_time, cur_time)
{
  if (alertStatus.inAlert())
  {
    if (!alert)
    {
      // Clear the alert
      // Find all on-going alerts and clear them
      $('#active_alert').remove();

      // Add a new message to provide historical alert information
      $('#clear_placeholder').prepend('<div class="alert alert-success">' + alertStatus.getClearMsg(cur_time) + '</div>');

      // Plot the clear time on the graph
      alertGraphData.push( { load: loadVal, time: getTime(cur_time), alert: false });

      alertStatus.setStatus(false, cur_time, loadVal);
    }
  }
  else if (alert)
  {
    alertStatus.setStatus(true, alert_time, loadVal);

    // Trigger a new alert
    $('#alert_placeholder').html('<div class="alert alert-danger" id = "active_alert"> <a class="close" data-dismiss="alert">×</a>' +
      alertStatus.getAlertMsg() + '</div>')

    // Plot the alert time on the graph
    alertGraphData.push( { load: loadVal, time: getTime(alert_time), alert: true });
  }
}

function handleStats(data)
{
  var uptime = data["uptime"];
  var users = data["users"];
  var one = data["one"];
  var two = data["two"];
  var five = data["five"];
  var fifteen = data["fifteen"];
  var time = data["time"];
  var alert = data["alert"];
  var alert_time = data["alert_time"];

  var alertC = $("#alert-col");
  var loadC = $("#load-col");
  var uptimeC = $("#uptime-col");

  // Potentially change alert status
  setAlertStatus(alert == "Alert", two, alert_time, time);
  // Keep an active alert current
  if (alertStatus.inAlert())
  {
    alertStatus.loadVal = two;
    $('#active_alert').html(alertStatus.getAlertMsg());
  }

  var alertStr = (alertStatus.inAlert() ? "red><strong>Alert</strong>" : "green>Clear");
  var timeStr = (alertStatus.inAlert() ? timeString(alert_time) : "No alert");

  alertC.html(
      "<strong>Alert</strong> <font color=" + alertStr + "</font></br>" +
      "<strong>Alert started</strong> " + timeStr + "</br>" +
      "<strong>2m Load</strong> " + two);

  loadC.html(buildColumn(["1m load", one], ["5m load", five], ["15m load", fifteen]));
  uptimeC.html(buildColumn(["Uptime", uptime], ["Users", users], ["Time", timeString(time)]));
}

function buildColumn(i1, i2, i3)
{
  var s = 
      "<strong>" + i1[0] + "</strong> " + i1[1] + "</br>" +
       "<strong>" + i2[0] + "</strong> " + i2[1] + "</br>" +
       "<strong>" + i3[0] + "</strong> " + i3[1];
   return s;
}

function gatherUpdate()
{ 
  $.getJSON( url + "json/stats", { test: test }, handleStats );

  $.getJSON( url + "json/data_since", 
    // Add +1 to lastupdatetime because the JSON API returns results for times >= to the time parameter,
    // and we want to avoid retrieving repeated results that we don't need
    { time: (lastUpdateTimestamp+1), test: test }, 
    handleDataSince 
  );
}