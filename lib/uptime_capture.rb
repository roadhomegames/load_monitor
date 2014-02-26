# Helper class
class UptimeCapture
  attr_accessor :uptime
  attr_accessor :users
  attr_accessor :avg_one
  attr_accessor :create_time # Creation time in UTC

  def initialize(ut, use_count, a1)
    @uptime = ut
    @users = use_count
    @avg_one = a1
    @create_time = Time.now.utc
  end

  def to_s
    return "Up for #{@uptime}, #{@users} users, #{avg_one} load, #{create_time}"
  end
end
