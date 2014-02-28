var JSONData = [
  { "id": 3, "created_at": "Sun May 05 2013", "amount": 12000},
  { "id": 1, "created_at": "Mon May 13 2013", "amount": 2000},
  { "id": 2, "created_at": "Thu Jun 06 2013", "amount": 17000},
  { "id": 4, "created_at": "Thu May 09 2013", "amount": 15000},
  { "id": 5, "created_at": "Mon Jul 01 2013", "amount": 16000}
];

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
  gatherUpdate();

})();

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
    lastUpdateTime = data.last["time"];
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
  console.log(alert_time + " " + time + " -> " + (time - alert_time));
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