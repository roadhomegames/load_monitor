# Helper class
class UptimeStats
  attr_accessor :uptime
  attr_accessor :users
  attr_accessor :avg_one, :avg_two, :avg_five, :avg_fifteen;
  attr_accessor :stats_time # Creation time in UTC
  attr_accessor :alert_status

  def initialize()
  end

  def setup(uptime_cap, up, users, two_min, five_min, fifteen_min, alert)
    @uptime = up
    @users = users.to_i
    @avg_one = uptime_cap.avg_one
    @avg_two = two_min
    @avg_five = five_min.to_f
    @avg_fifteen = fifteen_min.to_f

    @stats_time = uptime_cap.create_time
    @alert_status = alert
  end

  def alert_status_name
    return (@alert_status ? @alert_status.name : ALERTS::CLEAR)
  end

  def alert_status_timestamp
    return (@alert_status ? @alert_status.issue_time.to_i : Time.now.to_i)
  end

  def to_json_obj
    # Return in a format that's easy to parse on the other end. In particular, translate times into timestamps
    return { uptime: @uptime, 
      users: @users, 
      one: @avg_one, 
      two: @avg_two, 
      five: @avg_five, 
      fifteen: @avg_fifteen, 
      time: @stats_time.to_i, 
      alert: alert_status_name(),
      alert_time: alert_status_timestamp()  }
  end

   def to_s
    return "Up for #{@uptime}, #{@users} users, #{avg_one} load, captured at #{stats_time} #{alert_status.name}"
  end 
end
