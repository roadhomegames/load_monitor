# Helper class
class UptimeStats
  attr_accessor :uptime
  attr_accessor :users
  attr_accessor :avg_one, :avg_two, :avg_five, :avg_fifteen;
  attr_accessor :stats_time # Creation time in UTC
  attr_accessor :alert_status

  def initialize()
  end

  def setup(uptime_cap, two_min, five_min, fifteen_min, alert)
    @uptime = uptime_cap.uptime
    @users = uptime_cap.users
    @avg_one = uptime_cap.avg_one
    @avg_two = two_min
    @avg_five = avg_five
    @avg_fifteen = avg_fifteen

    @stats_time = uptime_cap.create_time
    @alert_status = alert
  end
end
