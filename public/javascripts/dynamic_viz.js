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

// On page startup, grab initialization params
$.getJSON( url + "json/app_params", { test: test }, function( data ) {
  updateInterval = data["update_interval"];
  updateCount = data["updates_to_retain"];
});

var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
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
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.close); });

var lineTwo = d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.close); });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

(function() {

  gatherUpdate();

})();

// ----------------------------------------------------------------------------

// Get a Date object from a seconds-based timestamp (the kind of timestamp we receive in our JSON calls)
function getTime(timestamp)
{
  return new Date(timestamp * 1000)
}

// Why does Javascript not have a decent Date.format() function?
// Profiling in my browser, toLocaleFormat was killing my CPU, so I rolled my own.
// There must be a better way to do this.
function timeString(timestamp)
{
  return getTime(timestamp).toLocaleString();

  // var t = getTime(timestamp);
  // var d = (t.getMonth() + 1) + '/' + t.getDate() + '/' +  t.getFullYear();
  // var h = t.getHours() % 12;
  // if (h == 0) h == 12;
  // var ampm = t.getHours() > 12 ? "PM" : "AM";
  // var mins = t.getMinutes();
  // mins = (mins < 10 ? "0" + mins : mins.toString());
  // var secs = t.getSeconds();
  // secs = (secs < 10 ? "0" + secs : secs.toString());

  // var time = (h + ":" + mins + ":" + secs + " " + ampm);
  // return time + ", " + d;
}

function handleDataSince(data)
{
  for (var d in data)
  {
    // console.log(d + ": " + data[d]["avg_one"] + " " + getTime(data[d]["time"]));
  }

  if (data.length > 0)
  {
    // Grab the timestamp for the last update that was sent to us.
    lastUpdateTime = data[data.length - 1]["time"];
  }

  // var items = [];
  // $.each( data, function( key, val ) {
  //   items.push( "<li id='" + key + "'>" + val + "</li>" );
  // });

  // $( "<ul/>", {
  //   "class": "my-new-list",
  //   html: items.join( "" )
  // }).appendTo( "body" );

  // Schedule next update
  console.log("Scheduling next update")
  setTimeout(gatherUpdate, updateInterval * 1000);
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
  var timeStr = (alertStatus.inAlert() ? timeString(alert_time) : "<No alert>");

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
  $.getJSON( url + "json/data_since", 
    // Add +1 to lastupdatetime because the JSON API returns results for times >= to the time parameter,
    // and we want to avoid retrieving repeated results that we don't need
    { time: (lastUpdateTimestamp+1), test: test }, 
    handleDataSince 
  );
 
  $.getJSON( url + "json/stats", { test: test }, handleStats );
}